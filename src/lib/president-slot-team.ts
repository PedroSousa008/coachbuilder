import type { PresidentCoach, PresidentEquipasSlot, PresidentPlayer } from "@/types/president-club";

/**
 * Título do cartão de equipa (escalão) associado a um treinador.
 * Se o Presidente ligou o treinador aos Juvenis, este valor é "Juvenis".
 */
export function slotTitleForLinkedCoach(
  slots: PresidentEquipasSlot[],
  coachUserId: string | undefined | null
): string | null {
  const id = typeof coachUserId === "string" ? coachUserId.trim() : "";
  if (!id) return null;
  const row = slots.find((s) => s.linkedCoachUserId === id);
  const t = row?.title?.trim();
  return t || null;
}

/**
 * Equipa / escalão mostrado no clube: o definido pelo Presidente no cartão,
 * ou o nome escolhido pelo treinador no perfil (campo clube / equipa).
 */
export function resolvePresidentDisplayTeam(
  slots: PresidentEquipasSlot[],
  coachUserId: string | undefined | null,
  coachWorkspaceClub: string
): string {
  return slotTitleForLinkedCoach(slots, coachUserId) ?? coachWorkspaceClub.trim();
}

/** Aplica o escalão do Presidente ao plantel agregado (treinadores + jogadores). */
export function withPresidentSlotTeamOverlay(
  slots: PresidentEquipasSlot[],
  coaches: PresidentCoach[],
  players: PresidentPlayer[]
): { coaches: PresidentCoach[]; players: PresidentPlayer[] } {
  return {
    coaches: coaches.map((c) => {
      const base = (c.team ?? "").trim();
      const team = resolvePresidentDisplayTeam(slots, c.coachUserId, base);
      return { ...c, team };
    }),
    players: players.map((p) => {
      const base = (p.team ?? "").trim();
      const team = resolvePresidentDisplayTeam(slots, p.coachUserId, base);
      return { ...p, team };
    }),
  };
}
