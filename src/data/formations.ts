import type { FormationId, PitchPlayer } from "@/types";

function players(list: { label: string; x: number; y: number }[]): PitchPlayer[] {
  return list.map((p, i) => ({
    id: `p-${i}`,
    label: p.label,
    formationLabel: p.label,
    x: p.x,
    y: p.y,
    playerId: null,
  }));
}

export const FORMATION_LAYOUTS: Record<FormationId, PitchPlayer[]> = {
  /* x% from left: GK top. LB/LW on viewer’s left (low x), RB/RW on viewer’s right (high x). */
  "4-3-3": players([
    { label: "GK", x: 50, y: 6 },
    { label: "LB", x: 14, y: 26 },
    { label: "CB", x: 36, y: 24 },
    { label: "CB", x: 64, y: 24 },
    { label: "RB", x: 86, y: 26 },
    { label: "CM", x: 28, y: 46 },
    { label: "CM", x: 50, y: 42 },
    { label: "CM", x: 72, y: 46 },
    { label: "LW", x: 12, y: 70 },
    { label: "ST", x: 50, y: 76 },
    { label: "RW", x: 88, y: 70 },
  ]),
  "4-2-3-1": players([
    { label: "GK", x: 50, y: 6 },
    { label: "LB", x: 14, y: 26 },
    { label: "CB", x: 36, y: 24 },
    { label: "CB", x: 64, y: 24 },
    { label: "RB", x: 86, y: 26 },
    { label: "CDM", x: 36, y: 42 },
    { label: "CDM", x: 64, y: 42 },
    { label: "LM", x: 14, y: 58 },
    { label: "CAM", x: 50, y: 56 },
    { label: "RM", x: 86, y: 58 },
    { label: "ST", x: 50, y: 78 },
  ]),
  "3-5-2": players([
    { label: "GK", x: 50, y: 6 },
    { label: "CB", x: 26, y: 24 },
    { label: "CB", x: 50, y: 20 },
    { label: "CB", x: 74, y: 24 },
    { label: "LWB", x: 8, y: 44 },
    { label: "CM", x: 32, y: 48 },
    { label: "CM", x: 50, y: 42 },
    { label: "CM", x: 68, y: 48 },
    { label: "RWB", x: 92, y: 44 },
    { label: "ST", x: 36, y: 74 },
    { label: "ST", x: 64, y: 74 },
  ]),
};
