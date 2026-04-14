import type { AuthUser } from "@/types/auth";

/**
 * Conta local (sem `subscriptionPlan` da cloud) mantém acesso total para desenvolvimento.
 * Conta cloud: usa `subscriptionAccess.hasProAccess` (exceto admin / email owner no env).
 */
export function hasFullWorkspaceAccess(user: AuthUser | null, ownerEmailListedInEnv: boolean): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (ownerEmailListedInEnv) return true;
  if (!user.subscriptionPlan && !user.subscriptionAccess) return true;
  return user.subscriptionAccess?.hasProAccess === true;
}
