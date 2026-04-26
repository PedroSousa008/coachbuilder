import type { LeaguePhase, LeagueSetup, LeagueTableRow, ParsedMatchEvent, StandingsTeamRow } from "@/types";

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
    team: row.team.trim(),
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
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team, "pt-PT");
    });
}

export function toLeagueTableRows(rows: StandingsTeamRow[]): LeagueTableRow[] {
  return sortStandingsRows(rows).map((r, idx) => ({
    position: idx + 1,
    team: r.team,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalsFor - r.goalsAgainst,
    points: r.points,
  }));
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

export function applyMatchEventsToStandings(rows: StandingsTeamRow[], events: ParsedMatchEvent[]): StandingsTeamRow[] {
  const byName = new Map<string, StandingsTeamRow>();
  for (const r of rows.map((x) => normalizeStandingsRow(x))) {
    byName.set(r.team.trim().toLowerCase(), { ...r });
  }
  for (const event of events) {
    const home = byName.get(event.homeTeam.trim().toLowerCase());
    const away = byName.get(event.awayTeam.trim().toLowerCase());
    if (!home || !away) continue;

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
  return sortStandingsRows([...byName.values()]);
}
