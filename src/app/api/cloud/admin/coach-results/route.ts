import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLOUD_SERVER_UNAVAILABLE_MESSAGE, isCloudSyncEnabledServer } from "@/lib/cloud-config";
import { requireAdminSession } from "@/lib/admin-guard";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { calendarDayLisbon, wallClockLisbonToUtcIso } from "@/lib/lisbon-date";

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

/** Ano e mês (1–12) do relógio de parede em Lisboa para `now`. */
function lisbonYearMonth(now: Date): { y: number; m: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
  });
  const o: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== "literal") o[p.type] = p.value;
  }
  return { y: parseInt(o.year ?? "NaN", 10), m: parseInt(o.month ?? "NaN", 10) };
}

/** Mês civil anterior (Lisboa): limites YYYY-MM-DD inclusivos, como no relatório semanal. */
function previousMonthPeriodLisbon(now = new Date()): {
  periodStart: string;
  periodEnd: string;
  monthStartIso: string;
  monthEndIso: string;
  monthLabel: string;
} {
  const { y, m } = lisbonYearMonth(now);
  const targetY = m === 1 ? y - 1 : y;
  const targetM = m === 1 ? 12 : m - 1;
  const periodStart = `${targetY}-${String(targetM).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(targetY, targetM, 0)).getUTCDate();
  const periodEnd = `${targetY}-${String(targetM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const monthStartIso =
    wallClockLisbonToUtcIso(targetY, targetM, 1, 0, 0) ?? `${periodStart}T00:00:00.000Z`;
  const monthEndIso =
    wallClockLisbonToUtcIso(targetY, targetM, lastDay, 23, 59) ?? `${periodEnd}T23:59:59.999Z`;

  const labelAnchor = new Date(Date.UTC(targetY, targetM - 1, 15, 12, 0, 0));
  const monthLabel = labelAnchor.toLocaleDateString("pt-PT", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  });

  return { periodStart, periodEnd, monthStartIso, monthEndIso, monthLabel };
}

function parseDateMs(input: string): number {
  const t = new Date(input).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/** Dia civil em Lisboa para o instante do jogo; alinhado com `sketch-weekly-report`. */
function matchDayKeyLisbon(raw: string | undefined | null): string | null {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return null;
  const ms = new Date(t).getTime();
  if (!Number.isFinite(ms)) return null;
  return calendarDayLisbon(ms);
}

function inLisbonMonthRange(dayKey: string | null, periodStart: string, periodEnd: string): boolean {
  if (!dayKey || dayKey.length < 10) return false;
  return dayKey >= periodStart && dayKey <= periodEnd;
}

function leagueScoresParsed(m: { homeScore?: unknown; awayScore?: unknown }): {
  hs: number;
  as: number;
} | null {
  const hsRaw = m.homeScore;
  const asRaw = m.awayScore;
  const hs = typeof hsRaw === "number" ? hsRaw : Number(hsRaw);
  const aws = typeof asRaw === "number" ? asRaw : Number(asRaw);
  if (!Number.isFinite(hs) || !Number.isFinite(aws)) return null;
  return { hs: Math.max(0, Math.trunc(hs)), as: Math.max(0, Math.trunc(aws)) };
}

function toRowResult(gf: number, ga: number): "V" | "E" | "D" {
  if (gf > ga) return "V";
  if (gf < ga) return "D";
  return "E";
}

function buildRows(payload: unknown, periodStart: string, periodEnd: string): MatchRow[] {
  const s = parseWorkspacePayload(payload) ?? emptyWorkspaceSnapshot();
  const fromTactics: MatchRow[] = (s.tacticMatches ?? [])
    .filter((m) => inLisbonMonthRange(matchDayKeyLisbon(m.date), periodStart, periodEnd))
    .map((m) => ({
      date: m.date,
      gf: Math.max(0, Number(m.teamGoals) || 0),
      ga: Math.max(0, Number(m.opponentGoals) || 0),
      outcome: m.outcome === "win" ? "V" : m.outcome === "loss" ? "D" : "E",
    }));

  const fromCalendarPrints: MatchRow[] = (s.league.pastClubResults ?? [])
    .filter((m) => inLisbonMonthRange(matchDayKeyLisbon(m.recordedAt), periodStart, periodEnd))
    .map((m) => ({
      date: m.recordedAt,
      gf: Math.max(0, Number(m.homeGoals) || 0),
      ga: Math.max(0, Number(m.awayGoals) || 0),
      outcome: m.outcome === "W" ? "V" : m.outcome === "L" ? "D" : "E",
    }));

  const fromImportedLeague: MatchRow[] = (s.league.matches ?? [])
    .map((m) => {
      const sc = leagueScoresParsed(m);
      if (!sc) return null;
      if (!inLisbonMonthRange(matchDayKeyLisbon(m.kickoff), periodStart, periodEnd)) return null;
      return {
        date: m.kickoff,
        gf: sc.hs,
        ga: sc.as,
        outcome: toRowResult(sc.hs, sc.as),
      } satisfies MatchRow;
    })
    .filter((r): r is MatchRow => r != null);

  return [...fromTactics, ...fromCalendarPrints, ...fromImportedLeague].sort(
    (a, b) => parseDateMs(a.date) - parseDateMs(b.date)
  );
}

export async function GET() {
  if (!isCloudSyncEnabledServer()) {
    return NextResponse.json({ ok: false, error: CLOUD_SERVER_UNAVAILABLE_MESSAGE }, { status: 503 });
  }
  const gate = await requireAdminSession();
  if (!gate.ok) return gate.response;

  try {
    const period = previousMonthPeriodLisbon();

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
      const matches = buildRows(u.workspace?.payload, period.periodStart, period.periodEnd);
      const gf = matches.reduce((sum, m) => sum + m.gf, 0);
      const ga = matches.reduce((sum, m) => sum + m.ga, 0);
      const sequence = matches.length ? matches.map((m) => m.outcome).join(" - ") : "—";
      return {
        userId: u.id,
        coachName: s.coachProfile.name?.trim() || u.name?.trim() || u.email,
        team: s.coachProfile.club?.trim() || "—",
        monthLabel: period.monthLabel,
        sequence,
        games: matches.length,
        goalsFor: gf,
        goalsAgainst: ga,
      };
    });

    return NextResponse.json({
      ok: true,
      monthStart: period.monthStartIso,
      monthEnd: period.monthEndIso,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      monthLabel: period.monthLabel,
      rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[admin/coach-results GET]", e);
    return NextResponse.json({ ok: false, error: "Erro ao agregar resultados mensais." }, { status: 500 });
  }
}
