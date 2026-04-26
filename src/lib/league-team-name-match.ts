import type { StandingsTeamRow } from "@/types";

/** Lowercase, strip accents, collapse whitespace, drop common club prefixes for comparison. */
export function compactTeamName(raw: string): string {
  let s = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  s = s.replace(
    /\b(fc|sc|sl|cd|gd|cf|afc|ac|ad|ud|us|sv|cfp|cdf|cdp|gdch|scu|scd|bc|bk)\b/g,
    ""
  );
  return s.replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

/** 0…1 — higher is a better match (e.g. SL Benfica vs Benfica). */
export function scoreTeamMatch(ocrOrA: string, tableOrB: string): number {
  const A = compactTeamName(ocrOrA);
  const B = compactTeamName(tableOrB);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.9;
  const maxLen = Math.max(A.length, B.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(A, B);
  return Math.max(0, 1 - dist / maxLen);
}

export function teamNamesLikelyMatch(a: string, b: string, minScore = 0.42): boolean {
  return scoreTeamMatch(a, b) >= minScore;
}

const ROW_MATCH_MIN = 0.38;

/** Best standings row for OCR text, or null if confidence is too low. */
export function findBestStandingsRowForOcr(ocrName: string, rows: StandingsTeamRow[]): StandingsTeamRow | null {
  const trimmed = ocrName.trim();
  if (!trimmed) return null;
  let best: StandingsTeamRow | null = null;
  let bestScore = 0;
  for (const r of rows) {
    if (!r.team.trim()) continue;
    const s = scoreTeamMatch(trimmed, r.team);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  if (!best || bestScore < ROW_MATCH_MIN) return null;
  return best;
}
