import * as cheerio from "cheerio";
import type { LeagueImportedMatch } from "@/types";
import { dedupeMatches } from "@/lib/league-match-dedupe";

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
  const m = raw.match(/^(\d{1,2})\s+(?:de\s+)?([a-záàãâéêíóôõúç]+)/u);
  if (!m) return null;
  const day = parseInt(m[1]!, 10);
  const monNorm = m[2]!.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const key = monNorm.slice(0, 3) as keyof typeof MONTHS_PT;
  const monthIdx = MONTHS_PT[key];
  if (monthIdx === undefined || day < 1 || day > 31) return null;

  const year = monthIdx >= 7 ? seasonYearStart : seasonYearEnd;
  const hm = raw.match(/(\d{1,2}):(\d{2})/);
  const hour = hm ? parseInt(hm[1]!, 10) : 15;
  const min = hm ? parseInt(hm[2]!, 10) : 0;
  const d = new Date(year, monthIdx, day, hour, min, 0);
  return d.toISOString();
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
  const re = /GetClassificationAndMatchesByFixture\?fixtureId=(\d+)/gi;
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    ids.push(m[1]!);
  }
  return [...new Set(ids)];
}

/** fixtureId → jornada label (1…34) from the numbered tabs on the competition page. */
export function extractFpfFixtureRoundMapFromHtml(html: string): Map<string, number> {
  const map = new Map<string, number>();
  const re = /GetClassificationAndMatchesByFixture\?fixtureId=(\d+)"[^>]*>\s*(\d+)\s*<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    map.set(m[1]!, parseInt(m[2]!, 10));
  }
  return map;
}

export function extractFpfFixtureIdFromUrl(pageUrl: string): string | undefined {
  return pageUrl.match(/[?&]fixtureId=(\d+)/i)?.[1];
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
};

/**
 * Main competition pages often omit match rows (AJAX). Fetch each matchday fragment and merge.
 */
export async function fetchFpfMatchesFromFixtureRounds(
  mainHtml: string,
  competitionPageUrl: string,
  fetchImpl: typeof fetch
): Promise<LeagueImportedMatch[]> {
  let host: string;
  try {
    host = new URL(competitionPageUrl).hostname.toLowerCase();
  } catch {
    return [];
  }
  if (!host.includes("resultados.fpf.pt")) return [];

  const ids = extractFpfFixtureIdsFromHtml(mainHtml);
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
