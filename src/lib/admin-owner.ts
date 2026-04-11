/**
 * Email do dono / admin (único painel). Definir na Vercel: ADMIN_OWNER_EMAIL
 * Nunca colocar palavra-passe no código — o login é o fluxo normal de registo/entrar.
 */
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isOwnerAdminEmail(email: string): boolean {
  const configured = process.env.ADMIN_OWNER_EMAIL?.trim().toLowerCase();
  if (!configured) return false;
  return normalizeAdminEmail(email) === configured;
}
