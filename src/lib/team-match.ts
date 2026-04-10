/**
 * Fuzzy team-name matching so coach input ("Dumiense", "Fafe", "ninense")
 * maps to official league names ("Ad Ninense", "Ad Fafe") without calling an external LLM.
 */

/** Common Portuguese club prefixes — stripped to compare the “core” name (e.g. Ninense vs Dumiense). */
const CLUB_PREFIX_TOKENS = new Set([
  "ad",
  "fc",
  "sc",
  "gd",
  "cd",
  "cf",
  "ccd",
  "ac",
  "uf",
  "sad",
  "v",
  "g",
]);

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

/** “Ad Ninense” → “ninense”; “Dumiense” → “dumiense” */
export function coreClubName(s: string): string {
  const n = normalizeTeamLabel(s);
  const parts = n.split(" ").filter((p) => p.length > 0);
  const rest = parts.filter((p) => !CLUB_PREFIX_TOKENS.has(p));
  return rest.join(" ") || n;
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

export function collectUniqueTeamNames(args: {
  tableRows: { team: string }[];
  matches: { homeTeam: string; awayTeam: string }[];
}): string[] {
  const s = new Set<string>();
  for (const r of args.tableRows) {
    if (r.team.trim()) s.add(r.team.trim());
  }
  for (const m of args.matches) {
    if (m.homeTeam.trim()) s.add(m.homeTeam.trim());
    if (m.awayTeam.trim()) s.add(m.awayTeam.trim());
  }
  return [...s];
}

/**
 * Returns 0–1 similarity. Higher = more likely the same club.
 */
export function teamNameSimilarity(userInput: string, officialName: string): number {
  const u = normalizeTeamLabel(userInput);
  const o = normalizeTeamLabel(officialName);
  if (!u.length || !o.length) return 0;
  if (u === o) return 1;

  const uc = coreClubName(userInput);
  const oc = coreClubName(officialName);
  if (uc.length >= 4 && oc.length >= 4) {
    const distCore = levenshtein(uc, oc);
    const rCore = 1 - distCore / Math.max(uc.length, oc.length);
    if (rCore >= 0.55) return Math.max(rCore, 0.8);
  }

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
  if (best && best.score >= 0.42) return best;
  return null;
}

/**
 * Resolves the coach’s spelling (e.g. “Dumiense”) against all names on the page, then checks if `officialTeam`
 * is that club — fixes typos vs the wrong fuzzy target.
 */
export function userClubMatchesOfficialTeam(
  userInput: string,
  officialTeam: string,
  allTeamNames: string[]
): boolean {
  const u = userInput.trim();
  if (!u.length) return false;
  const uniq = [...new Set(allTeamNames.map((x) => x.trim()).filter(Boolean))];
  if (uniq.length === 0) return teamNamesMatch(u, officialTeam);

  const best = pickBestTeamMatch(u, uniq);
  if (best) {
    if (normalizeTeamLabel(best.name) === normalizeTeamLabel(officialTeam)) return true;
    if (teamNameSimilarity(best.name, officialTeam) >= 0.9) return true;
  }
  return teamNamesMatch(u, officialTeam);
}
