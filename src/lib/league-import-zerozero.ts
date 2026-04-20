import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type { LeagueImportedMatch, LeagueTableRow } from "@/types";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import { extractSeasonYearsFromHtml } from "@/lib/league-import-fpf";
import { wallClockLisbonToUtcIso } from "@/lib/lisbon-date";
import type { ZeroZeroFetch } from "@/lib/fetch-zerozero-session";

type LoadedCheerio = ReturnType<typeof cheerio.load>;
type CheerioSel = Cheerio<AnyNode>;

/**
 * Fetch all jornada pages in parallel (wall-clock ~1 slow request, not 10+ sequential waves).
 * Required for Vercel Hobby (~10s serverless cap); serial batches were exceeding the limit → 502.
 */
const ZEROZERO_FETCH_CONCURRENCY = 30;

export function isZeroZeroHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "zerozero.pt" || h.endsWith(".zerozero.pt") || h === "www.zerozero.pt";
}

export function extractZeroZeroCompetitionLabel(html: string): string | null {
  const $ = cheerio.load(html);
  const h1 = $("h1.zz-ty-page-main").first().text().trim();
  if (h1 && h1.length > 2) return h1.replace(/\s+/g, " ").slice(0, 120);
  const title = $("title").first().text().trim();
  if (title && title.length > 3) return title.replace(/\s+/g, " ").replace(/\s*-\s*zerozero.*$/i, "").slice(0, 120);
  return null;
}

