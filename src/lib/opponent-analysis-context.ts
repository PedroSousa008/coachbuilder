import type { CoachProfileState, LeagueImportedMatch, LeagueTableRow, MatchFixture, Player } from "@/types";
import { calendarDayLisbon, isImportedMatchUpcoming, isKickoffInFuture } from "@/lib/lisbon-date";
import { teamNameSimilarity, userClubMatchesOfficialTeam } from "@/lib/team-match";

export function upcomingFixturesSorted(fixtures: MatchFixture[]): MatchFixture[] {
  const t0 = Date.now() - 36 * 60 * 60 * 1000;
  return [...fixtures]
    .filter((f) => {
      const t = Date.parse(f.kickoff);
      return !Number.isNaN(t) && t >= t0;
    })
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}

/**
 * Próximos jogos para análise de adversário: junta jogos manuais com jogos futuros importados da liga
 * em que o clube do treinador participa (mesma lógica que o Calendário / “Next Game”).
 */
export function mergedUpcomingFixturesForCoach(args: {
  manualFixtures: MatchFixture[];
  leagueMatches: LeagueImportedMatch[];
  coachClub: string;
  coachClubCanonical?: string | null;
  teamCandidateNames: string[];
  leagueCompetitionName: string | null;
  nowMs: number;
}): MatchFixture[] {
  const club = (args.coachClubCanonical?.trim() || args.coachClub.trim());
  const comp = (args.leagueCompetitionName ?? "").trim() || "Competição";
  const names = args.teamCandidateNames;

  type Cand = MatchFixture & { t: number };
  const cands: Cand[] = [];

  for (const f of args.manualFixtures) {
    if (!isKickoffInFuture(f.kickoff, args.nowMs)) continue;
    const t = new Date(f.kickoff).getTime();
    if (!Number.isFinite(t)) continue;
    cands.push({ ...f, t });
  }

  const manualForDedup = cands.map(({ t: _t, ...rest }) => rest);

  if (club.length > 0) {
    for (const m of args.leagueMatches) {
      if (!isImportedMatchUpcoming(m, args.nowMs)) continue;
      const homeHit = userClubMatchesOfficialTeam(club, m.homeTeam, names);
      const awayHit = userClubMatchesOfficialTeam(club, m.awayTeam, names);
      if (!homeHit && !awayHit) continue;
      const venue: "home" | "away" = homeHit ? "home" : "away";
      const opponent = homeHit ? m.awayTeam : m.homeTeam;
      const dup = manualForDedup.some(
        (f) =>
          calendarDayLisbon(f.kickoff) === calendarDayLisbon(m.kickoff) &&
          teamNameSimilarity(f.opponent, opponent) >= 0.82
      );
      if (dup) continue;
      const t = new Date(m.kickoff).getTime();
      if (!Number.isFinite(t)) continue;
      cands.push({
        id: `league-import:${m.id}`,
        opponent,
        competition: comp,
        kickoff: m.kickoff,
        venue,
        t,
      });
    }
  }

  cands.sort((a, b) => a.t - b.t);
  return cands.map(({ t: _t, ...rest }) => rest);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if team label appears to match the given club or opponent name (substring). */
function rowInvolvesTeam(row: LeagueImportedMatch, team: string): boolean {
  const t = norm(team);
  if (!t || t.length < 2) return false;
  return norm(row.homeTeam).includes(t) || norm(row.awayTeam).includes(t);
}

export function recentLeagueMatchesForTeams(
  matches: LeagueImportedMatch[],
  ourClub: string,
  opponent: string,
  maxEach = 12
): { ours: LeagueImportedMatch[]; theirs: LeagueImportedMatch[] } {
  const withScores = matches.filter(
    (m) => m.homeScore != null && m.awayScore != null && !Number.isNaN(Date.parse(m.kickoff))
  );
  const sorted = [...withScores].sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff));
  const ours: LeagueImportedMatch[] = [];
  const theirs: LeagueImportedMatch[] = [];
  for (const m of sorted) {
    if (ours.length < maxEach && rowInvolvesTeam(m, ourClub)) ours.push(m);
    if (theirs.length < maxEach && rowInvolvesTeam(m, opponent)) theirs.push(m);
    if (ours.length >= maxEach && theirs.length >= maxEach) break;
  }
  return { ours, theirs };
}

export function tableRowsForTeams(rows: LeagueTableRow[], ourClub: string, opponent: string): LeagueTableRow[] {
  const t1 = norm(ourClub);
  const t2 = norm(opponent);
  return rows.filter((r) => {
    const n = norm(r.team);
    return (t1 && n.includes(t1)) || (t2 && n.includes(t2)) || (t1 && t1.includes(n)) || (t2 && t2.includes(n));
  });
}

export type SerializedPlayerForAi = {
  id: string;
  name: string;
  position: string;
  number: number;
  age: number;
  availability: Player["availability"];
  /** Partial FIFA-style 0–100; omit keys not set. */
  qualities: Record<string, number>;
};

export function serializePlayersForAi(players: Player[], availableIds: Set<string>): SerializedPlayerForAi[] {
  return players
    .filter((p) => availableIds.has(p.id))
    .map((p) => {
      const q = p.qualities ?? {};
      const qualities: Record<string, number> = {};
      for (const [k, v] of Object.entries(q)) {
        if (typeof v === "number" && Number.isFinite(v)) qualities[k] = Math.round(v);
      }
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        number: p.number,
        age: p.age,
        availability: p.availability,
        qualities,
      };
    });
}

/** Heuristic overall score for picking alternates (0–100). */
export function heuristicPlayerStrength(p: SerializedPlayerForAi): number {
  const vals = Object.values(p.qualities);
  if (vals.length === 0) return 50;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function coachClubLabel(profile: CoachProfileState): string {
  return profile.club?.trim() || "A nossa equipa";
}
