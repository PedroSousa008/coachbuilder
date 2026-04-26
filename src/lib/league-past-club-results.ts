import type { PastClubResult, ResolvedLeagueResult } from "@/types";
import { scoreTeamMatch, teamNamesLikelyMatch } from "@/lib/league-team-name-match";

function uid(): string {
  return `past-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function coachOutcome(
  coachAtHome: boolean,
  homeGoals: number,
  awayGoals: number
): PastClubResult["outcome"] {
  if (homeGoals === awayGoals) return "D";
  if (coachAtHome) return homeGoals > awayGoals ? "W" : "L";
  return awayGoals > homeGoals ? "W" : "L";
}

/** One row per resolved fixture where the coach club is involved (fuzzy on profile club). */
export function buildPastClubResultsFromResolved(
  coachClub: string,
  resolved: ResolvedLeagueResult[],
  notesDefault = ""
): PastClubResult[] {
  const club = coachClub.trim();
  if (!club) return [];
  const out: PastClubResult[] = [];
  for (const r of resolved) {
    const homeMatch = teamNamesLikelyMatch(club, r.homeRow.team, 0.4);
    const awayMatch = teamNamesLikelyMatch(club, r.awayRow.team, 0.4);
    if (!homeMatch && !awayMatch) continue;
    const coachAtHome =
      homeMatch && !awayMatch
        ? true
        : !homeMatch && awayMatch
          ? false
          : scoreTeamMatch(club, r.homeRow.team) >= scoreTeamMatch(club, r.awayRow.team);
    const outcome = coachOutcome(coachAtHome, r.homeGoals, r.awayGoals);
    out.push({
      id: uid(),
      homeSide: r.homeRow.team,
      awaySide: r.awayRow.team,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      outcome,
      notes: notesDefault,
      recordedAt: new Date().toISOString(),
    });
  }
  return out;
}

/** Dedupe by canonical pair + score (avoid stacking identical imports). */
export function mergePastClubResults(existing: PastClubResult[], incoming: PastClubResult[]): PastClubResult[] {
  const key = (p: PastClubResult) =>
    `${compactKey(p.homeSide)}|${compactKey(p.awaySide)}|${p.homeGoals}-${p.awayGoals}`;
  const seen = new Set(existing.map(key));
  return [...incoming.filter((p) => !seen.has(key(p))), ...existing];
}

function compactKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
