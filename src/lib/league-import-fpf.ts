import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { LeagueImportedMatch, LeagueTableRow } from "@/types";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import {
  collectUniqueTeamNames,
  matchInvolvesResolvedClub,
  normalizeTeamLabel,
  pickBestTeamMatch,
} from "@/lib/team-match";
import { wallClockLisbonToUtcIso } from "@/lib/lisbon-date";

export { dedupeMatches };

const MONTHS_PT: Record<string, number> = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

/**
 * FPF shows dates like "20 mai", "21 dez", "11 abr 20:00". Season is e.g. 2025-2026:
 * Aug–Dec → first year; Jan–Jul → second year.
 */
export function parsePortugueseScheduleToIso(
  scheduleText: string,
  seasonYearStart: number,
  seasonYearEnd: number
): string | null {
  const raw = scheduleText.trim().toLowerCase().replace(/\s+/g, " ");
  // Do not anchor: FPF often prefixes weekday (“sáb 11 abr 20:00”) or extra text before the day.
  const m = raw.match(/(\d{1,2})\s+(?:de\s+)?([a-záàãâéêíóôõúç]+)/u);
  if (!m) return null;
  const day = parseInt(m[1]!, 10);
  const monNorm = m[2]!.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const key = monNorm.slice(0, 3) as keyof typeof MONTHS_PT;
  const monthIdx = MONTHS_PT[key];
  if (monthIdx === undefined || day < 1 || day > 31) return null;

  const year = monthIdx >= 7 ? seasonYearStart : seasonYearEnd;
  // Prefer time after the date token (avoids picking a time from elsewhere in the string).
  const fromDate = m.index != null ? raw.slice(m.index + m[0].length) : raw;
  const hm = fromDate.match(/(\d{1,2}):(\d{2})/) ?? raw.match(/(\d{1,2}):(\d{2})/);
  const hour = hm ? parseInt(hm[1]!, 10) : 15;
  const min = hm ? parseInt(hm[2]!, 10) : 0;
  return wallClockLisbonToUtcIso(year, monthIdx + 1, day, hour, min);
}

export function extractSeasonYearsFromHtml(html: string): { start: number; end: number } {
  const m = html.match(/(\d{4})\s*-\s*(\d{4})/);
  if (m) {
    return { start: parseInt(m[1]!, 10), end: parseInt(m[2]!, 10) };
  }
  const y = new Date().getFullYear();
  return { start: y, end: y + 1 };
}

export function extractCompetitionLabelFromHtml(html: string): string | null {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  if (title && title.length > 3) return title.replace(/\s+/g, " ").slice(0, 120);
  const h = $(".section-title").first().text().trim();
  return h ? h.slice(0, 120) : null;
}

/** FPF loads each matchday via AJAX; IDs appear on the main competition page. */
export function extractFpfFixtureIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  const patterns = [
    /GetClassificationAndMatchesByFixture\?fixtureId=(\d+)/gi,
    /\/Competition\/[^\s"'<>]*fixtureId=(\d+)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) ids.add(m[1]!);
  }
  const $ = cheerio.load(html);
  $('a[href*="GetClassificationAndMatchesByFixture"]').each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const id = href.match(/fixtureId=(\d+)/i)?.[1];
    if (id) ids.add(id);
  });
  return [...ids];
}

/** fixtureId → jornada label (1…34) from the numbered tabs on the competition page. */
export function extractFpfFixtureRoundMapFromHtml(html: string): Map<string, number> {
  const map = new Map<string, number>();
  const re = /GetClassificationAndMatchesByFixture\?fixtureId=(\d+)"[^>]*>\s*(\d+)\s*<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    map.set(m[1]!, parseInt(m[2]!, 10));
  }

  const $ = cheerio.load(html);
  $("a[href*='fixtureId=']").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const fid = href.match(/fixtureId=(\d+)/i)?.[1];
    if (!fid) return;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const num = /^(\d+)$/.exec(text)?.[1];
    if (!num) return;
    const j = parseInt(num, 10);
    if (j >= 1 && j <= 50) map.set(fid, j);
  });

  return map;
}

