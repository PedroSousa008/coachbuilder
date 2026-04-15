import type { PlayerQualities, QualityStatId } from "@/types";

export const QUALITY_GROUPS: readonly {
  readonly id: string;
  readonly label: string;
  readonly stats: readonly { readonly id: QualityStatId; readonly label: string }[];
}[] = [
  {
    id: "pace",
    label: "Pace",
    stats: [
      { id: "acceleration", label: "Acceleration" },
      { id: "sprintSpeed", label: "Sprint Speed" },
    ],
  },
  {
    id: "shooting",
    label: "Shooting",
    stats: [
      { id: "attackingPosition", label: "Attacking Position" },
      { id: "finishing", label: "Finishing" },
      { id: "shotPower", label: "Shot Power" },
      { id: "longShots", label: "Long Shots" },
      { id: "volleys", label: "Volleys" },
      { id: "penalties", label: "Penalties" },
    ],
  },
  {
    id: "passing",
    label: "Passing",
    stats: [
      { id: "vision", label: "Vision" },
      { id: "crossing", label: "Crossing" },
      { id: "freeKickAccuracy", label: "Free Kick Accuracy" },
      { id: "shortPass", label: "Short Pass" },
      { id: "longPass", label: "Long Pass" },
      { id: "curve", label: "Curve" },
    ],
  },
  {
    id: "dribbling",
    label: "Dribbling",
    stats: [
      { id: "agility", label: "Agility" },
      { id: "balance", label: "Balance" },
      { id: "reactions", label: "Reactions" },
      { id: "ballControl", label: "Ball Control" },
      { id: "dribbling", label: "Dribbling" },
      { id: "composure", label: "Composure" },
    ],
  },
  {
    id: "defending",
    label: "Defending",
    stats: [
      { id: "interceptions", label: "Interceptions" },
      { id: "headingAccuracy", label: "Heading Accuracy" },
      { id: "defensiveAwareness", label: "Defensive Awareness" },
      { id: "standTackle", label: "Stand Tackle" },
      { id: "slideTackle", label: "Slide Tackle" },
    ],
  },
  {
    id: "physical",
    label: "Physical",
    stats: [
      { id: "jumping", label: "Jumping" },
      { id: "stamina", label: "Stamina" },
      { id: "strength", label: "Strength" },
      { id: "aggression", label: "Aggression" },
    ],
  },
] as const;

export const GK_QUALITY_GROUP = {
  id: "goalkeeping",
  label: "Goalkeeping",
  stats: [
    { id: "acceleration", label: "Acceleration" },
    { id: "sprintSpeed", label: "Sprint Speed" },
    { id: "diving", label: "Diving" },
    { id: "handling", label: "Handling" },
    { id: "kicking", label: "Kicking" },
    { id: "reflexes", label: "Reflexes" },
    { id: "positioning", label: "Positioning" },
    { id: "passing", label: "Passing" },
    { id: "vision", label: "Vision" },
  ],
} as const;

export const OUTFIELD_QUALITY_STAT_IDS: QualityStatId[] = QUALITY_GROUPS.flatMap((g) =>
  g.stats.map((s) => s.id)
);

export const GK_QUALITY_STAT_IDS: QualityStatId[] = GK_QUALITY_GROUP.stats.map((s) => s.id);

export const ALL_QUALITY_STAT_IDS: QualityStatId[] = Array.from(
  new Set([...OUTFIELD_QUALITY_STAT_IDS, ...GK_QUALITY_STAT_IDS])
);

export function createDefaultQualities(value = 50): PlayerQualities {
  return Object.fromEntries(ALL_QUALITY_STAT_IDS.map((id) => [id, value])) as PlayerQualities;
}

export function mergeQualities(partial?: Partial<PlayerQualities>): PlayerQualities {
  const base = createDefaultQualities(50);
  if (!partial) return base;
  return { ...base, ...partial };
}
