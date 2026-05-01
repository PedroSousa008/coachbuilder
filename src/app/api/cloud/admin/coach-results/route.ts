import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";

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
  goalsFor: number;
  goalsAgainst: number;
};

function previousMonthBounds() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

function parseDate(input: string): number {
  const t = new Date(input).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function inRange(iso: string, startMs: number, endMs: number): boolean {
  const t = parseDate(iso);
  return Number.isFinite(t) && t >= startMs && t <= endMs;
}

function toRowResult(gf: number, ga: number): "V" | "E" | "D" {
  if (gf > ga) return "V";
  if (gf < ga) return "D";
  return "E";
}

function buildRows(payload: unknown, startMs: number, endMs: number): MatchRow[] {
  const s = parseWorkspacePayload(payload) ?? emptyWorkspaceSnapshot();
  const fromTactics: MatchRow[] = (s.tacticMatches ?? [])
    .filter((m) => inRange(m.date, startMs, endMs))
    .map((m) => ({
      date: m.date,
      gf: Math.max(0, Number(m.teamGoals) || 0),
      ga: Math.max(0, Number(m.opponentGoals) || 0),
      outcome: m.outcome === "win" ? "V" : m.outcome === "loss" ? "D" : "E",
    }));

  const fromCalendarPrints: MatchRow[] = (s.league.pastClubResults ?? [])
    .filter((m) => inRange(m.recordedAt, startMs, endMs))
    .map((m) => ({
      date: m.recordedAt,
      gf: Math.max(0, Number(m.homeGoals) || 0),
      ga: Math.max(0, Number(m.awayGoals) || 0),
      outcome: m.outcome === "W" ? "V" : m.outcome === "L" ? "D" : "E",
    }));

  const fromImportedLeague: MatchRow[] = (s.league.matches ?? [])
    .filter(
      (m) =>
        typeof m.homeScore === "number" &&
        typeof m.awayScore === "number" &&
        inRange(m.kickoff, startMs, endMs)
    )
    .map((m) => ({
      date: m.kickoff,
      gf: Math.max(0, Number(m.homeScore) || 0),
      ga: Math.max(0, Number(m.awayScore) || 0),
      outcome: toRowResult(Math.max(0, Number(m.homeScore) || 0), Math.max(0, Number(m.awayScore) || 0)),
    }));

  return [...fromTactics, ...fromCalendarPrints, ...fromImportedLeague].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date)
  );
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const { start, end } = previousMonthBounds();
    const startMs = start.getTime();
    const endMs = end.getTime();

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
      const matches = buildRows(u.workspace?.payload, startMs, endMs);
      const gf = matches.reduce((sum, m) => sum + m.gf, 0);
      const ga = matches.reduce((sum, m) => sum + m.ga, 0);
      const sequence = matches.length ? matches.map((m) => m.outcome).join(" - ") : "—";
      return {
        userId: u.id,
        coachName: s.coachProfile.name?.trim() || u.name?.trim() || u.email,
        team: s.coachProfile.club?.trim() || "—",
        monthLabel: start.toLocaleDateString("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }),
        sequence,
        games: matches.length,
        goalsFor: gf,
        goalsAgainst: ga,
      };
    });

    return NextResponse.json({
      ok: true,
      monthStart: start.toISOString(),
      monthEnd: end.toISOString(),
      monthLabel: start.toLocaleDateString("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }),
      rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[admin/coach-results GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao agregar resultados mensais." }, { status: 500 });
  }
}
