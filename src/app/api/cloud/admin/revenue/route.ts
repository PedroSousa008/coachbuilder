import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { coachProDefaultPriceEur, presidentProDefaultPriceEur } from "@/lib/subscription-env";

export const dynamic = "force-dynamic";

type SubscriberStatus = "ativo" | "gratuito" | "em_atraso" | "sem_pagamento";

function hasStripeSubscriptionId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.trim().length > 0;
}

function customIsCompedZero(v: Prisma.Decimal | null): boolean {
  if (v == null) return false;
  const n = v.toNumber();
  return Number.isFinite(n) && Math.abs(n) < 1e-9;
}

function subscriberStatus(
  plan: string,
  renews: Date | null,
  graceEnds: Date | null,
  proTrialEndsAt: Date | null,
  now: Date,
  stripeSubscriptionId: string | null,
  customMonthlyPriceEur: Prisma.Decimal | null
): SubscriberStatus {
  if (plan === "free") return "gratuito";
  if (plan === "grace" && graceEnds && graceEnds > now) return "em_atraso";
  if (plan === "pro_trial") {
    if (proTrialEndsAt && proTrialEndsAt > now) return "ativo";
    return "sem_pagamento";
  }
  if (plan === "pro_monthly" || plan === "president_pro_monthly") {
    const hasStripe = hasStripeSubscriptionId(stripeSubscriptionId);
    const comped = customIsCompedZero(customMonthlyPriceEur);
    if (hasStripe || comped) {
      if (!renews) return "ativo";
      return renews >= now ? "ativo" : "em_atraso";
    }
    return "sem_pagamento";
  }
  return "gratuito";
}

const stripeBackedMonthlyWhere = {
  AND: [{ stripeSubscriptionId: { not: null } }, { NOT: { stripeSubscriptionId: "" } }],
} as const;

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const nowMs = Date.now();
    const nowDate = new Date(nowMs);

    const coachPriceEur = coachProDefaultPriceEur();
    const presidentPriceEur = presidentProDefaultPriceEur();

    const coachesWithActivePro = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: { in: ["pro_monthly", "president_pro_monthly"] },
        ...stripeBackedMonthlyWhere,
        OR: [{ subscriptionRenewsAt: null }, { subscriptionRenewsAt: { gte: nowDate } }],
      },
    });
    const activeCoachPro = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: "pro_monthly",
        ...stripeBackedMonthlyWhere,
        OR: [{ subscriptionRenewsAt: null }, { subscriptionRenewsAt: { gte: nowDate } }],
      },
    });
    const activePresidentPro = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: "president_pro_monthly",
        ...stripeBackedMonthlyWhere,
        OR: [{ subscriptionRenewsAt: null }, { subscriptionRenewsAt: { gte: nowDate } }],
      },
    });

    const freePlanUsers = await prisma.user.count({
      where: { subscriptionPlan: "free", role: { not: "admin" } },
    });

    const unpaidMonthlyUsers = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: { in: ["pro_monthly", "president_pro_monthly"] },
        AND: [
          { OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: "" }] },
          {
            OR: [
              { customMonthlyPriceEur: null },
              { NOT: { customMonthlyPriceEur: new Prisma.Decimal(0) } },
            ],
          },
        ],
      },
    });

    const mrrEur = Math.round((activeCoachPro * coachPriceEur + activePresidentPro * presidentPriceEur) * 100) / 100;

    const conversionDenom = coachesWithActivePro + freePlanUsers + unpaidMonthlyUsers;
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
        proTrialEndsAt: true,
        createdAt: true,
        coachingRole: true,
        stripeSubscriptionId: true,
        customMonthlyPriceEur: true,
      },
    });

    const subscribers = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      coachingRole: u.coachingRole ?? "",
      subscriptionPlan: u.subscriptionPlan,
      subscriptionRenewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      status: subscriberStatus(
        u.subscriptionPlan,
        u.subscriptionRenewsAt,
        u.paymentGraceEndsAt,
        u.proTrialEndsAt,
        nowDate,
        u.stripeSubscriptionId,
        u.customMonthlyPriceEur
      ),
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
        proPriceEur: coachPriceEur,
        revenueTodayEur: null as number | null,
        revenueWeekEur: null as number | null,
        revenueMonthEur: null as number | null,
        activeSubscriptionsCount: coachesWithActivePro,
        freeToPaidConversionPct,
        freeToPaidConversionNote:
          "% com Stripe activo entre (Stripe + plano Grátis Admin + mensal sem pagamento). Histórico de upgrades não está na BD.",
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
