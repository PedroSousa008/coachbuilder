import type { ParsedMatchEvent } from "@/types";

/**
 * Resultados de jogo usam hífen ou en-dash (4-1, 4 – 1), nunca ":".
 * ":" é sempre horário (ex. 20:30) → jogo ainda não disputado → não alterar tabela.
 */
const GOAL_SEP = String.raw`[-–]`;

/** Mesma linha: Equipa A 2-1 Equipa B */
const RESULT_INLINE_RE = new RegExp(
  `([A-Za-zÀ-ÿ0-9 .,'\\-()]+?)\\s+(\\d{1,2})\\s*${GOAL_SEP}\\s*(\\d{1,2})\\s+([A-Za-zÀ-ÿ0-9 .,'\\-()]+)`,
  "g"
);

/** Linha só com resultado: 4 - 1 (aceita decoradores OCR tipo ": 4-1 :"), nunca 20:30. */
const SCORE_ONLY_LINE = new RegExp(`^\\s*[:|;]?\\s*(\\d{1,2})\\s*${GOAL_SEP}\\s*(\\d{1,2})\\s*[:|;]?\\s*$`);

/** Linha com equipa da casa + resultado (visitante noutra linha): Sl Benfica 4 - 1 */
const HOME_AND_SCORE_LINE = new RegExp(`^(.+?)\\s+(\\d{1,2})\\s*${GOAL_SEP}\\s*(\\d{1,2})\\s*$`);

/** Máximo plausível por lado (evita OCR a partir horas "20:30" em "20 - 30" golos). */
const MAX_GOALS_PER_SIDE = 15;

function normalizeOcrBlock(s: string): string {
  return s.replace(/\r/g, "\n").replace(/[\t\f\v]+/g, " ").replace(/ *\n */g, "\n");
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Linha só com hora (20:30) — não é resultado. */
function isClockOnlyLine(s: string): boolean {
  return /^\d{1,2}:\d{2}\s*$/.test(collapse(s));
}

/** Qualquer "n:n" numa linha curta típica de hora (não tratar como golo). */
function lineContainsClockLikeToken(s: string): boolean {
  return /\b\d{1,2}:\d{2}\b/.test(collapse(s));
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
  if (isClockOnlyLine(t)) return false;
  if (SCORE_ONLY_LINE.test(t)) return false;
  if (isProbableDateLine(t)) return false;
  if (isProbableVenueLine(t)) return false;
  if (/^vs\.?$/i.test(t)) return false;
  return true;
}

function isPlausibleScore(homeGoals: number, awayGoals: number): boolean {
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return false;
  if (homeGoals < 0 || awayGoals < 0) return false;
  if (homeGoals > MAX_GOALS_PER_SIDE || awayGoals > MAX_GOALS_PER_SIDE) return false;
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
  if (!isPlausibleScore(homeGoals, awayGoals)) return;
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

/**
 * Equipas imediatamente acima do resultado (OCR de cima para baixo: casa, fora, golos).
 * `raw[0]` = mais perto do resultado (fora), `raw[raw.length-1]` = mais acima (casa).
 */
function collectTeamsAboveScore(lines: string[], scoreIndex: number): string[] {
  const raw: string[] = [];
  for (let j = scoreIndex - 1; j >= 0 && j >= scoreIndex - 14; j--) {
    const L = lines[j] ?? "";
    if (!L) continue;
    if (lineContainsClockLikeToken(L)) continue;
    if (isProbableDateLine(L)) continue;
    if (isProbableVenueLine(L)) break;
    if (j !== scoreIndex && SCORE_ONLY_LINE.test(L)) break;
    if (looksLikeTeamName(L)) raw.push(L);
    else if (raw.length) break;
  }
  return raw;
}

function findFirstTeamBelow(lines: string[], startIdx: number, endIdx: number): string {
  for (let j = startIdx; j < lines.length && j <= endIdx; j++) {
    const L = lines[j] ?? "";
    if (!L) continue;
    if (lineContainsClockLikeToken(L)) continue;
    if (isProbableDateLine(L)) continue;
    if (isProbableVenueLine(L)) continue;
    if (looksLikeTeamName(L)) return L;
  }
  return "";
}

/** OCR line: "SL Benfica 25 ABR Moreirense Fc" -> [home, away]. */
function splitTeamsAroundDateToken(line: string): [string, string] | null {
  const t = collapse(line);
  const m = t.match(/^(.+?)\s+\d{1,2}\s+[A-Za-zÀ-ÿ]{3,12}\s+(.+)$/);
  if (!m) return null;
  const left = collapse(m[1] ?? "");
  const right = collapse(m[2] ?? "");
  if (!looksLikeTeamName(left) || !looksLikeTeamName(right)) return null;
  if (left.toLowerCase() === right.toLowerCase()) return null;
  return [left, right];
}

/** Cartão jornada: Casa / Fora / 2 - 1 / data / estádio — ou Casa / 2 - 1 / Fora (Benfica). */
function parseMultilineScoreCard(lines: string[], seen: Set<string>, out: ParsedMatchEvent[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (lineContainsClockLikeToken(line)) continue;
    const scoreM = line.match(SCORE_ONLY_LINE);
    if (!scoreM) continue;
    const homeGoals = Number(scoreM[1]);
    const awayGoals = Number(scoreM[2]);
    if (!isPlausibleScore(homeGoals, awayGoals)) continue;

    const above = collectTeamsAboveScore(lines, i);
    let homeTeam = "";
    let awayTeam = "";

    if (above.length >= 2) {
      homeTeam = above[above.length - 1]!;
      awayTeam = above[above.length - 2]!;
    } else if (above.length === 1) {
      const split = splitTeamsAroundDateToken(above[0]!);
      if (split) {
        homeTeam = split[0];
        awayTeam = split[1];
      } else {
        homeTeam = above[0]!;
        awayTeam = findFirstTeamBelow(lines, i + 1, i + 18);
      }
    } else {
      for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
        const L = lines[j] ?? "";
        if (!L) continue;
        if (lineContainsClockLikeToken(L)) continue;
        if (looksLikeTeamName(L)) {
          homeTeam = L;
          break;
        }
      }
      awayTeam = findFirstTeamBelow(lines, i + 1, i + 18);
    }

    if (homeTeam && awayTeam && collapse(homeTeam).toLowerCase() !== collapse(awayTeam).toLowerCase()) {
      pushEvent(out, seen, homeTeam, awayTeam, homeGoals, awayGoals);
    }
  }
}

/** OCR: "Sl Benfica 4 - 1" numa linha e "Moreirense Fc" noutra (com lixo no meio). */
function parseHomeScoreThenAwayBelow(lines: string[], seen: Set<string>, out: ParsedMatchEvent[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (lineContainsClockLikeToken(line)) continue;
    const m = line.match(HOME_AND_SCORE_LINE);
    if (!m) continue;
    const rawHome = (m[1] ?? "").trim();
    const homeGoals = Number(m[2]);
    const awayGoals = Number(m[3]);
    if (!looksLikeTeamName(rawHome)) continue;
    if (!isPlausibleScore(homeGoals, awayGoals)) continue;

    let awayTeam = "";
    for (let j = i + 1; j < lines.length && j <= i + 12; j++) {
      const L = lines[j] ?? "";
      if (!L) continue;
      if (lineContainsClockLikeToken(L)) continue;
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
