import { isOwnerAdminEmail } from "@/lib/admin-owner";

/** Conta bootstrap / dono (ex.: Treinadores + edição na página pública Treinador do Mês). */
export function canUseOwnerCoachTools(email: string | null | undefined): boolean {
  return Boolean(email?.trim() && isOwnerAdminEmail(email));
}
