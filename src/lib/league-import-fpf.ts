import * as cheerio from "cheerio";
import type { LeagueImportedMatch } from "@/types";

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
 * FPF shows dates like "20 mai", "21 dez", "25 fev". Season is e.g. 2025-2026:
 * Aug–Dec → first year; Jan–Jul → second year.
 */
export function parsePortugueseScheduleToIso(
  scheduleText: string,
  seasonYearStart: number,
  seasonYearEnd: number
): string | null {
  const t = scheduleText.trim().toLowerCase();
  const m = t.match(/^(\d{1,2})\s+(?:de\s+)?([a-záàãâéêíóôõúç]+)/u);
  if (!m) return null;
  const day = parseInt(m[1]!, 10);
  const monNorm = m[2]!.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const key = monNorm.slice(0, 3) as keyof typeof MONTHS_PT;
  const monthIdx = MONTHS_PT[key];
  if (monthIdx === undefined || day < 1 || day > 31) return null;

  const year = monthIdx >= 7 ? seasonYearStart : seasonYearEnd;
  const d = new Date(year, monthIdx, day, 15, 0, 0);
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

/**
 * Parse FPF competition page: all `a.game-link` match blocks (jogos passados e futuros).
 */
export function parseFpfMatchesFromHtml(html: string, pageUrl: string): LeagueImportedMatch[] {
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

    const game = $(el).find("div.game").first();
    const home = game.find(".home-team").first().text().trim().replace(/\s+/g, " ");
    const away = game.find(".away-team").first().text().trim().replace(/\s+/g, " ");
    const scoreSpan = game.find(".score > span").first();
    const scoreText = scoreSpan.text().trim();
    const scheduleText = game.find(".game-schedule").first().text().trim();

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    const sm = scoreText.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (sm) {
      homeScore = parseInt(sm[1]!, 10);
      awayScore = parseInt(sm[2]!, 10);
    }

    const kickoff = parsePortugueseScheduleToIso(scheduleText, y1, y2);
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
    });
  });

  out.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
  return out;
}
