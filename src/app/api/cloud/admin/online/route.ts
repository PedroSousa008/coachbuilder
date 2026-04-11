import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { parseWorkspacePayload } from "@/lib/workspace-snapshot";

export const dynamic = "force-dynamic";

/** Alinhado com stats `usersOnlineNow` (última atividade ≤ 2 min). */
const ONLINE_MS = 2 * 60 * 1000;

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const since = new Date(Date.now() - ONLINE_MS);
    const rows = await prisma.user.findMany({
      where: { lastSeenAt: { gte: since } },
      orderBy: { lastSeenAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        coachingRole: true,
        role: true,
        subscriptionPlan: true,
        lastSeenAt: true,
        lastRoute: true,
        workspace: { select: { payload: true } },
      },
    });

    const users = rows.map((row) => {
      const snap = parseWorkspacePayload(row.workspace?.payload ?? undefined);
      const profileName = snap?.coachProfile?.name?.trim() || null;
      const displayName = profileName || row.name;
      const club = snap?.coachProfile?.club?.trim() || null;
      const competition = snap?.league?.competitionName?.trim() || null;
      const clubTeamLabel = [club, competition].filter(Boolean).join(" · ") || null;

      return {
        id: row.id,
        email: row.email,
        name: displayName,
        coachingRole: row.coachingRole,
        role: row.role,
        subscriptionPlan: row.subscriptionPlan,
        lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
        lastRoute: row.lastRoute,
        clubTeamLabel,
      };
    });

    return NextResponse.json({
      ok: true,
      onlineWindowSeconds: Math.round(ONLINE_MS / 1000),
      generatedAt: new Date().toISOString(),
      count: users.length,
      users,
    });
  } catch (e) {
    console.error("[admin/online]", e);
    return NextResponse.json({ ok: false, error: "Erro ao listar utilizadores online." }, { status: 500 });
  }
}
