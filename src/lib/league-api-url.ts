/**
 * URL allowlist / host checks for league import API routes.
 * Kept separate from cheerio-heavy parsers so serverless handlers stay light (avoids 502 on cold start).
 */

export function isAllowedLeagueTableUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".localhost")) return false;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * resultados.fpf.pt competition URLs must include a numeric competitionId or the server fetch may hang / waste quota.
 */
export function validateFpfCompetitionUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (!u.hostname.toLowerCase().includes("resultados.fpf.pt")) return null;
    if (!u.pathname.toLowerCase().includes("/competition/")) return null;
    const id = u.searchParams.get("competitionId");
    if (!id || !/^\d+$/.test(id.trim())) {
      return "Incomplete FPF URL: copy the full address from the browser — it must include competitionId= followed by numbers (not empty).";
    }
    return null;
  } catch {
    return null;
  }
}
