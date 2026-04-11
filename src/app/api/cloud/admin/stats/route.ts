import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const now = Date.now();
    const fiveMin = new Date(now - 5 * 60 * 1000);
    const oneHour = new Date(now - 60 * 60 * 1000);
    const oneDay = new Date(now - 24 * 60 * 60 * 1000);

    const onlineApprox = await prisma.user.count({
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

    const totalRegisteredUsers = await prisma.user.count();
    const totalNonAdminUsers = await prisma.user.count({ where: { role: { not: "admin" } } });
    const adminUsers = await prisma.user.count({ where: { role: "admin" } });

    const proMonthlyUsers = await prisma.user.count({
      where: { subscriptionPlan: "pro_monthly", role: { not: "admin" } },
    });
    const freePlanUsers = await prisma.user.count({
      where: { subscriptionPlan: "free", role: { not: "admin" } },
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

    return NextResponse.json({
      ok: true,
      stats: {
        onlineApprox,
        distinctActiveLastHour: activeLastHourRows.filter((r) => r.userId).length,
        distinctActiveLast24h: activeLastDayRows.filter((r) => r.userId).length,
        totalRegisteredUsers,
        totalNonAdminUsers,
        adminUsers,
        proMonthlyUsers,
        freePlanUsers,
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
