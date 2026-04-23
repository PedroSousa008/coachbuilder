import type { AuthUser } from "@/types/auth";
import { isClubPresident } from "@/lib/president-mode";

/**
 * Conta local (sem `subscriptionPlan` da cloud) mantém acesso total para desenvolvimento.
 * Conta cloud: usa `subscriptionAccess.hasProAccess` (exceto admin / email owner no env).
 * Presidente: acesso ao modo clube premium (área `/app/president/*`); lógica de cobrança segue no servidor.
 */
export function hasFullWorkspaceAccess(user: AuthUser | null, ownerEmailListedInEnv: boolean): boolean {
  if (!user) return false;
  if (isClubPresident(user)) return true;
  if (user.role === "admin") return true;
  if (ownerEmailListedInEnv) return true;
  if (!user.subscriptionPlan && !user.subscriptionAccess) return true;
  return user.subscriptionAccess?.hasProAccess === true;
}
