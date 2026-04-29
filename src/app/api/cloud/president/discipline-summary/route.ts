import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { requirePresidentPremiumAccess } from "@/lib/require-president-premium-server";

export const dynamic = "force-dynamic";

type DisciplineRow = {
  subjectType: "jogador" | "staff";
  sourceKey: string;
  subjectName: string;
  team: string;
  yellowCards: number;
  redCards: number;
  minutes: number;
  gamesSuspended: number;
  sequenceLast5: string;
};

const TOKEN_NONE = "-";
const TOKEN_YELLOW = "A";
const TOKEN_RED = "R";

function suspendedGamesFromYellowCards(yellowCards: number): number {
  if (yellowCards < 5) return 0;
  return 1 + Math.floor((yellowCards - 5) / 3);
}

function buildPlayerRowsFromSnapshot(
  coachUserId: string,
  snapshot: ReturnType<typeof emptyWorkspaceSnapshot>
): DisciplineRow[] {
  const team = (snapshot.coachProfile.club ?? "").trim();
  const matches = [...(snapshot.tacticMatches ?? [])].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const rows: DisciplineRow[] = [];

  for (const pl of snapshot.players ?? []) {
    const playerLines = matches
      .map((m) => {
        const line = (m.playerStats ?? []).find((x) => x.playerId === pl.id);
        if (!line) return null;
        return {
          yellow: Math.max(0, line.yellowCards ?? 0),
          red: Math.max(0, line.redCards ?? 0),
          minutes: Math.max(0, line.minutesPlayed ?? 0),
        };
      })
      .filter((x): x is { yellow: number; red: number; minutes: number } => x !== null);

    const yellowCards = playerLines.reduce((s, x) => s + x.yellow, 0);
    const redCards = playerLines.reduce((s, x) => s + x.red, 0);
    const minutes = playerLines.reduce((s, x) => s + x.minutes, 0);

    const recent5 = playerLines.slice(-5);
    const sequenceLast5 = recent5
      .map((x) => (x.red > 0 ? TOKEN_RED : x.yellow > 0 ? TOKEN_YELLOW : TOKEN_NONE))
      .join(" ");

    rows.push({
      subjectType: "jogador",
      sourceKey: `linked:${coachUserId}:${pl.id}`,
      subjectName: pl.name,
      team,
      yellowCards,
      redCards,
      minutes,
      gamesSuspended: suspendedGamesFromYellowCards(yellowCards),
      sequenceLast5: sequenceLast5 || `${TOKEN_NONE} ${TOKEN_NONE} ${TOKEN_NONE} ${TOKEN_NONE} ${TOKEN_NONE}`,
    });
  }

  return rows;
}

function buildStaffRowsFromSnapshot(
  coachUserId: string,
  coachEmail: string,
  snapshot: ReturnType<typeof emptyWorkspaceSnapshot>
): DisciplineRow[] {
  const team = (snapshot.coachProfile.club ?? "").trim();
  const headName = (snapshot.coachProfile.name ?? "").trim() || coachEmail;
  const staffNames = [headName, ...(snapshot.staff ?? []).map((s) => s.name.trim()).filter(Boolean)];
  const uniqueNames = [...new Set(staffNames.filter(Boolean))];
  return uniqueNames.map((name, idx) => ({
    subjectType: "staff",
    sourceKey: `staff:${coachUserId}:${idx}:${name.toLowerCase()}`,
    subjectName: name,
    team,
    yellowCards: 0,
    redCards: 0,
    minutes: 0,
    gamesSuspended: 0,
    sequenceLast5: "—",
  }));
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: "Cloud inativo." }, { status: 503 });
  }

  try {
    const premium = await requirePresidentPremiumAccess();
    if (!premium.ok) return premium.response;
    const presidentId = premium.user.id;

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

    const rows: DisciplineRow[] = [];
    for (const c of linked) {
      const row = await prisma.workspace.findUnique({ where: { userId: c.id } });
      const snap = parseWorkspacePayload(row?.payload) ?? emptyWorkspaceSnapshot();
      rows.push(...buildPlayerRowsFromSnapshot(c.id, snap));
      rows.push(...buildStaffRowsFromSnapshot(c.id, c.email, snap));
    }

    const selfRow = await prisma.workspace.findUnique({ where: { userId: presidentId } });
    const selfSnap = parseWorkspacePayload(selfRow?.payload) ?? emptyWorkspaceSnapshot();
    const selfHasTeam =
      (selfSnap.players?.length ?? 0) > 0 || (selfSnap.coachProfile?.name ?? "").trim().length > 0;
    if (selfHasTeam && !linked.some((l) => l.id === presidentId)) {
      rows.push(...buildPlayerRowsFromSnapshot(me.id, selfSnap));
      rows.push(...buildStaffRowsFromSnapshot(me.id, me.email, selfSnap));
    }

    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    console.error("[president/discipline-summary GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao gerar disciplina." }, { status: 500 });
  }
}

