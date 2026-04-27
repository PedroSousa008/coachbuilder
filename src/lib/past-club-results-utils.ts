import type { PastClubResult } from "@/types";
import { teamNamesLikelyMatch } from "@/lib/league-team-name-match";

export type PastClubPerspective = {
  opponent: string;
  teamGoals: number;
  opponentGoals: number;
  dateIso: string;
  outcome: "W" | "D" | "L";
};

function isCoachHome(row: PastClubResult, coachClub: string): boolean {
  const club = coachClub.trim();
  if (!club) return true;
  const homeHit = teamNamesLikelyMatch(club, row.homeSide, 0.55);
  const awayHit = teamNamesLikelyMatch(club, row.awaySide, 0.55);
  if (homeHit && !awayHit) return true;
  if (!homeHit && awayHit) return false;
  // Fallback: preserve deterministic behavior when names are ambiguous.
  return true;
}

export function toPastClubPerspective(row: PastClubResult, coachClub: string): PastClubPerspective {
  const coachAtHome = isCoachHome(row, coachClub);
  return {
    opponent: coachAtHome ? row.awaySide : row.homeSide,
    teamGoals: coachAtHome ? row.homeGoals : row.awayGoals,
    opponentGoals: coachAtHome ? row.awayGoals : row.homeGoals,
    dateIso: row.recordedAt,
    outcome: row.outcome,
  };
}

export function summarizePastClubResults(rows: PastClubResult[], coachClub: string): {
  matchesLogged: number;
  formLast5: ("W" | "D" | "L")[];
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
} {
  const sorted = [...rows].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  const normalized = sorted.map((r) => toPastClubPerspective(r, coachClub));
  const goalsFor = normalized.reduce((sum, r) => sum + r.teamGoals, 0);
  const goalsAgainst = normalized.reduce((sum, r) => sum + r.opponentGoals, 0);
  const cleanSheets = normalized.filter((r) => r.opponentGoals === 0).length;
  return {
    matchesLogged: normalized.length,
    formLast5: normalized.slice(0, 5).map((r) => r.outcome),
    goalsFor,
    goalsAgainst,
    cleanSheets,
  };
}
