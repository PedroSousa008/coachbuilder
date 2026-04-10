import type { Player, Position } from "@/types";

export function getPlayerPositions(p: Player): Position[] {
  if (p.positions && p.positions.length > 0) return p.positions;
  return [p.position];
}

export function formatPlayerPositions(p: Player): string {
  return getPlayerPositions(p).join(", ");
}

export function playerHasPosition(p: Player, pos: Position): boolean {
  return getPlayerPositions(p).includes(pos);
}
