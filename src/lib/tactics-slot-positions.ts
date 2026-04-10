import type { Player, Position } from "@/types";
import { playerHasPosition } from "@/lib/player-positions";

/** Formation chip label → roster `Position` values that can fill that slot. */
export const TACTICS_SLOT_TO_POSITIONS: Record<string, readonly Position[]> = {
  GK: ["GK"],
  CB: ["CB"],
  LB: ["LB"],
  RB: ["RB"],
  LWB: ["LB", "LW"],
  RWB: ["RB", "RW"],
  DM: ["CDM", "CM"],
  CDM: ["CDM"],
  CM: ["CM"],
  CAM: ["CAM"],
  LM: ["LW", "CM", "CAM"],
  RM: ["RW", "CM", "CAM"],
  LW: ["LW"],
  RW: ["RW"],
  ST: ["ST"],
  CF: ["ST", "CAM"],
};

/**
 * Whether a squad player may be placed on this formation slot (uses `positions[]` or primary `position`).
 * Unknown slot labels allow any player (forward-compatible).
 */
export function playerEligibleForTacticsSlot(slotFormationLabel: string, player: Player): boolean {
  const accepted = TACTICS_SLOT_TO_POSITIONS[slotFormationLabel];
  if (!accepted) return true;
  return accepted.some((pos) => playerHasPosition(player, pos));
}