export function extractFpfFixtureIdFromUrl(pageUrl: string): string | undefined {
  return pageUrl.match(/[?&]fixtureId=(\d+)/i)?.[1];
}

function classificationRowFromDiv(
  $: ReturnType<typeof cheerio.load>,
  el: AnyNode
): LeagueTableRow | null {
  const $el = $(el);
  const cells: string[] = [];
  $el.children("div").each((__, child) => {
    cells.push($(child).text().trim().replace(/\s+/g, " "));
  });
  if (cells.length < 4) return null;

  const posRaw = cells[0].replace(/[^\d]/g, "");
  const position = posRaw ? parseInt(posRaw, 10) : NaN;
  const team = cells[1] ?? "";
  if (!team || team.length < 2 || !Number.isFinite(position)) return null;

  const nums = cells.slice(2).map((c) => {
    const m = c.match(/^-?\d+$/);
    return m ? parseInt(m[0], 10) : NaN;
  });
  const validNums = nums.filter((n) => !isNaN(n));
  const points = validNums.length >= 1 ? validNums[validNums.length - 1] : undefined;

  let played: number | undefined;
  let won: number | undefined;
  let drawn: number | undefined;
  let lost: number | undefined;
  let goalsFor: number | undefined;
  let goalsAgainst: number | undefined;
  if (validNums.length >= 7) {
    [played, won, drawn, lost, goalsFor, goalsAgainst] = validNums.slice(0, 6);
  }

  let goalDifference: number | undefined;
  if (goalsFor !== undefined && goalsAgainst !== undefined) {
    goalDifference = goalsFor - goalsAgainst;
  }

  return {
    position,
    team: team.slice(0, 80),
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
    cells,
  };
}

/** All `div.game.classification` rows under a container, in DOM order. */
export function parseFpfClassificationRowsInScope(
  $: ReturnType<typeof cheerio.load>,
  $root: Cheerio<AnyNode>
): LeagueTableRow[] {
  const out: LeagueTableRow[] = [];
  $root.find("div.game.classification").each((_, el) => {
    const row = classificationRowFromDiv($, el);
    if (row) out.push(row);
  });
  return out;
}

