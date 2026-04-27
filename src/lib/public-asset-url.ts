/**
 * Encode each segment of a site-relative path (`/videos/...`) so filenames with
 * Unicode (and NFC vs NFD differences on disk vs URL) resolve reliably over HTTP.
 */
export function encodeLocalPublicPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return trimmed;
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  return `/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
}
