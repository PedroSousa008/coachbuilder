import type { ParsedMatchEvent } from "@/types";

/** Mesma linha: Equipa A 2-1 Equipa B */
const RESULT_INLINE_RE =
  /([A-Za-zÀ-ÿ0-9 .'\-()]+?)\s+(\d{1,2})\s*[-–:xX]\s*(\d{1,2})\s+([A-Za-zÀ-ÿ0-9 .'\-()]+)/g;

/** Linha só com resultado: 4 - 1 */
const SCORE_ONLY_LINE = /^\s*(\d{1,2})\s*[-–:xX]\s*(\d{1,2})\s*$/;

/** Linha com equipa da casa + resultado (visitante noutra linha): Sl Benfica 4 - 1 */
const HOME_AND_SCORE_LINE = /^(.+?)\s+(\d{1,2})\s*[-–:xX]\s*(\d{1,2})\s*$/;

function normalizeOcrBlock(s: string): string {
  return s.replace(/\r/g, "\n").replace(/[\t\f\v]+/g, " ").replace(/ *\n */g, "\n");
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function isProbableDateLine(s: string): boolean {
  const t = collapse(s);
  return /^\d{1,2}\s+[A-Za-zÀ-ÿ]{3,12}$/i.test(t);
}

function isProbableVenueLine(s: string): boolean {
  const t = collapse(s).toLowerCase();
  if (t.startsWith("estádio") || t.startsWith("estadio")) return true;
  if (t.includes("sport lisboa") && t.includes("benfica")) return true;
  return false;
}

function looksLikeTeamName(s: string): boolean {
  const t = collapse(s);
  if (t.length < 2) return false;
  if (!/[a-zà-ÿ]/i.test(t)) return false;
  if (SCORE_ONLY_LINE.test(t)) return false;
  if (isProbableDateLine(t)) return false;
  if (isProbableVenueLine(t)) return false;
  if (/^vs\.?$/i.test(t)) return false;
  return true;
}

function pushEvent(
  out: ParsedMatchEvent[],
  seen: Set<string>,
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number
): void {
  const h = collapse(homeTeam);
  const a = collapse(awayTeam);
  if (!h || !a) return;
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;
  const key = `${h.toLowerCase()}|${a.toLowerCase()}|${homeGoals}-${awayGoals}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push({
    homeTeam: h,
    awayTeam: a,
    homeGoals,
    awayGoals,
    source: "image",
  });
}

/** Cartão tipo: equipa casa (linha) / 4 - 1 / data / estádio / equipa fora. */
function parseMultilineScoreCard(lines: string[], seen: Set<string>, out: ParsedMatchEvent[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const scoreM = line.match(SCORE_ONLY_LINE);
    if (!scoreM) continue;
    const homeGoals = Number(scoreM[1]);
    const awayGoals = Number(scoreM[2]);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;

    let homeTeam = "";
    for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
      const L = lines[j] ?? "";
      if (!L) continue;
      if (looksLikeTeamName(L)) {
        homeTeam = L;
        break;
      }
    }

    let awayTeam = "";
    for (let j = i + 1; j < lines.length && j <= i + 15; j++) {
      const L = lines[j] ?? "";
      if (!L) continue;
      if (looksLikeTeamName(L)) {
        awayTeam = L;
        break;
      }
    }

    if (homeTeam && awayTeam) {
      pushEvent(out, seen, homeTeam, awayTeam, homeGoals, awayGoals);
    }
  }
}

/** OCR: "Sl Benfica 4 - 1" numa linha e "Moreirense Fc" noutra (com lixo no meio). */
function parseHomeScoreThenAwayBelow(lines: string[], seen: Set<string>, out: ParsedMatchEvent[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = line.match(HOME_AND_SCORE_LINE);
    if (!m) continue;
    const rawHome = (m[1] ?? "").trim();
    const homeGoals = Number(m[2]);
    const awayGoals = Number(m[3]);
    if (!looksLikeTeamName(rawHome)) continue;
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) continue;

    let awayTeam = "";
    for (let j = i + 1; j < lines.length && j <= i + 12; j++) {
      const L = lines[j] ?? "";
      if (!L) continue;
      if (looksLikeTeamName(L) && collapse(L).toLowerCase() !== collapse(rawHome).toLowerCase()) {
        awayTeam = L;
        break;
      }
    }
    if (awayTeam) {
      pushEvent(out, seen, rawHome, awayTeam, homeGoals, awayGoals);
    }
  }
}

function parseInlineMatches(text: string, seen: Set<string>, out: ParsedMatchEvent[]): void {
  RESULT_INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RESULT_INLINE_RE.exec(text)) !== null) {
    const homeTeam = (m[1] ?? "").replace(/\s+/g, " ").trim();
    const awayTeam = (m[4] ?? "").replace(/\s+/g, " ").trim();
    const homeGoals = Number(m[2]);
    const awayGoals = Number(m[3]);
    pushEvent(out, seen, homeTeam, awayTeam, homeGoals, awayGoals);
  }
}

export function parseMatchEventsFromOcrText(ocrText: string): ParsedMatchEvent[] {
  const text = normalizeOcrBlock(ocrText);
  const lines = text
    .split("\n")
    .map((l) => collapse(l))
    .filter((l) => l.length > 0);

  const seen = new Set<string>();
  const out: ParsedMatchEvent[] = [];

  parseInlineMatches(text, seen, out);
  parseMultilineScoreCard(lines, seen, out);
  parseHomeScoreThenAwayBelow(lines, seen, out);

  return out;
}
