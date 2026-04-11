/**
 * Email(s) do dono / admin (painel /app/admin). Vercel: ADMIN_OWNER_EMAIL
 * Vários endereços: separar por vírgula, ponto e vírgula ou nova linha.
 * Nunca colocar palavra-passe no código — o login é o fluxo normal de registo/entrar.
 *
 * Fallback em código: conta bootstrap do produto (remove ou edita se forkares o repo).
 */
const BUILTIN_OWNER_ADMIN_EMAILS: string[] = ["sousa.2003pedro@gmail.com"];
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Gmail / Googlemail: o servidor ignora pontos no local-part e trata +tag.
 * Comparar só o string falha se um lado tiver pontos e o outro não.
 */
function normalizeGmailCanonical(email: string): string | null {
  const norm = normalizeAdminEmail(email);
  const at = norm.lastIndexOf("@");
  if (at < 1) return null;
  let local = norm.slice(0, at);
  const domain = norm.slice(at + 1);
  const d = domain === "googlemail.com" ? "gmail.com" : domain;
  if (d !== "gmail.com") return null;
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  local = local.replace(/\./g, "");
  return `${local}@${d}`;
}

function adminEmailsMatch(configured: string, userEmail: string): boolean {
  const a = normalizeAdminEmail(configured);
  const b = normalizeAdminEmail(userEmail);
  if (a === b) return true;
  const ga = normalizeGmailCanonical(configured);
  const gb = normalizeGmailCanonical(userEmail);
  if (ga && gb && ga === gb) return true;
  return false;
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Só variável de ambiente (para diagnósticos / métricas). */
export function parseAdminOwnerEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_OWNER_EMAIL;
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]+/)
    .map((p) => normalizeAdminEmail(stripQuotes(p)))
    .filter(Boolean);
}

function listAllAdminOwnerEmails(): string[] {
  const env = parseAdminOwnerEmailsFromEnv();
  const built = BUILTIN_OWNER_ADMIN_EMAILS.map((e) => normalizeAdminEmail(stripQuotes(e))).filter(Boolean);
  return [...new Set([...env, ...built])];
}

export function isOwnerAdminEmail(email: string): boolean {
  const allowed = listAllAdminOwnerEmails();
  return allowed.some((cfg) => adminEmailsMatch(cfg, email));
}
