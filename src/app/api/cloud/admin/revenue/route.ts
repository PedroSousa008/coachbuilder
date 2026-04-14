import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { coachProDefaultPriceEur } from "@/lib/subscription-env";

export const dynamic = "force-dynamic";

type SubscriberStatus = "ativo" | "gratuito" | "em_atraso";

function subscriberStatus(
  plan: string,
  renews: Date | null,
  graceEnds: Date | null,
  now: Date
): SubscriberStatus {
  if (plan === "free") return "gratuito";
  if (plan === "grace" && graceEnds && graceEnds > now) return "em_atraso";
  if (plan === "pro_trial") return "ativo";
  if (plan !== "pro_monthly") return "gratuito";
  if (!renews) return "ativo";
  return renews >= now ? "ativo" : "em_atraso";
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const nowMs = Date.now();
    const nowDate = new Date(nowMs);

    const proPriceEur = coachProDefaultPriceEur();

    const coachesWithActivePro = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: "pro_monthly",
        OR: [{ subscriptionRenewsAt: null }, { subscriptionRenewsAt: { gte: nowDate } }],
      },
    });

    const freePlanUsers = await prisma.user.count({
      where: { subscriptionPlan: "free", role: { not: "admin" } },
    });

    const mrrEur = Math.round(coachesWithActivePro * proPriceEur * 100) / 100;

    const conversionDenom = coachesWithActivePro + freePlanUsers;
    const freeToPaidConversionPct =
      conversionDenom === 0 ? 0 : Math.round((coachesWithActivePro / conversionDenom) * 10000) / 100;

    const weekA = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const weekB = new Date(nowMs - 14 * 24 * 60 * 60 * 1000);
    const newCoachesLast7d = await prisma.user.count({
      where: { role: { not: "admin" }, createdAt: { gte: weekA } },
    });
    const newCoachesPrev7d = await prisma.user.count({
      where: { role: { not: "admin" }, createdAt: { gte: weekB, lt: weekA } },
    });
    const newCoachesGrowthVsPrevWeekPct =
      newCoachesPrev7d === 0
        ? newCoachesLast7d > 0
          ? 100
          : 0
        : Math.round(((newCoachesLast7d - newCoachesPrev7d) / newCoachesPrev7d) * 10000) / 100;

    const rows = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      orderBy: [{ subscriptionPlan: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionPlan: true,
        subscriptionRenewsAt: true,
        paymentGraceEndsAt: true,
        createdAt: true,
      },
    });

    const subscribers = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      subscriptionPlan: u.subscriptionPlan,
      subscriptionRenewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      status: subscriberStatus(u.subscriptionPlan, u.subscriptionRenewsAt, u.paymentGraceEndsAt, nowDate),
      totalLifetimePaidEur: null as number | null,
    }));

    const generatedAt = nowDate.toISOString();

    return NextResponse.json({
      ok: true,
      generatedAt,
      /** Sem Stripe / tabela de pagamentos — valores de caixa são placeholders. */
      cashRevenueTracked: false,
      paymentsIntegrated: false,
      overview: {
        mrrEur,
        proPriceEur,
        revenueTodayEur: null as number | null,
        revenueWeekEur: null as number | null,
        revenueMonthEur: null as number | null,
        activeSubscriptionsCount: coachesWithActivePro,
        freeToPaidConversionPct,
        freeToPaidConversionNote:
          "% de coaches com Pro ativo entre (Pro ativo + plano grátis). Histórico de upgrades não está na BD.",
        newCoachesLast7d,
        newCoachesPrev7d,
        newCoachesGrowthVsPrevWeekPct,
        mrrGrowthVsPreviousTracked: false,
        mrrGrowthVsPreviousPct: null as number | null,
      },
      payments: {
        receivedTodayEur: 0,
        pendingCount: 0,
        failedCount: 0,
        atRiskEur: 0,
      },
      subscribers,
    });
  } catch (e) {
    console.error("[admin/revenue]", e);
    return NextResponse.json({ ok: false, error: "Erro ao carregar Revenue Center." }, { status: 500 });
  }
}
