import type { Player, Position } from "@/types";

/** Ordem do plantel (GK → ST): para ordenação e “posição principal” em empates multi-posição. */
export const SQUAD_POSITION_ORDER: readonly Position[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
];

const POSITION_ORDER_INDEX: Record<Position, number> = SQUAD_POSITION_ORDER.reduce(
  (acc, pos, i) => {
    acc[pos] = i;
    return acc;
  },
  {} as Record<Position, number>
);

export function positionOrderIndex(pos: Position): number {
  return POSITION_ORDER_INDEX[pos] ?? 999;
}

/** Entre todas as posições do jogador, a que vem primeiro em `SQUAD_POSITION_ORDER` (ex. CB+ST → CB). */
export function primaryPositionForSort(p: Player): Position {
  const all = getPlayerPositions(p);
  let best: Position = all[0]!;
  let bestIdx = positionOrderIndex(best);
  for (let i = 1; i < all.length; i++) {
    const pos = all[i]!;
    const idx = positionOrderIndex(pos);
    if (idx < bestIdx) {
      best = pos;
      bestIdx = idx;
    }
  }
  return best;
}

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

/** Posição “principal” no sentido de ordenação de plantel (GK antes de ST, etc.). */
export function primaryPositionFromList(positions: Position[]): Position {
  if (!positions.length) return "CM";
  let best = positions[0]!;
  let bestIdx = positionOrderIndex(best);
  for (let i = 1; i < positions.length; i++) {
    const p = positions[i]!;
    const idx = positionOrderIndex(p);
    if (idx < bestIdx) {
      best = p;
      bestIdx = idx;
    }
  }
  return best;
}

export type SquadSortBy = "number" | "position" | "name";

export function sortSquadRoster(players: Player[], sortBy: SquadSortBy): Player[] {
  const copy = [...players];
  copy.sort((a, b) => {
    if (sortBy === "number") {
      if (a.number !== b.number) return a.number - b.number;
      return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
    }
    if (sortBy === "position") {
      const da = positionOrderIndex(primaryPositionForSort(a));
      const db = positionOrderIndex(primaryPositionForSort(b));
      if (da !== db) return da - db;
      if (a.number !== b.number) return a.number - b.number;
      return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
    }
    const cmp = a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
    if (cmp !== 0) return cmp;
    return a.number - b.number;
  });
  return copy;
}
