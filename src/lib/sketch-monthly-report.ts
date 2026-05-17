import type { Player, Tactic, TacticMatch } from "@/types";
import { formationDisplayLabel } from "@/data/formations";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { matchOutcomeForStats } from "@/lib/tactics-match-stats";

export type MonthKey = string;

export type MonthlyDisciplineStatus = "clean" | "risk" | "suspended";

export type MonthlyMatchRow = {
  id: string;
  dateYmd: string;
  opponent: string;
  result: string;
  outcome: TacticMatch["outcome"];
  competition: string;
  tacticLabel: string;
  teamGoals: number;
  opponentGoals: number;
};

export type MonthlyTeamStats = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  cleanSheets: number;
  scorelessGames: number;
};

export type MonthlyPlayerRow = {
  playerId: string;
  games: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutes: number;
  goalsPer90: number;
  assistsPer90: number;
  goalInvolvement: number;
  discipline: MonthlyDisciplineStatus;
  cumulativeYellows: number;
};

export type MonthlySlice = {
  monthKey: MonthKey;
  label: string;
  matches: MonthlyMatchRow[];
  team: MonthlyTeamStats;
  players: MonthlyPlayerRow[];
};

export type MonthlyComparisonPoint = {
  monthKey: MonthKey;
  label: string;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  totalMinutes: number;
};

export type MonthlyReportBundle = {
  selectedMonths: MonthKey[];
  periodLabel: string;
  combined: MonthlySlice;
  byMonth: MonthlySlice[];
  comparison: MonthlyComparisonPoint[];
};

const RISK_YELLOW_THRESHOLDS = new Set([4, 7, 10, 13, 16]);

const MONTH_NAMES_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export function ymdKeyFromMatch(m: TacticMatch): string {
  const raw = (m.date ?? "").trim();
  if (!raw) return "";
  try {
    return calendarDayLisbon(raw);
  } catch {
    return raw.slice(0, 10);
  }
}

export function monthKeyFromYmd(ymd: string): MonthKey {
  return ymd.slice(0, 7);
}

export function monthKeyFromMatch(m: TacticMatch): MonthKey {
  return monthKeyFromYmd(ymdKeyFromMatch(m));
}