function groupRowsIntoTables(rows: LeagueTableRow[]): LeagueTableRow[][] {
  const groups: LeagueTableRow[][] = [];
  let current: LeagueTableRow[] = [];
  for (const row of rows) {
    if (row.position === 1 && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(row);
  }
  if (current.length) groups.push(current);
  return groups;
}

function extractSeriesLabelFromColumn($: ReturnType<typeof cheerio.load>, $col: Cheerio<AnyNode>): string {
  const h = $col
    .find("h1, h2, h3, h4, h5, .section-title, .club-title")
    .filter((_, el) => /SERIE|SÉRIE/i.test($(el).text()))
    .first()
    .text()
    .trim()
    .replace(/\s+/g, " ");
  if (h) return h.slice(0, 80);
  const any = $col.find("h3, h4").first().text().trim().replace(/\s+/g, " ");
  return any ? any.slice(0, 80) : "";
}

export type FpfSeriesSection = { label: string; html: string; rows: LeagueTableRow[] };

/**
 * Multi-column FPF pages (Serie A/B/C): one block per grid column.
 * Single-column pages: split consecutive mini-tables (each restarts at position 1).
 */
export function enumerateFpfSeriesSections(html: string): FpfSeriesSection[] {
  const $ = cheerio.load(html);
  const colCandidates = $("div.row")
    .children("div")
    .filter((_, el) => $(el).find("div.game.classification").length > 0);

  if (colCandidates.length >= 2) {
    const out: FpfSeriesSection[] = [];
    colCandidates.each((_, el) => {
      const $c = $(el);
      const rows = parseFpfClassificationRowsInScope($, $c);
      if (rows.length === 0) return;
      const label = extractSeriesLabelFromColumn($, $c) || "Série";
      out.push({ label, html: $.html($c), rows });
    });
    if (out.length > 0) return out;
  }

  const allRows = parseFpfClassificationRowsInScope($, $("body"));
  if (allRows.length === 0) return [];
  const groups = groupRowsIntoTables(allRows);
  return groups.map((rows, i) => ({
    label: `Série ${i + 1}`,
    html,
    rows,
  }));
}

export function pickFpfSeriesForClub(
  sections: FpfSeriesSection[],
  clubName: string
): FpfSeriesSection | null {
  if (sections.length === 0) return null;
  const club = clubName.trim();
  if (!club) {
    const sorted = [...sections].sort((a, b) => b.rows.length - a.rows.length);
    return sorted[0]!;
  }

  let best: { section: FpfSeriesSection; score: number } | null = null;
  for (const s of sections) {
    const names = s.rows.map((r) => r.team);
    const pick = pickBestTeamMatch(club, names);
    const score = pick?.score ?? 0;
    if (!best || score > best.score) best = { section: s, score };
  }
  if (best && best.score >= 0.42) return best.section;
  return [...sections].sort((a, b) => b.rows.length - a.rows.length)[0]!;
}

function normalizeSerieLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function seriesLabelForFixtureLink($: ReturnType<typeof cheerio.load>, el: AnyNode): string {
  const $link = $(el);
  const $col = $link.closest('div[class*="col-"]');
  if ($col.length) {
    const fromSerie = $col
      .find("h1, h2, h3, h4, h5")
      .filter((_, h) => /SERIE|SÉRIE/i.test($(h).text()))
      .first()
      .text()
      .trim();
    if (fromSerie) return fromSerie.replace(/\s+/g, " ");
    const any = $col.find("h3, h4").first().text().trim();
    if (any) return any.replace(/\s+/g, " ");
  }
  return "";
}

/** Fixture IDs whose tab/link sits under the same column / heading as the chosen SERIE label. */
export function extractFpfFixtureIdsForSeries(html: string, seriesLabel: string): string[] {
  const want = normalizeSerieLabel(seriesLabel);
  if (!want) return [];

  const $ = cheerio.load(html);
  const ids = new Set<string>();

  $('a[href*="fixtureId="]').each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const fid = href.match(/fixtureId=(\d+)/i)?.[1];
    if (!fid) return;
    const lab = normalizeSerieLabel(seriesLabelForFixtureLink($, el));
    if (!lab) return;
    if (lab === want || lab.includes(want) || want.includes(lab)) {
      ids.add(fid);
      return;
    }
    const wa = want.replace(/^serie\s*/i, "").trim();
    const lb = lab.replace(/^serie\s*/i, "").trim();
    if (wa.length >= 1 && lb.length >= 1 && (wa === lb || lb.includes(wa) || wa.includes(lb))) {
      ids.add(fid);
    }
  });

  return [...ids];
}

/** Keep only matches where both clubs appear in the series standings (same group). */
export function filterFpfMatchesToSeriesTeams(
  matches: LeagueImportedMatch[],
  rows: LeagueTableRow[]
): LeagueImportedMatch[] {
  if (rows.length === 0) return matches;
  const teamSet = new Set(rows.map((r) => normalizeTeamLabel(r.team)));
  return matches.filter(
    (m) =>
      teamSet.has(normalizeTeamLabel(m.homeTeam)) && teamSet.has(normalizeTeamLabel(m.awayTeam))
  );
}

type FpfMatchMeta = { fpfRound?: number; fpfFixtureId?: string };

/**
 * Matches listed without `a.game-link` (common on “current round” AJAX fragments).
 */
