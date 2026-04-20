import type { LeagueImportedMatch, LeagueTableRow } from "@/types";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import {
  enumerateFpfSeriesSections,
  extractCompetitionLabelFromHtml,
  extractFpfFixtureIdsForSeries,
  extractFpfFixtureRoundMapFromHtml,
  filterFpfMatchesToSeriesTeams,
  parseFpfMatchesFromHtml,
  pickFpfSeriesForClub,
} from "@/lib/league-import-fpf";

export { filterFpfMatchesToSeriesTeams } from "@/lib/league-import-fpf";
import { parseStandingsFromHtml } from "@/lib/league-table-parse";

export function buildLeagueTableFromFetchedHtml(
  html: string,
  pageUrl: string,
  clubName?: string
): {
  rows: LeagueTableRow[];
  matches: LeagueImportedMatch[];
  competitionName: string | null;
  host: string;
  fpfFixtureIdsForCoach?: string[];
} {
  const host = new URL(pageUrl).hostname.toLowerCase();
  const competitionName = extractCompetitionLabelFromHtml(html);

  if (!host.includes("resultados.fpf.pt")) {
    return {
      rows: parseStandingsFromHtml(html),
      matches: [],
      competitionName,
      host,
    };
  }

  const sections = enumerateFpfSeriesSections(html);
  const picked = pickFpfSeriesForClub(sections, clubName?.trim() ?? "");
  const rows = picked?.rows ?? [];

  const roundMap = extractFpfFixtureRoundMapFromHtml(html);
  let matches = parseFpfMatchesFromHtml(html, pageUrl, roundMap);
  matches = filterFpfMatchesToSeriesTeams(matches, rows);

  let fpfFixtureIdsForCoach: string[] | undefined;
  if (picked?.label) {
    const ids = extractFpfFixtureIdsForSeries(html, picked.label);
    if (ids.length > 0) fpfFixtureIdsForCoach = ids;
  }

  return {
    rows,
    matches,
    competitionName,
    host,
    fpfFixtureIdsForCoach,
  };
}
