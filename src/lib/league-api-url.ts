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

export function isZeroZeroHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "zerozero.pt" || h.endsWith(".zerozero.pt") || h === "www.zerozero.pt";
}