export function monthLabelPt(monthKey: MonthKey): string {
  const [y, m] = monthKey.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return monthKey;
  const name = MONTH_NAMES_PT[m - 1]!;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

function addMonthsToKey(monthKey: MonthKey, delta: number): MonthKey {
  const [y, m] = monthKey.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

/** Meses com jogos + últimos 12 meses calendário (Lisboa). */
export function selectableMonthKeys(tacticMatches: TacticMatch[], anchorYmd?: string): MonthKey[] {
  const set = new Set<MonthKey>();
  for (const m of tacticMatches) {
    const k = monthKeyFromMatch(m);
    if (/^\d{4}-\d{2}$/.test(k)) set.add(k);
  }
  let anchor: string;
  try {
    anchor = calendarDayLisbon(anchorYmd ?? Date.now());
  } catch {
    anchor = (anchorYmd ?? "").slice(0, 10);
  }
  const current = monthKeyFromYmd(anchor);
  for (let i = 0; i < 12; i++) {
    set.add(addMonthsToKey(current, -i));
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function matchInMonths(m: TacticMatch, months: Set<MonthKey>): boolean {
  return months.has(monthKeyFromMatch(m));
}

function tacticLabelForMatch(m: TacticMatch, tacticsById: Map<string, Tactic>): string {
  const t = tacticsById.get(m.tacticId);
  if (!t) return "—";
  const formation = formationDisplayLabel(t.formation);
  return `${t.name} · ${formation}`;
}

function per90(value: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return (value / minutes) * 90;
}

export function disciplineFromYellows(cumulativeYellows: number, redCardsInPeriod: number): MonthlyDisciplineStatus {
  if (redCardsInPeriod > 0) return "suspended";
  if (cumulativeYellows >= 5 && cumulativeYellows % 5 === 0) return "suspended";
  if (RISK_YELLOW_THRESHOLDS.has(cumulativeYellows)) return "risk";
  if (cumulativeYellows > 0 && cumulativeYellows % 5 === 4) return "risk";
  return "clean";
}

export const DISCIPLINE_LABELS_PT: Record<MonthlyDisciplineStatus, string> = {
  clean: "Limpo",
  risk: "Em risco",
  suspended: "Suspenso",
};

export function availabilityLabelPt(availability: Player["availability"]): string {
  if (availability === "out") return "Lesionado";
  if (availability === "doubt") return "Indisponível";
  return "Disponível";
}

function cumulativeYellowsUntil(
  tacticMatches: TacticMatch[],
  playerId: string,
  inclusiveEndYmd: string
): number {
  let total = 0;
  const sorted = [...tacticMatches].sort((a, b) => ymdKeyFromMatch(a).localeCompare(ymdKeyFromMatch(b)));
  for (const g of sorted) {
    const day = ymdKeyFromMatch(g);
    if (!day || day > inclusiveEndYmd) break;
    for (const line of g.playerStats) {
      if (line.playerId === playerId) total += line.yellowCards;
    }
  }
  return total;
}

function lastDayOfMonth(monthKey: MonthKey): string {
  const [y, m] = monthKey.split("-").map((x) => parseInt(x, 10));
  const last = new Date(Date.UTC(y, m, 0));
  return calendarDayLisbon(last.getTime());
}

function inclusiveEndYmdForMonths(months: MonthKey[]): string {
  if (months.length === 0) return "";
  const sorted = [...months].sort();
  return lastDayOfMonth(sorted[sorted.length - 1]!);
}

function buildMatchRows(
  matches: TacticMatch[],
  tacticsById: Map<string, Tactic>
): MonthlyMatchRow[] {
  return [...matches]
    .sort((a, b) => ymdKeyFromMatch(a).localeCompare(ymdKeyFromMatch(b)))
    .map((m) => {
      const outcome = matchOutcomeForStats(m);
      return {
        id: m.id,
        dateYmd: ymdKeyFromMatch(m),
        opponent: m.opponent,
        outcome,
        teamGoals: m.teamGoals,
        opponentGoals: m.opponentGoals,
        result: `${m.teamGoals}–${m.opponentGoals}`,
        competition: (m.competition ?? "").trim() || "—",
        tacticLabel: tacticLabelForMatch(m, tacticsById),
      };
    });
}

function buildTeamStats(rows: MonthlyMatchRow[]): MonthlyTeamStats {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  let scorelessGames = 0;
  for (const m of rows) {
    if (m.outcome === "win") wins += 1;
    else if (m.outcome === "draw") draws += 1;
    else losses += 1;
    goalsFor += m.teamGoals;
    goalsAgainst += m.opponentGoals;
    if (m.opponentGoals === 0) cleanSheets += 1;
    if (m.teamGoals === 0) scorelessGames += 1;
  }
  const games = rows.length;
  const goalDiff = goalsFor - goalsAgainst;
  return {
    games,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDiff,
    avgGoalsFor: games > 0 ? goalsFor / games : 0,
    avgGoalsAgainst: games > 0 ? goalsAgainst / games : 0,
    cleanSheets,
    scorelessGames,
  };
}

function aggregatePlayerRows(
  matches: TacticMatch[],
  players: Player[],
  allMatches: TacticMatch[],
  inclusiveEndYmd: string
): MonthlyPlayerRow[] {
  const byId = new Map<string, Omit<MonthlyPlayerRow, "goalsPer90" | "assistsPer90" | "goalInvolvement" | "discipline" | "cumulativeYellows">>();

  for (const m of matches) {
    for (const line of m.playerStats) {
      const row =
        byId.get(line.playerId) ??
        ({
          playerId: line.playerId,
          games: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          minutes: 0,
        } satisfies Omit<MonthlyPlayerRow, "goalsPer90" | "assistsPer90" | "goalInvolvement" | "discipline" | "cumulativeYellows">);
      row.games += 1;
      row.goals += line.goals;
      row.assists += line.assists;
      row.yellowCards += line.yellowCards;
      row.redCards += line.redCards;
      row.minutes += line.minutesPlayed;
      byId.set(line.playerId, row);
    }
  }

  const rosterIds = new Set(players.map((p) => p.id));
  for (const p of players) {
    if (!byId.has(p.id)) {
      byId.set(p.id, {
        playerId: p.id,
        games: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        minutes: 0,
      });
    }
  }

  return [...byId.values()]
    .filter((r) => rosterIds.has(r.playerId))
    .map((row) => {
      const cum = cumulativeYellowsUntil(allMatches, row.playerId, inclusiveEndYmd);
      const gi = row.goals + row.assists;
      return {
        ...row,
        goalsPer90: per90(row.goals, row.minutes),
        assistsPer90: per90(row.assists, row.minutes),
        goalInvolvement: gi,
        cumulativeYellows: cum,
        discipline: disciplineFromYellows(cum, row.redCards),
      };
    })
    .sort((a, b) => b.goalInvolvement - a.goalInvolvement || b.minutes - a.minutes || a.playerId.localeCompare(b.playerId));
}

function buildSlice(
  monthKey: MonthKey,
  matches: TacticMatch[],
  tacticsById: Map<string, Tactic>,
  players: Player[],
  allMatches: TacticMatch[]
): MonthlySlice {
  const rows = buildMatchRows(matches, tacticsById);
  const endYmd = lastDayOfMonth(monthKey);
  return {
    monthKey,
    label: monthLabelPt(monthKey),
    matches: rows,
    team: buildTeamStats(rows),
    players: aggregatePlayerRows(matches, players, allMatches, endYmd),
  };
}

export type BuildMonthlyReportInput = {
  selectedMonths: MonthKey[];
  players: Player[];
  tacticMatches: TacticMatch[];
  savedTactics: Tactic[];
};

export function buildMonthlyReportBundle(input: BuildMonthlyReportInput): MonthlyReportBundle | null {
  const months = [...input.selectedMonths].filter((k) => /^\d{4}-\d{2}$/.test(k)).sort();
  if (months.length === 0) return null;

  const monthSet = new Set(months);
  const tacticsById = new Map(input.savedTactics.map((t) => [t.id, t]));
  const periodMatches = input.tacticMatches.filter((m) => matchInMonths(m, monthSet));
  const endYmd = inclusiveEndYmdForMonths(months);

  const matchRows = buildMatchRows(periodMatches, tacticsById);
  const combined: MonthlySlice = {
    monthKey: months.length === 1 ? months[0]! : months.join(","),
    label:
      months.length === 1
        ? monthLabelPt(months[0]!)
        : months.map(monthLabelPt).join(" · "),
    matches: matchRows,
    team: buildTeamStats(matchRows),
    players: aggregatePlayerRows(periodMatches, input.players, input.tacticMatches, endYmd),
  };

  const byMonth = months.map((mk) => {
    const monthMatches = input.tacticMatches.filter((m) => monthKeyFromMatch(m) === mk);
    return buildSlice(mk, monthMatches, tacticsById, input.players, input.tacticMatches);
  });

  const comparison: MonthlyComparisonPoint[] = byMonth.map((s) => ({
    monthKey: s.monthKey,
    label: s.label,
    wins: s.team.wins,
    draws: s.team.draws,
    losses: s.team.losses,
    goalsFor: s.team.goalsFor,
    goalsAgainst: s.team.goalsAgainst,
    totalMinutes: s.players.reduce((acc, p) => acc + p.minutes, 0),
  }));

  return {
    selectedMonths: months,
    periodLabel: combined.label,
    combined,
    byMonth,
    comparison,
  };
}

export function deltaTone(current: number, previous: number): "up" | "down" | "flat" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}
