/** Email injetado no build (next.config); comparação com Gmail-aware no cliente. */

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function gmailCanon(email: string): string | null {
  const n = norm(email);
  const at = n.lastIndexOf("@");
  if (at < 1) return null;
  let local = n.slice(0, at);
  const dom = n.slice(at + 1);
  const d = dom === "googlemail.com" ? "gmail.com" : dom;
  if (d !== "gmail.com") return null;
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  local = local.replace(/\./g, "");
  return `${local}@${d}`;
}

function emailsMatch(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (x === y) return true;
  const gx = gmailCanon(x);
  const gy = gmailCanon(y);
  return Boolean(gx && gy && gx === gy);
}

/** Mostrar link Admin / permitir /app/admin antes da sessão refletir role no cliente. */
export function clientEmailShowsAdminNav(email: string | undefined | null): boolean {
  const cfg = process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL?.trim();
  if (!email?.trim() || !cfg) return false;
  return emailsMatch(cfg, email);
}
