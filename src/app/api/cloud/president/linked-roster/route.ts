import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { getCloudUserFromSessionCookies } from "@/lib/cloud-session-user";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { mapWorkspaceToPresidentCoach, mapWorkspaceToPresidentPlayers } from "@/lib/president-linked-roster";
import type { PresidentCoach, PresidentPlayer } from "@/types/president-club";

export const dynamic = "force-dynamic";

async function requirePresidentUserId(): Promise<string | null> {
  const session = await getCloudUserFromSessionCookies();
  if (!session || session.user.coachingRole !== "club-president") return null;
  return session.user.id;
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const presidentId = await requirePresidentUserId();
    if (!presidentId) {
      return NextResponse.json({ ok: false, error: "Apenas contas com função Presidente." }, { status: 403 });
    }

    const me = await prisma.user.findUnique({
      where: { id: presidentId },
      select: { id: true, email: true },
    });
    if (!me) {
      return NextResponse.json({ ok: false, error: "Utilizador não encontrado." }, { status: 401 });
    }

    const linked = await prisma.user.findMany({
      where: { clubPresidentUserId: presidentId, trainerSeatActive: true },
      select: { id: true, email: true },
      take: 50,
    });

    const coaches: PresidentCoach[] = [];
    const players: PresidentPlayer[] = [];

    for (const c of linked) {
      const row = await prisma.workspace.findUnique({ where: { userId: c.id } });
      const snap = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
      coaches.push(mapWorkspaceToPresidentCoach(c.id, c.email, snap));
      players.push(...mapWorkspaceToPresidentPlayers(c.id, c.email, snap));
    }

    const selfRow = await prisma.workspace.findUnique({ where: { userId: presidentId } });
    const selfSnap = parseWorkspacePayload(selfRow?.payload) ?? emptyWorkspaceSnapshot();
    const selfHasTeam =
      (selfSnap.players?.length ?? 0) > 0 || (selfSnap.coachProfile?.name ?? "").trim().length > 0;
    if (selfHasTeam && !linked.some((l) => l.id === presidentId)) {
      coaches.push(mapWorkspaceToPresidentCoach(me.id, me.email, selfSnap));
      players.push(...mapWorkspaceToPresidentPlayers(me.id, me.email, selfSnap));
    }

    return NextResponse.json({
      ok: true,
      coaches,
      players,
      linkedCoachAccounts: linked.length,
    });
  } catch (e) {
    console.error("[president/linked-roster GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao agregar dados." }, { status: 500 });
  }
}
