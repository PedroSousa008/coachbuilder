import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { toPastClubPerspective } from "@/lib/past-club-results-utils";

export const dynamic = "force-dynamic";

type MatchRow = {
  date: string;
  gf: number;
  ga: number;
  outcome: "V" | "E" | "D";
};

type CoachMonthlyResultRow = {
  userId: string;
  coachName: string;
  team: string;
  monthLabel: string;
  sequence: string;
  games: number;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
};

function parseDateMs(input: string): number {
  const t = new Date(input).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function toRowResult(gf: number, ga: number): "V" | "E" | "D" {
  if (gf > ga) return "V";
  if (gf < ga) return "D";
  return "E";
}

function buildRows(payload: unknown): MatchRow[] {
  const s = parseWorkspacePayload(payload) ?? emptyWorkspaceSnapshot();
  const club = s.coachProfile.club?.trim() ?? "";
  const recentCalendarRows = [...(s.league.pastClubResults ?? [])]
    .sort((a, b) => parseDateMs(b.recordedAt) - parseDateMs(a.recordedAt))
    .slice(0, 5);

  return recentCalendarRows.map((m) => {
    const p = toPastClubPerspective(m, club);
    const outcome = m.outcome === "W" || m.outcome === "D" || m.outcome === "L" ? m.outcome : null;
    return {
      date: p.dateIso,
      gf: Math.max(0, Number(p.teamGoals) || 0),
      ga: Math.max(0, Number(p.opponentGoals) || 0),
      outcome: outcome === "W" ? "V" : outcome === "L" ? "D" : outcome === "D" ? "E" : toRowResult(p.teamGoals, p.opponentGoals),
    };
  });
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const users = await prisma.user.findMany({
      where: { role: { not: "admin" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        workspace: { select: { payload: true } },
      },
    });

    const rows: CoachMonthlyResultRow[] = users.map((u) => {
      const s = parseWorkspacePayload(u.workspace?.payload) ?? emptyWorkspaceSnapshot();
      const matches = buildRows(u.workspace?.payload);
      const gf = matches.reduce((sum, m) => sum + m.gf, 0);
      const ga = matches.reduce((sum, m) => sum + m.ga, 0);
      const wins = matches.reduce((sum, m) => sum + (m.outcome === "V" ? 1 : 0), 0);
      const sequence = matches.length ? matches.map((m) => m.outcome).join(" - ") : "—";
      return {
        userId: u.id,
        coachName: s.coachProfile.name?.trim() || u.name?.trim() || u.email,
        team: s.coachProfile.club?.trim() || "—",
        monthLabel: "Últimos 5 jogos (Calendário)",
        sequence,
        games: matches.length,
        wins,
        goalsFor: gf,
        goalsAgainst: ga,
      };
    });

    return NextResponse.json({
      ok: true,
      monthLabel: "Últimos 5 jogos (Calendário)",
      rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[admin/coach-results GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao agregar resultados mensais." }, { status: 500 });
  }
}
