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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        nametag: true,
        coachingRole: true,
        clubPresidentUserId: true,
        trainerSeatActive: true,
        role: true,
        subscriptionPlan: true,
        subscriptionRenewsAt: true,
        proTrialEndsAt: true,
        paymentGraceEndsAt: true,
        lastPaymentFailedAt: true,
        customMonthlyPriceEur: true,
        lastSeenAt: true,
        loginCount: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    console.error("[admin/users]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar utilizadores." }, { status: 500 });
  }
}