function parseFpfBareGamesFromHtml(html: string, pageUrl: string, meta?: FpfMatchMeta): LeagueImportedMatch[] {
  const $ = cheerio.load(html);
  const { start: y1, end: y2 } = extractSeasonYearsFromHtml(html);
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "https://resultados.fpf.pt";
  }

  const out: LeagueImportedMatch[] = [];

  // FPF mixes standings rows (`div.game.classification`) with real fixtures (`div.game` only).
  // There may also be multiple `id="matches"` fragments; include every block.
  $('div[id="matches"]')
    .find("div.game")
    .not(".classification")
    .each((_, el) => {
      const $g = $(el);
      const home = $g.find(".home-team").first().text().trim().replace(/\s+/g, " ");
      const away = $g.find(".away-team").first().text().trim().replace(/\s+/g, " ");
      if (!home || !away) return;

      const $score = $g.find(".score").first();
      let scheduleText = "";
      let homeScore: number | undefined;
      let awayScore: number | undefined;

      if ($score.length) {
        const spans = $score.find("> span");
        const first = spans.first();
        const st = first.text().trim();
        const sm = st.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (sm) {
          homeScore = parseInt(sm[1]!, 10);
          awayScore = parseInt(sm[2]!, 10);
        }
        const sched = $g.find(".game-schedule").first();
        scheduleText = sched.length ? sched.text() : spans.last().text();
      } else {
        scheduleText = $g.find(".game-schedule").first().text().replace(/\s+/g, " ").trim();
      }

      scheduleText = scheduleText.replace(/\s+/g, " ").trim();
      const kickoff = parsePortugueseScheduleToIso(scheduleText, y1, y2);
      if (!kickoff) return;

      const venue =
        $g.next(".game-list-stadium").find("small").first().text().trim().replace(/\s+/g, " ") || undefined;

      const id = `fpf-bare-${compactId(home)}-${compactId(away)}-${kickoff}`;
      out.push({
        id,
        homeTeam: home,
        awayTeam: away,
        kickoff,
        homeScore,
        awayScore,
        venue,
        sourceUrl: pageUrl,
        ...(meta?.fpfRound != null ? { fpfRound: meta.fpfRound } : {}),
        ...(meta?.fpfFixtureId ? { fpfFixtureId: meta.fpfFixtureId } : {}),
      });
    });

  return out;
}

function compactId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 32);
}

function parseFpfGameLinksFromHtml(html: string, pageUrl: string, meta?: FpfMatchMeta): LeagueImportedMatch[] {
  const $ = cheerio.load(html);
  const { start: y1, end: y2 } = extractSeasonYearsFromHtml(html);
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "https://resultados.fpf.pt";
  }

  const seen = new Set<string>();
  const out: LeagueImportedMatch[] = [];

  $("a.game-link").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const mid = href.match(/matchId=(\d+)/)?.[1];
    if (mid && seen.has(mid)) return;
    if (mid) seen.add(mid);

    const game = $(el).find("div.game").not(".classification").first();
    const home = game.find(".home-team").first().text().trim().replace(/\s+/g, " ");
    const away = game.find(".away-team").first().text().trim().replace(/\s+/g, " ");
    const scoreSpan = game.find(".score > span").not(".game-schedule").first();
    const scoreText = scoreSpan.length ? scoreSpan.text().trim() : "";
    const scheduleText = game.find(".game-schedule").first().text().trim();

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    const sm = scoreText.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (sm) {
      homeScore = parseInt(sm[1]!, 10);
      awayScore = parseInt(sm[2]!, 10);
    }

    const sched = scheduleText || game.find(".score .game-schedule").first().text().trim();
    const kickoff = parsePortugueseScheduleToIso(sched.replace(/\s+/g, " ").trim(), y1, y2);
    if (!kickoff || !home || !away) return;

    const venue = $(el).find(".game-list-stadium small").first().text().trim().replace(/\s+/g, " ") || undefined;
    const absUrl = href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;

    out.push({
      id: mid ? `fpf-${mid}` : `fpf-${home}-${away}-${kickoff}`,
      matchId: mid,
      homeTeam: home,
      awayTeam: away,
      kickoff,
      homeScore,
      awayScore,
      venue,
      sourceUrl: absUrl,
      ...(meta?.fpfRound != null ? { fpfRound: meta.fpfRound } : {}),
      ...(meta?.fpfFixtureId ? { fpfFixtureId: meta.fpfFixtureId } : {}),
    });
  });

  return out;
}

