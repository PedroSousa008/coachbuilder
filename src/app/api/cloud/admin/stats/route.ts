import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { coachProDefaultPriceEur, presidentProDefaultPriceEur } from "@/lib/subscription-env";

export const dynamic = "force-dynamic";

const stripeBackedMonthlyWhere: Prisma.UserWhereInput = {
  AND: [{ stripeSubscriptionId: { not: null } }, { NOT: { stripeSubscriptionId: "" } }],
};

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const now = Date.now();
    const twoMin = new Date(now - 2 * 60 * 1000);
    const fiveMin = new Date(now - 5 * 60 * 1000);
    const oneHour = new Date(now - 60 * 60 * 1000);
    const oneDay = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDays = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const nowDate = new Date(now);

    const startOfTodayUtc = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()));

    /** Online “agora”: última atividade ≤ 2 min (heartbeat ~90s). */
    const usersOnlineNow = await prisma.user.count({
      where: { lastSeenAt: { gte: twoMin } },
    });

    const onlineApprox5Min = await prisma.user.count({
      where: { lastSeenAt: { gte: fiveMin } },
    });

    const activeLastHourRows = await prisma.appEvent.findMany({
      where: { createdAt: { gte: oneHour }, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    });
    const activeLastDayRows = await prisma.appEvent.findMany({
      where: { createdAt: { gte: oneDay }, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    });
    const activeLast7dRows = await prisma.appEvent.findMany({
      where: { createdAt: { gte: sevenDays }, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    });

    const distinctActiveLastHour = activeLastHourRows.filter((r) => r.userId).length;
    const distinctActiveLast24h = activeLastDayRows.filter((r) => r.userId).length;
    const distinctActiveLast7d = activeLast7dRows.filter((r) => r.userId).length;

    const totalRegisteredUsers = await prisma.user.count();
    const totalNonAdminUsers = await prisma.user.count({ where: { role: { not: "admin" } } });
    const adminUsers = await prisma.user.count({ where: { role: "admin" } });

    const proMonthlyUsersAll = await prisma.user.count({
      where: { subscriptionPlan: "pro_monthly", role: { not: "admin" } },
    });
    const presidentProUsersAll = await prisma.user.count({
      where: { subscriptionPlan: "president_pro_monthly", role: { not: "admin" } },
    });

    const activeTrialsCount = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: "pro_trial",
        proTrialEndsAt: { gt: nowDate },
      },
    });

    const gracePeriodUsers = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: "grace",
        paymentGraceEndsAt: { gt: nowDate },
      },
    });

    /** Pro com cobrança Stripe (renovação válida ou sem data — MVP). */
    const coachesWithActivePro = await prisma.user.count({
      where: {
        role: { not: "admin" },
        subscriptionPlan: { in: ["pro_monthly", "president_pro_monthly"] },
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

    /** Novos registos hoje (UTC), pela data de criação do utilizador. */
    const signupsToday = await prisma.user.count({
      where: { createdAt: { gte: startOfTodayUtc } },
    });

    const totalLoginEvents = await prisma.appEvent.count({ where: { type: "login" } });
    const loginsLast24h = await prisma.appEvent.count({
      where: { type: "login", createdAt: { gte: oneDay } },
    });
    const loginsLastHour = await prisma.appEvent.count({
      where: { type: "login", createdAt: { gte: oneHour } },
    });

    const signupsTotal = await prisma.appEvent.count({
      where: { type: { in: ["signup", "cloud_migrate"] } },
    });

    const coachProPriceEur = coachProDefaultPriceEur();
    const presidentProPriceEur = presidentProDefaultPriceEur();
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
    const estimatedMonthlyRevenueEur = Math.round((activeCoachPro * coachProPriceEur + activePresidentPro * presidentProPriceEur) * 100) / 100;

    const generatedAt = nowDate.toISOString();

    return NextResponse.json({
      ok: true,
      stats: {
        generatedAt,
        usersOnlineNow,
        onlineApprox5Min,
        distinctActiveLastHour,
        distinctActiveLast24h,
        distinctActiveLast7d,
        signupsToday,
        totalRegisteredUsers,
        totalCoachesRegistered: totalNonAdminUsers,
        adminUsers,
        coachesWithActivePro,
        proMonthlyUsersAll: proMonthlyUsersAll + presidentProUsersAll,
        freePlanUsers,
        unpaidMonthlyUsers,
        estimatedMonthlyRevenueEur,
        proPriceEur: coachProPriceEur,
        /** Sem modelo de cancelamento na BD até integrares billing. */
        cancellationsRecentCount: 0,
        cancellationsTracked: false,
        activeTrialsCount,
        trialsSupported: true,
        gracePeriodUsers,
        totalLoginEvents,
        loginsLast24h,
        loginsLastHour,
        signupsTotal,
      },
    });
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json({ ok: false, error: "Erro ao calcular estatísticas." }, { status: 500 });
  }
}
