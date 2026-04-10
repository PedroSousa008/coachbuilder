import type { LeagueImportedMatch, MatchFixture } from "@/types";
import { isImportedMatchUpcoming, isKickoffInFuture } from "@/lib/lisbon-date";
import { userClubMatchesOfficialTeam } from "@/lib/team-match";

export type ResolvedNextMatch = {
  opponent: string;
  competition: string;
  kickoff: string;
  venue: "home" | "away";
  source: "manual" | "league";
};

/**
 * Earliest upcoming match for the coach: merges manual calendar entries (always for your squad)
 * with league imports where **Club** in Profile matches a participant (via standings + fixtures name list).
 */
export function resolveNextMatchForCoach(args: {
  coachClub: string;
  /** Name from the league table / fixtures when it matches Profile (same as Calendar). */
  coachClubCanonical?: string | null;
  leagueCompetitionName: string | null;
  leagueMatches: LeagueImportedMatch[];
  manualFixtures: MatchFixture[];
  teamCandidateNames: string[];
  /** From `useScheduleNow()` so “next match” updates as kick-offs pass without reloading. */
  nowMs?: number;
}): ResolvedNextMatch | null {
  const nowMs = args.nowMs ?? Date.now();
  const club = (args.coachClubCanonical?.trim() || args.coachClub.trim());
  const comp = (args.leagueCompetitionName ?? "").trim() || "Competition";
  const names = args.teamCandidateNames;

  type Cand = ResolvedNextMatch & { t: number };

  const cands: Cand[] = [];

  for (const f of args.manualFixtures) {
    if (!isKickoffInFuture(f.kickoff, nowMs)) continue;
    const t = new Date(f.kickoff).getTime();
    cands.push({
      opponent: f.opponent,
      competition: f.competition,
      kickoff: f.kickoff,
      venue: f.venue,
      source: "manual",
      t,
    });
  }

  if (club.length > 0) {
    for (const m of args.leagueMatches) {
      if (!isImportedMatchUpcoming(m, nowMs)) continue;
      const t = new Date(m.kickoff).getTime();
      const homeHit = userClubMatchesOfficialTeam(club, m.homeTeam, names);
      const awayHit = userClubMatchesOfficialTeam(club, m.awayTeam, names);
      if (!homeHit && !awayHit) continue;
      const venue: "home" | "away" = homeHit ? "home" : "away";
      const opponent = homeHit ? m.awayTeam : m.homeTeam;
      cands.push({
        opponent,
        competition: comp,
        kickoff: m.kickoff,
        venue,
        source: "league",
        t,
      });
    }
  }

  cands.sort((a, b) => a.t - b.t);
  const first = cands[0];
  if (!first) return null;
  const { t: _t, ...rest } = first;
  return rest;
}