/**
 * Parse one FPF HTML document: `a.game-link` blocks + bare `#matches > div.game` rows.
 * Pass `roundMap` from the main competition page so each fragment gets the correct jornada number.
 */
export function parseFpfMatchesFromHtml(
  html: string,
  pageUrl: string,
  roundMap?: Map<string, number>
): LeagueImportedMatch[] {
  const fid = extractFpfFixtureIdFromUrl(pageUrl);
  const round = fid && roundMap ? roundMap.get(fid) : undefined;
  const meta: FpfMatchMeta = {
    ...(round != null ? { fpfRound: round } : {}),
    ...(fid ? { fpfFixtureId: fid } : {}),
  };
  const a = parseFpfGameLinksFromHtml(html, pageUrl, meta);
  const b = parseFpfBareGamesFromHtml(html, pageUrl, meta);
  return dedupeMatches([...a, ...b]);
}

const DEFAULT_FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-PT,pt;q=0.9,en-GB;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "https://resultados.fpf.pt/",
  Origin: "https://resultados.fpf.pt",
};

export type FetchFpfFixtureRoundsOptions = {
  /** Só estes `fixtureId` (subconjunto dos extraídos da página). Usado em pedidos chunked no cliente. */
  fixtureIds?: string[];
};

/**
 * Main competition pages often omit match rows (AJAX). Fetch each matchday fragment and merge.
 */
export async function fetchFpfMatchesFromFixtureRounds(
  mainHtml: string,
  competitionPageUrl: string,
  fetchImpl: typeof fetch,
  options?: FetchFpfFixtureRoundsOptions
): Promise<LeagueImportedMatch[]> {
  let host: string;
  try {
    host = new URL(competitionPageUrl).hostname.toLowerCase();
  } catch {
    return [];
  }
  if (!host.includes("resultados.fpf.pt")) return [];

  let ids = extractFpfFixtureIdsFromHtml(mainHtml);
  if (options?.fixtureIds?.length) {
    const allow = new Set(options.fixtureIds);
    ids = ids.filter((id) => allow.has(id));
  }
  if (ids.length === 0) return [];

  const roundMap = extractFpfFixtureRoundMapFromHtml(mainHtml);

  let origin: string;
  try {
    origin = new URL(competitionPageUrl).origin;
  } catch {
    origin = "https://resultados.fpf.pt";
  }

  const all: LeagueImportedMatch[] = [];
  const batchSize = 6;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const settled = await Promise.all(
      batch.map(async (fid) => {
        const u = `${origin}/Competition/GetClassificationAndMatchesByFixture?fixtureId=${fid}`;
        try {
          const r = await fetchImpl(u, {
            headers: DEFAULT_FETCH_HEADERS,
            cache: "no-store",
            redirect: "follow",
          });
          if (!r.ok) return [];
          const h = await r.text();
          return parseFpfMatchesFromHtml(h, u, roundMap);
        } catch {
          return [];
        }
      })
    );
    for (const arr of settled) all.push(...arr);
  }

  return dedupeMatches(all);
}

/**
 * Mantém apenas jogos em que o clube do perfil participa (casa ou fora).
 * Usa o mesmo critério que o calendário (`matchInvolvesResolvedClub`) para não
 * confundir clubes (substring / fuzzy) quando há lista de equipas da página.
 */
export function filterLeagueMatchesByClubName(
  matches: LeagueImportedMatch[],
  clubName: string | undefined,
  rosterNames?: string[]
): LeagueImportedMatch[] {
  const hint = clubName?.trim();
  if (!hint) return matches;
  const uniq =
    rosterNames && rosterNames.length > 0
      ? rosterNames
      : collectUniqueTeamNames({ tableRows: [], matches });
  return matches.filter((m) => matchInvolvesResolvedClub(m, hint, uniq));
}
