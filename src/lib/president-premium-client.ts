import type { AuthUser } from "@/types/auth";

/**
 * Presidente em conta cloud sem PresidentPro activo (trial/grace expirados, plano free).
 * Contas só-local (sem `subscriptionPlan` / `subscriptionAccess`) mantêm acesso para desenvolvimento.
 */
export function isPresidentPremiumLocked(user: AuthUser | null, ownerEmailListedInEnv: boolean): boolean {
  if (!user || user.coachingRole !== "club-president") return false;
  if (user.role === "admin") return false;
  if (ownerEmailListedInEnv) return false;
  if (!user.subscriptionPlan && !user.subscriptionAccess) return false;
  return user.subscriptionAccess?.hasProAccess !== true;
}
