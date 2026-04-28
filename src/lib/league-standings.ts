import type {
  LeaguePhase,
  LeagueSetup,
  LeagueTableRow,
  ParsedMatchEvent,
  ResolvedLeagueResult,
  StandingsTeamRow,
} from "@/types";
import { findBestStandingsRowMatchForOcr } from "@/lib/league-team-name-match";

function toNonNegativeInt(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function normalizeStandingsRow(row: StandingsTeamRow): StandingsTeamRow {
  const played = toNonNegativeInt(row.played);
  const won = toNonNegativeInt(row.won);
  const drawn = toNonNegativeInt(row.drawn);
  const lost = toNonNegativeInt(row.lost);
  const goalsFor = toNonNegativeInt(row.goalsFor);
  const goalsAgainst = toNonNegativeInt(row.goalsAgainst);
  const points = won * 3 + drawn;
  return {
    teamId: row.teamId,
    team: typeof row.team === "string" ? row.team : "",
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    points,
  };
}

export function sortStandingsRows(rows: StandingsTeamRow[]): StandingsTeamRow[] {
  return rows
    .map((r) => normalizeStandingsRow(r))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team, "pt-PT");
    });
}

function standingsRowToLeagueTableRow(n: StandingsTeamRow, position: number): LeagueTableRow {
  return {
    position,
    team: n.team,
    played: n.played,
    won: n.won,
    drawn: n.drawn,
    lost: n.lost,
    goalsFor: n.goalsFor,
    goalsAgainst: n.goalsAgainst,
    goalDifference: n.goalsFor - n.goalsAgainst,
    points: n.points,
  };
}

/** Classificação ordenada por pontos / GM (uso após resultados ou edição de estatísticas). */
export function toLeagueTableRows(rows: StandingsTeamRow[]): LeagueTableRow[] {
  return sortStandingsRows(rows).map((r, idx) => standingsRowToLeagueTableRow(r, idx + 1));
}

/** Mantém a ordem das linhas na UI (ex.: ao editar nomes sem alterar pontos). */
export function toLeagueTableRowsPreserveOrder(rows: StandingsTeamRow[]): LeagueTableRow[] {
  return rows.map((r, idx) => standingsRowToLeagueTableRow(normalizeStandingsRow(r), idx + 1));
}

export function createEmptyLeagueSetup(teamCount: number, phaseCount: number): LeagueSetup {
  const safeTeamCount = Math.max(2, Math.min(64, Math.floor(teamCount)));
  const safePhaseCount = Math.max(1, Math.min(3, Math.floor(phaseCount)));
  const now = new Date().toISOString();
  const teamIds = Array.from({ length: safeTeamCount }, (_, i) => `team-${i + 1}`);
  const phases: LeaguePhase[] = Array.from({ length: safePhaseCount }, (_, i) => {
    const phaseId = `phase-${i + 1}`;
    const rows: StandingsTeamRow[] = teamIds.map((teamId) => ({
      teamId,
      team: "",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    }));
    return {
      id: phaseId,
      name: `Fase ${i + 1}`,
      teamIds: [...teamIds],
      standings: { phaseId, updatedAt: now, rows },
    };
  });
  return {
    configured: true,
    teamCount: safeTeamCount,
    phaseCount: safePhaseCount,
    activePhaseId: phases[0]?.id ?? "phase-1",
    phases,
  };
}

export function applyMatchEventsToStandings(
  rows: StandingsTeamRow[],
  events: ParsedMatchEvent[]
): { rows: StandingsTeamRow[]; applied: ResolvedLeagueResult[] } {
  const rowsCopy = rows.map((r) => ({ ...normalizeStandingsRow(r) }));
  const applied: ResolvedLeagueResult[] = [];

  /**
   * Resolver cada jogo só contra linhas ainda livres (evita colisões de fuzzy match).
   * Ordem = ordem do texto/OCR (estrutura da jornada), não por “confiança” agregada.
   */
  const usedTeamIds = new Set<string>();
  for (const event of events) {
    const pool = rowsCopy.filter((r) => !usedTeamIds.has(r.teamId));
    const homeMatch = findBestStandingsRowMatchForOcr(event.homeTeam, pool);
    const awayMatch = findBestStandingsRowMatchForOcr(event.awayTeam, pool);
    if (!homeMatch || !awayMatch || homeMatch.row.teamId === awayMatch.row.teamId) continue;

    usedTeamIds.add(homeMatch.row.teamId);
    usedTeamIds.add(awayMatch.row.teamId);
    const home = rowsCopy.find((r) => r.teamId === homeMatch.row.teamId);
    const away = rowsCopy.find((r) => r.teamId === awayMatch.row.teamId);
    if (!home || !away) continue;

    applied.push({
      homeRow: { ...home },
      awayRow: { ...away },
      homeGoals: event.homeGoals,
      awayGoals: event.awayGoals,
      playedAt: event.playedAt,
    });

    home.played += 1;
    away.played += 1;
    home.goalsFor += event.homeGoals;
    home.goalsAgainst += event.awayGoals;
    away.goalsFor += event.awayGoals;
    away.goalsAgainst += event.homeGoals;
    if (event.homeGoals > event.awayGoals) {
      home.won += 1;
      away.lost += 1;
    } else if (event.homeGoals < event.awayGoals) {
      away.won += 1;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
    }
    home.points = home.won * 3 + home.drawn;
    away.points = away.won * 3 + away.drawn;
  }
  return { rows: sortStandingsRows(rowsCopy), applied };
}
