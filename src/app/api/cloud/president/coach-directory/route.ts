import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { buildCoachDirectoryRow } from "@/lib/president-coach-directory";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  const session = await getCloudUserFromSessionCookies();
  if (!session?.user.id || session.user.coachingRole !== "club-president") {
    return NextResponse.json({ ok: false, error: "Apenas contas com função Presidente." }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        coachingRole: true,
        subscriptionPlan: true,
        clubPresidentUserId: true,
        createdAt: true,
        lastSeenAt: true,
        loginCount: true,
        workspace: { select: { payload: true } },
      },
    });

    const coaches = users.map((u) =>
      buildCoachDirectoryRow({
        userId: u.id,
        email: u.email,
        name: u.name,
        coachingRole: u.coachingRole,
        subscriptionPlan: u.subscriptionPlan,
        clubPresidentUserId: u.clubPresidentUserId,
        createdAt: u.createdAt,
        lastSeenAt: u.lastSeenAt,
        loginCount: u.loginCount,
        workspacePayload: u.workspace?.payload ?? null,
      })
    );

    return NextResponse.json({ ok: true, coaches, total: coaches.length });
  } catch (e) {
    console.error("[president/coach-directory GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar treinadores." }, { status: 500 });
  }
}
