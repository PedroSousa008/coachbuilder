import type { LeagueImportedMatch } from "@/types";
import { normalizeTeamLabel } from "@/lib/team-match";

/**
 * Same FPF fixture can appear twice (e.g. bare parse + game-link, or two ISO strings for one kick-off).
 * Key = canonical pair + calendar day + clock in Europe/Lisbon (not raw ISO).
 */
export function matchFingerprint(m: LeagueImportedMatch): string {
  const h = normalizeTeamLabel(m.homeTeam);
  const a = normalizeTeamLabel(m.awayTeam);
  const t = new Date(m.kickoff);
  const day = t.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
  const hm = t.toLocaleTimeString("en-GB", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${h}|${a}|${day}|${hm}`;
}

function betterMatch(a: LeagueImportedMatch, b: LeagueImportedMatch): LeagueImportedMatch {
  const rank = (m: LeagueImportedMatch) =>
    (m.matchId ? 4 : 0) + (m.homeScore != null && m.awayScore != null ? 2 : 0) + (m.venue ? 1 : 0);
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra >= rb ? a : b;
  return a.id <= b.id ? a : b;
}

export function dedupeMatches(matches: LeagueImportedMatch[]): LeagueImportedMatch[] {
  const map = new Map<string, LeagueImportedMatch>();
  for (const m of matches) {
    const key = matchFingerprint(m);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, m);
      continue;
    }
    map.set(key, betterMatch(existing, m));
  }
  const out = [...map.values()];
  out.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  return out;
}
