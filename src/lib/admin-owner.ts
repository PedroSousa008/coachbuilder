/**
 * Email(s) do dono / admin (painel /app/admin). Vercel: ADMIN_OWNER_EMAIL
 * Vários endereços: separar por vírgula, ponto e vírgula ou nova linha.
 * Nunca colocar palavra-passe no código — o login é o fluxo normal de registo/entrar.
 */
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Lista de emails admin configurados no servidor (normalizados). */
export function parseAdminOwnerEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_OWNER_EMAIL;
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((p) => normalizeAdminEmail(stripQuotes(p)))
    .filter(Boolean);
}

export function isOwnerAdminEmail(email: string): boolean {
  const allowed = parseAdminOwnerEmailsFromEnv();
  if (allowed.length === 0) return false;
  return allowed.includes(normalizeAdminEmail(email));
}
