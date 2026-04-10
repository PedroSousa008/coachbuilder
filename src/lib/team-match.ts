/**
 * Fuzzy team-name matching so coach input ("Dumiense", "Fafe", "ninense")
 * maps to official league names ("Ad Ninense", "Ad Fafe") without calling an external LLM.
 */

export function normalizeTeamLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactAlphaNum(s: string): string {
  return normalizeTeamLabel(s).replace(/\s+/g, "");
}

/** Levenshtein distance (small strings only). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n]!;
}

/**
 * Returns 0–1 similarity. Higher = more likely the same club.
 */
export function teamNameSimilarity(userInput: string, officialName: string): number {
  const u = normalizeTeamLabel(userInput);
  const o = normalizeTeamLabel(officialName);
  if (!u.length || !o.length) return 0;
  if (u === o) return 1;

  const cu = compactAlphaNum(userInput);
  const co = compactAlphaNum(officialName);
  if (cu.length >= 3 && co.length >= 3) {
    if (co.includes(cu) || cu.includes(co)) return 0.95;
    for (const part of u.split(" ").filter((t) => t.length >= 4)) {
      if (co.includes(part) || part.includes(co.slice(0, Math.min(6, co.length)))) return 0.82;
    }
    const dist = levenshtein(cu, co);
    const ratio = 1 - dist / Math.max(cu.length, co.length);
    if (ratio >= 0.72) return ratio;
  }

  const uTokens = u.split(" ").filter((t) => t.length >= 2);
  const oTokens = o.split(" ");
  if (uTokens.length === 0) return 0;
  let hits = 0;
  for (const ut of uTokens) {
    if (oTokens.some((ot) => ot === ut || (ut.length >= 3 && (ot.includes(ut) || ut.includes(ot))))) {
      hits++;
    }
  }
  if (hits === uTokens.length) return 0.88;

  const dist2 = levenshtein(u.replace(/\s/g, ""), o.replace(/\s/g, ""));
  return Math.max(0, 1 - dist2 / Math.max(u.length, o.length));
}

/** True if user label likely refers to this official team name. */
export function teamNamesMatch(userInput: string, officialName: string, threshold = 0.52): boolean {
  return teamNameSimilarity(userInput, officialName) >= threshold;
}

export function pickBestTeamMatch(
  userInput: string,
  candidates: string[]
): { name: string; score: number } | null {
  if (!userInput.trim() || candidates.length === 0) return null;
  let best: { name: string; score: number } | null = null;
  for (const c of candidates) {
    const score = teamNameSimilarity(userInput, c);
    if (!best || score > best.score) best = { name: c, score };
  }
  if (best && best.score >= 0.55) return best;
  return null;
}
