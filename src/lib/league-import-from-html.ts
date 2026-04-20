import type { LeagueImportedMatch, LeagueTableRow } from "@/types";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import {
  extractCompetitionLabelFromHtml,
  extractFpfFixtureRoundMapFromHtml,
  parseFpfMatchesFromHtml,
} from "@/lib/league-import-fpf";
import { parseStandingsFromHtml } from "@/lib/league-table-parse";
import {
  extractMaxJornadaFromHtml,
  extractZeroZeroCompetitionLabel,
  extractZeroZeroEditionParams,
  isZeroZeroHost,
  parseZeroZeroMatchesFromHtml,
  parseZeroZeroMatchesFromPageHtml,
  parseZeroZeroStandings,
} from "@/lib/league-import-zerozero";

const ZEROZERO_CLIENT_ROUND_CONCURRENCY = 8;

export function buildLeagueTableFromFetchedHtml(html: string, pageUrl: string): {
  rows: LeagueTableRow[];
  matches: LeagueImportedMatch[];
  competitionName: string | null;
  host: string;
  isZeroZero: boolean;
} {
  const host = new URL(pageUrl).hostname.toLowerCase();
  const isZeroZero = isZeroZeroHost(host);

  let rows = parseStandingsFromHtml(html);
  let matches: LeagueImportedMatch[] = [];
  let competitionName: string | null = null;

  if (isZeroZero) {
    const zzRows = parseZeroZeroStandings(html);
    if (zzRows.length > 0) rows = zzRows;
    matches = parseZeroZeroMatchesFromPageHtml(html, pageUrl);
    competitionName =
      extractZeroZeroCompetitionLabel(html) ?? extractCompetitionLabelFromHtml(html);
    return { rows, matches, competitionName, host, isZeroZero: true };
  }

  const roundMap = extractFpfFixtureRoundMapFromHtml(html);
  matches = parseFpfMatchesFromHtml(html, pageUrl, roundMap);
  competitionName = extractCompetitionLabelFromHtml(html);
  return { rows, matches, competitionName, host, isZeroZero: false };
}

/**
 * Loads each jornada via POST /api/league-table (HTML only) and parses in the browser.
 * Avoids serverless timeouts from Cheerio + many upstream fetches on Vercel Hobby.
 */
export async function fetchZeroZeroFullSeasonMatches(
  mainHtml: string,
  pageUrl: string,
  fetchImpl: typeof fetch
): Promise<LeagueImportedMatch[]> {
  const params = extractZeroZeroEditionParams(mainHtml);
  if (!params) return [];
  const maxJ = extractMaxJornadaFromHtml(mainHtml);
  if (maxJ < 1) return [];

  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "https://www.zerozero.pt";
  }

  const edition = params;
  const jornadas = Array.from({ length: maxJ }, (_, i) => i + 1);

  async function fetchOneRound(j: number): Promise<LeagueImportedMatch[]> {
    const u = `${origin}/edition.php?id_edicao=${encodeURIComponent(edition.idEdicao)}&fase=${encodeURIComponent(edition.fase)}&jornada_in=${j}`;
    try {
      const r = await fetchImpl("/api/league-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      if (!r.ok) return [];
      const d = (await r.json()) as { ok?: boolean; html?: string };
      if (!d.ok || typeof d.html !== "string") return [];
      return parseZeroZeroMatchesFromHtml(d.html, u, j);
    } catch {
      return [];
    }
  }

  const all: LeagueImportedMatch[] = [];
  for (let i = 0; i < jornadas.length; i += ZEROZERO_CLIENT_ROUND_CONCURRENCY) {
    const slice = jornadas.slice(i, i + ZEROZERO_CLIENT_ROUND_CONCURRENCY);
    const settled = await Promise.all(slice.map((j) => fetchOneRound(j)));
    for (const arr of settled) all.push(...arr);
  }

  return dedupeMatches(all);
}