/** id_edicao + fase from hidden inputs, links, or dataLayer. */
export function extractZeroZeroEditionParams(html: string): { idEdicao: string; fase: string } | null {
  const $ = cheerio.load(html);
  const idE = $('input[name="id_edicao"]').attr("value")?.trim();
  const fase = $('input[name="fase"]').attr("value")?.trim();
  if (idE && fase) return { idEdicao: idE, fase };

  const fromHidden = html.match(/name=["']id_edicao["'][^>]*value=["'](\d+)["']/i);
  const faseHidden = html.match(/name=["']fase["'][^>]*value=["'](\d+)["']/i);
  if (fromHidden?.[1] && faseHidden?.[1]) {
    return { idEdicao: fromHidden[1], fase: faseHidden[1] };
  }

  const siteId = html.match(/siteid["']:\s*["']edicao_(\d+)["']/i);
  const faseLink = html.match(/[?&]fase=(\d+)/i);
  const edicaoPath = html.match(/\/edicao\/[^"'\\\s]+\/(\d+)/i);
  if (edicaoPath?.[1] && faseLink?.[1]) {
    return { idEdicao: edicaoPath[1], fase: faseLink[1] };
  }
  if (siteId?.[1] && faseLink?.[1]) {
    return { idEdicao: siteId[1], fase: faseLink[1] };
  }

  const editionPhp = html.match(/[?&]id_edicao=(\d+)[^"'\\\s]*[&?]fase=(\d+)/i);
  if (editionPhp?.[1] && editionPhp[2]) {
    return { idEdicao: editionPhp[1], fase: editionPhp[2] };
  }

  return null;
}

export function extractMaxJornadaFromHtml(html: string): number {
  let max = 0;
  const $ = cheerio.load(html);
  $('select[name="jornada_in"] option[value]').each((_, el) => {
    const v = parseInt($(el).attr("value") ?? "", 10);
    if (Number.isFinite(v) && v > max) max = v;
  });
  return max;
}

/**
 * ZeroZero classification: `#edition_table table.zz-datatable` — P, J, V, E, D, GM, GS, DG.
 */
export function parseZeroZeroStandings(html: string): LeagueTableRow[] {
  const $ = cheerio.load(html);
  const table = $("#edition_table table.zz-datatable").first();
  if (!table.length) return [];

  const out: LeagueTableRow[] = [];
  table.find("tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const tds = $tr.find("> td");
    if (tds.length < 10) return;

    const posRaw = $(tds[0]).text().replace(/[^\d]/g, "");
    const position = posRaw ? parseInt(posRaw, 10) : NaN;
    if (!Number.isFinite(position)) return;

    const $teamCell = $(tds[2]);
    const nameLink = $teamCell.find("a").first();
    let team = nameLink.length ? nameLink.text().trim() : $teamCell.text().trim();
    const suf = $teamCell.find("span.small_faded").first().text().trim();
    if (suf) team = `${team} ${suf}`.replace(/\s+/g, " ").trim();

    const points = parseInt($(tds[3]).text().replace(/[^\d-]/g, ""), 10);
    const played = parseInt($(tds[4]).text().replace(/[^\d]/g, ""), 10);
    const won = parseInt($(tds[5]).text().replace(/[^\d]/g, ""), 10);
    const drawn = parseInt($(tds[6]).text().replace(/[^\d]/g, ""), 10);
    const lost = parseInt($(tds[7]).text().replace(/[^\d]/g, ""), 10);
    const goalsFor = parseInt($(tds[8]).text().replace(/[^\d]/g, ""), 10);
    const goalsAgainst = parseInt($(tds[9]).text().replace(/[^\d]/g, ""), 10);
    const dgText = $(tds[10]).text().trim();
    let goalDifference: number | undefined;
    const dgM = dgText.match(/[+-]?\d+/);
    if (dgM) goalDifference = parseInt(dgM[0]!, 10);

    const cells: string[] = [];
    tds.each((__, td) => {
      cells.push($(td).text().trim().replace(/\s+/g, " "));
    });

    out.push({
      position,
      team: team.slice(0, 80),
      played: Number.isFinite(played) ? played : undefined,
      won: Number.isFinite(won) ? won : undefined,
      drawn: Number.isFinite(drawn) ? drawn : undefined,
      lost: Number.isFinite(lost) ? lost : undefined,
      goalsFor: Number.isFinite(goalsFor) ? goalsFor : undefined,
      goalsAgainst: Number.isFinite(goalsAgainst) ? goalsAgainst : undefined,
      goalDifference,
      points: Number.isFinite(points) ? points : undefined,
      cells,
    });
  });

  return out.slice(0, 40);
}

function parseJogoPathDate(href: string): { y: number; m: number; d: number } | null {
  const m = href.match(/\/jogo\/(\d{4})-(\d{2})-(\d{2})-/i);
  if (!m) return null;
  return { y: parseInt(m[1]!, 10), m: parseInt(m[2]!, 10), d: parseInt(m[3]!, 10) };
}

function inferYearForMonth(month1: number, seasonStart: number, seasonEnd: number): number {
  const monthIdx = month1 - 1;
  return monthIdx >= 7 ? seasonStart : seasonEnd;
}

function parseDdMmYear(
  ddmm: string,
  seasonStart: number,
  seasonEnd: number
): { y: number; m: number; d: number } | null {
  const m = ddmm.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const d = parseInt(m[1]!, 10);
  const month1 = parseInt(m[2]!, 10);
  if (d < 1 || d > 31 || month1 < 1 || month1 > 12) return null;
  const y = inferYearForMonth(month1, seasonStart, seasonEnd);
  return { y, m: month1, d };
}

function firstJogoHref($mid: CheerioSel): string {
  const a = $mid.find('a[href*="/jogo/"]').first();
  const href = (a.attr("href") ?? "").trim();
  return href;
}

function parseZeroZeroFixtureRow(
  $: LoadedCheerio,
  $tr: CheerioSel,
  dateCarry: string,
  seasonStart: number,
  seasonEnd: number,
  round: number,
  pageUrl: string
): LeagueImportedMatch | null {
  const tds = $tr.find("> td");
  if (tds.length < 6) return null;

  const dateCell = $(tds[0]).text().trim();
  let activeDate = dateCarry;
  if (/^\d{1,2}\/\d{1,2}$/.test(dateCell)) activeDate = dateCell;

  const $homeTd = $(tds[1]);
  const $awayTd = $(tds[5]);
  const home = buildTeamLabel($, $homeTd);
  const away = buildTeamLabel($, $awayTd);
  if (!home || !away) return null;

  const $mid = $(tds[3]);
  const href = firstJogoHref($mid);
  if (!href.includes("/jogo/")) return null;

  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "https://www.zerozero.pt";
  }
  const absGame =
    href.startsWith("http") ? href : `${origin}${href.startsWith("/") ? "" : "/"}${href}`;

  const pathDate = parseJogoPathDate(href);
  const midText = $mid.text().replace(/\s+/g, " ").trim();

  let homeScore: number | undefined;
  let awayScore: number | undefined;
  const scoreM = midText.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (scoreM) {
    homeScore = parseInt(scoreM[1]!, 10);
    awayScore = parseInt(scoreM[2]!, 10);
  }

  let hour = 15;
  let minute = 0;
  const hm = midText.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    hour = parseInt(hm[1]!, 10);
    minute = parseInt(hm[2]!, 10);
  }

  let y: number;
  let m: number;
  let d: number;
  if (pathDate) {
    ({ y, m, d } = pathDate);
  } else if (activeDate && /^\d{1,2}\/\d{1,2}$/.test(activeDate)) {
    const inferred = parseDdMmYear(activeDate, seasonStart, seasonEnd);
    if (!inferred) return null;
    ({ y, m, d } = inferred);
  } else {
    return null;
  }

  if (/\b(ADI|ANU|ADIA|CAN)\b/i.test(midText) || midText === "") {
    hour = 12;
    minute = 0;
  }

  const kickoff = wallClockLisbonToUtcIso(y, m, d, hour, minute);
  if (!kickoff) return null;

  const matchId = href.match(/\/(\d+)\s*$/i)?.[1];
  const id = matchId ? `zz-${matchId}` : `zz-${home}-${away}-${kickoff}`;

  return {
    id,
    matchId,
    homeTeam: home,
    awayTeam: away,
    kickoff,
    homeScore,
    awayScore,
    sourceUrl: absGame,
    fpfRound: round,
  };
}

function buildTeamLabel($: LoadedCheerio, $td: CheerioSel): string {
  const $a = $td.find("a").first();
  let name = $a.length ? $a.text().trim() : $td.text().trim();
  const suf = $td.find("span.small_faded").first().text().trim();
  if (suf) name = `${name} ${suf}`;
  return name.replace(/\s+/g, " ").trim();
}

/**
 * Parse `#fixture_games` blocks whose header matches `JORNADA {expectedRound}`.
 */
export function parseZeroZeroMatchesFromHtml(
  html: string,
  pageUrl: string,
  expectedRound: number
): LeagueImportedMatch[] {
  const $ = cheerio.load(html);
  const { start: y1, end: y2 } = extractSeasonYearsFromHtml(html);
  const out: LeagueImportedMatch[] = [];

  $("#fixture_games").each((_, fg) => {
    const $card = $(fg).closest(".card-data__body");
    const header = $card.find("h3.smallheader").first().text().replace(/\s+/g, " ").trim();
    const rm = header.match(/JORNADA\s+(\d+)/i);
    const blockRound = rm ? parseInt(rm[1]!, 10) : NaN;
    if (!Number.isFinite(blockRound) || blockRound !== expectedRound) return;

    let dateCarry = "";
    $(fg)
      .find("table.zztable.stats tbody tr")
      .each((__, tr) => {
        const row = parseZeroZeroFixtureRow($, $(tr), dateCarry, y1, y2, expectedRound, pageUrl);
        if (row) {
          out.push(row);
          const dc = $(tr).find("> td").first().text().trim();
          if (/^\d{1,2}\/\d{1,2}$/.test(dc)) dateCarry = dc;
        }
      });
  });

  return dedupeMatches(out);
}

export async function fetchZeroZeroMatchesForAllRounds(
  mainHtml: string,
  pageUrl: string,
  fetchImpl: ZeroZeroFetch
): Promise<LeagueImportedMatch[]> {
  const params = extractZeroZeroEditionParams(mainHtml);
  if (!params) return [];
  const edition = params;

  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    origin = "https://www.zerozero.pt";
  }

  const maxJ = extractMaxJornadaFromHtml(mainHtml);
  if (maxJ < 1) return [];

  const jornadas = Array.from({ length: maxJ }, (_, i) => i + 1);

  async function fetchOneRound(j: number): Promise<LeagueImportedMatch[]> {
    const u = `${origin}/edition.php?id_edicao=${encodeURIComponent(edition.idEdicao)}&fase=${encodeURIComponent(edition.fase)}&jornada_in=${j}`;
    try {
      const r = await fetchImpl(u, {
        cache: "no-store",
        redirect: "follow",
        headers: { Referer: pageUrl },
      });
      if (!r.ok) return [];
      const h = await r.text();
      return parseZeroZeroMatchesFromHtml(h, u, j);
    } catch {
      return [];
    }
  }

  const all: LeagueImportedMatch[] = [];
  for (let i = 0; i < jornadas.length; i += ZEROZERO_FETCH_CONCURRENCY) {
    const slice = jornadas.slice(i, i + ZEROZERO_FETCH_CONCURRENCY);
    const settled = await Promise.all(slice.map((j) => fetchOneRound(j)));
    for (const arr of settled) all.push(...arr);
  }

  return dedupeMatches(all);
}
