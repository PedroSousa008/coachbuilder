import type {
  FormationId,
  PitchPlayer,
  Player,
  Position,
  PreferredFoot,
  QualityStatId,
  SketchScoutingAttributeScores,
  SketchScoutingBoardState,
  SketchScoutingObservationNote,
  SketchScoutingObservationStatus,
  SketchScoutingProfile,
} from "@/types";
import { FORMATION_LAYOUTS } from "@/data/formations";
import { calendarDayLisbon } from "@/lib/lisbon-date";
import { mergeQualities } from "@/lib/player-qualities";
import { computePlayerOverall } from "@/lib/player-insights";

const BOARD_PREFIX = "scouting-board";

export const SCOUTING_PLAYER_ID_PREFIX = "scout:";

export const SCOUTING_TECHNIQUE_KEYS = [
  "passe",
  "rececao",
  "remate",
  "cruzamento",
  "drible",
  "finalizacao",
  "primeiroToque",
] as const;

export const SCOUTING_TACTICAL_KEYS = [
  "posicionamento",
  "inteligencia",
  "pressao",
  "leituraJogo",
  "movimentosSemBola",
] as const;

export const SCOUTING_PHYSICAL_KEYS = [
  "velocidade",
  "resistencia",
  "forca",
  "agilidade",
  "impulsao",
] as const;

export const SCOUTING_MENTAL_KEYS = [
  "lideranca",
  "concentracao",
  "competitividade",
  "compostura",
  "mentalidade",
] as const;

const TECH_PT: Record<(typeof SCOUTING_TECHNIQUE_KEYS)[number], string> = {
  passe: "Passe",
  rececao: "Receção",
  remate: "Remate",
  cruzamento: "Cruzamento",
  drible: "Drible",
  finalizacao: "Finalização",
  primeiroToque: "Primeiro toque",
};

const TAC_PT: Record<(typeof SCOUTING_TACTICAL_KEYS)[number], string> = {
  posicionamento: "Posicionamento",
  inteligencia: "Inteligência",
  pressao: "Pressão",
  leituraJogo: "Leitura de jogo",
  movimentosSemBola: "Movimentos sem bola",
};

const PHY_PT: Record<(typeof SCOUTING_PHYSICAL_KEYS)[number], string> = {
  velocidade: "Velocidade",
  resistencia: "Resistência",
  forca: "Força",
  agilidade: "Agilidade",
  impulsao: "Impulsão",
};

const MEN_PT: Record<(typeof SCOUTING_MENTAL_KEYS)[number], string> = {
  lideranca: "Liderança",
  concentracao: "Concentração",
  competitividade: "Competitividade",
  compostura: "Compostura",
  mentalidade: "Mentalidade",
};

export function scoutingAttributeLabelPt(block: "technique" | "tactical" | "physical" | "mental", key: string): string {
  if (block === "technique") return TECH_PT[key as keyof typeof TECH_PT] ?? key;
  if (block === "tactical") return TAC_PT[key as keyof typeof TAC_PT] ?? key;
  if (block === "physical") return PHY_PT[key as keyof typeof PHY_PT] ?? key;
  return MEN_PT[key as keyof typeof MEN_PT] ?? key;
}

export const SCOUTING_STATUS_LABELS_PT: Record<SketchScoutingObservationStatus, string> = {
  observed: "Observado",
  analyzing: "Em análise",
  priority: "Prioridade",
  interested: "Interessado",
  rejected: "Rejeitado",
  signed: "Contratado",
};

export const TACTICAL_ROLE_PRESETS_PT: { id: string; label: string }[] = [
  { id: "playmaker", label: "Playmaker" },
  { id: "box-to-box", label: "Box-to-box" },
  { id: "extremo-vertical", label: "Extremo vertical" },
  { id: "extremo-criativo", label: "Extremo criativo" },
  { id: "pivo-defensivo", label: "Pivô defensivo" },
  { id: "defesa-construtor", label: "Defesa construtor" },
  { id: "falso-9", label: "Falso 9" },
  { id: "medio-regista", label: "Médio-regista" },
  { id: "ala-invertido", label: "Ala invertido" },
  { id: "ponta-de-lanca", label: "Ponta de lança" },
];

function defaultScores(keys: readonly string[], value = 62): SketchScoutingAttributeScores {
  const o: SketchScoutingAttributeScores = {};
  for (const k of keys) o[k] = value;
  return o;
}

export function emptyScoutingBoard(formation: FormationId = "4-3-3"): SketchScoutingBoardState {
  return {
    formation,
    players: cloneFormationPitchPlayers(formation),
    updatedAt: new Date().toISOString(),
  };
}

export function cloneFormationPitchPlayers(formation: FormationId): PitchPlayer[] {
  const layout = FORMATION_LAYOUTS[formation] ?? FORMATION_LAYOUTS["4-3-3"];
  return layout.map((p, i) => ({
    ...p,
    id: `${BOARD_PREFIX}-live-${i}`,
    formationLabel: p.formationLabel ?? p.label,
    playerId: null,
    playerName: null,
  }));
}

export function newScoutingProfileId() {
  return `scout-prof-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultScoutingProfile(partial?: Partial<Pick<SketchScoutingProfile, "fullName">>): SketchScoutingProfile {
  const now = new Date().toISOString();
  const id = newScoutingProfileId();
  return {
    id,
    fullName: partial?.fullName?.trim() || "Novo observado",
    positions: ["CM"],
    status: "observed",
    technique: defaultScores(SCOUTING_TECHNIQUE_KEYS),
    tactical: defaultScores(SCOUTING_TACTICAL_KEYS),
    physical: defaultScores(SCOUTING_PHYSICAL_KEYS),
    mental: defaultScores(SCOUTING_MENTAL_KEYS),
    tacticalRoleTags: [],
    observations: [],
    createdAt: now,
    updatedAt: now,
  };
}

const SCOUTING_STATUS_LIST: SketchScoutingObservationStatus[] = [
  "observed",
  "analyzing",
  "priority",
  "interested",
  "rejected",
  "signed",
];

export function normalizeScoutingProfile(raw: unknown): SketchScoutingProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SketchScoutingProfile>;
  if (!r.id || typeof r.id !== "string") return null;
  const def = createDefaultScoutingProfile({ fullName: typeof r.fullName === "string" ? r.fullName : "Observado" });
  const status: SketchScoutingObservationStatus =
    r.status && SCOUTING_STATUS_LIST.includes(r.status as SketchScoutingObservationStatus)
      ? (r.status as SketchScoutingObservationStatus)
      : def.status;
  const mergeBlock = (base: SketchScoutingAttributeScores, patch?: SketchScoutingAttributeScores) => ({
    ...base,
    ...(patch && typeof patch === "object" ? patch : {}),
  });
  return {
    ...def,
    ...r,
    fullName: typeof r.fullName === "string" && r.fullName.trim() ? r.fullName.trim() : def.fullName,
    status,
    technique: mergeBlock(def.technique, r.technique),
    tactical: mergeBlock(def.tactical, r.tactical),
    physical: mergeBlock(def.physical, r.physical),
    mental: mergeBlock(def.mental, r.mental),
    positions: Array.isArray(r.positions) && r.positions.length ? (r.positions as Position[]) : def.positions,
    observations: Array.isArray(r.observations) ? (r.observations as SketchScoutingObservationNote[]) : def.observations,
    tacticalRoleTags: Array.isArray(r.tacticalRoleTags) ? r.tacticalRoleTags.map(String) : def.tacticalRoleTags,
    qualityStatIds: Array.isArray(r.qualityStatIds) ? (r.qualityStatIds as QualityStatId[]) : undefined,
    createdAt: typeof r.createdAt === "string" ? r.createdAt : def.createdAt,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : def.updatedAt,
  };
}

export function ageFromDateOfBirthIso(dob?: string, refMs = Date.now()): number | null {
  if (!dob || dob.length < 10) return null;
  const y = Number(dob.slice(0, 4));
  const m = Number(dob.slice(5, 7)) - 1;
  const d = Number(dob.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const birth = new Date(y, m, d);
  const ref = new Date(refMs);
  let age = ref.getFullYear() - birth.getFullYear();
  const md = ref.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 80 ? age : null;
}

function averageScores(s: SketchScoutingAttributeScores): number {
  const vals = Object.values(s).filter((n) => typeof n === "number" && Number.isFinite(n));
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function scoutingProfilePillars(p: SketchScoutingProfile): {
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
  overall: number;
} {
  const technical = Math.round(averageScores(p.technique));
  const tactical = Math.round(averageScores(p.tactical));
  const physical = Math.round(averageScores(p.physical));
  const mental = Math.round(averageScores(p.mental));
  const overall = Math.round((technical + tactical + physical + mental) / 4);
  return { technical, tactical, physical, mental, overall };
}

/** Pilares comparáveis com perfis de captação (aproximação a partir das qualidades FIFA). */
export function squadPlayerComparablePillars(p: Player): {
  technical: number;
  tactical: number;
  physical: number;
  mental: number;
  overall: number;
} {
  const q = mergeQualities(p.qualities);
  const pos = p.positions?.[0] ?? p.position;
  const avg = (keys: QualityStatId[]) =>
    Math.round(keys.reduce((sum, k) => sum + (q[k] ?? 0), 0) / Math.max(1, keys.length));
  const technical = avg([
    "shortPass",
    "longPass",
    "crossing",
    "dribbling",
    "finishing",
    "ballControl",
    "volleys",
  ]);
  const tactical = avg([
    "vision",
    "attackingPosition",
    "defensiveAwareness",
    "interceptions",
    "reactions",
  ]);
  const physical = avg([
    "acceleration",
    "sprintSpeed",
    "stamina",
    "strength",
    "agility",
    "jumping",
    "balance",
  ]);
  const mental = avg(["composure", "aggression", "reactions", "penalties", "curve"]);
  const overall = computePlayerOverall(pos, p.qualities);
  return { technical, tactical, physical, mental, overall };
}

/** `Player` sintético para picker / elegibilidade de posição no quadro táctico. */
export function scoutingProfileToPickerPlayer(p: SketchScoutingProfile): Player {
  const primary = p.positions[0] ?? "CM";
  const age = ageFromDateOfBirthIso(p.dateOfBirth) ?? 18;
  return {
    id: `${SCOUTING_PLAYER_ID_PREFIX}${p.id}`,
    name: p.fullName.trim() || "Observado",
    position: primary,
    positions: p.positions.length ? [...p.positions] : [primary],
    age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    preferredFoot: p.preferredFoot,
    availability: "available",
    performance: "steady",
    number: 0,
    photoUrl: p.photoUrl,
    nationality: p.nationality,
    dateOfBirth: p.dateOfBirth,
    scoutedFromClub: p.currentClub,
  };
}

export function isScoutingPickerPlayerId(id: string): boolean {
  return id.startsWith(SCOUTING_PLAYER_ID_PREFIX);
}

export function scoutingProfileIdFromPickerId(id: string): string | null {
  if (!isScoutingPickerPlayerId(id)) return null;
  return id.slice(SCOUTING_PLAYER_ID_PREFIX.length);
}

export function daysSinceObservation(p: SketchScoutingProfile): number | null {
  if (!p.observations.length) return null;
  const last = p.observations.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  const t = new Date(last.createdAt).getTime();
  if (!Number.isFinite(t)) return null;
  const dayLast = calendarDayLisbon(t);
  const dayNow = calendarDayLisbon(Date.now());
  const d0 = new Date(`${dayLast}T12:00:00`);
  const d1 = new Date(`${dayNow}T12:00:00`);
  return Math.max(0, Math.round((d1.getTime() - d0.getTime()) / 86400000));
}

export function safeScoutingFormationId(f: FormationId | string): FormationId {
  return f in FORMATION_LAYOUTS ? (f as FormationId) : "4-3-3";
}

function normalizePitchPlayersStored(ps: PitchPlayer[]): PitchPlayer[] {
  return ps.map((p, i) => ({
    ...p,
    id: typeof p.id === "string" ? p.id : `scouting-slot-${i}`,
    formationLabel: p.formationLabel ?? p.label,
    playerId: p.playerId ?? null,
    playerName: p.playerName ?? null,
  }));
}

/** Lê `scoutingBoard` de JSON antigo ou parcial. */
export function normalizeScoutingBoardFromStorage(raw: unknown): SketchScoutingBoardState {
  if (!raw || typeof raw !== "object") return emptyScoutingBoard("4-3-3");
  const b = raw as Record<string, unknown>;
  const formation = safeScoutingFormationId(typeof b.formation === "string" ? b.formation : "4-3-3");
  const players = Array.isArray(b.players)
    ? normalizePitchPlayersStored(b.players as PitchPlayer[])
    : cloneFormationPitchPlayers(formation);
  const updatedAt = typeof b.updatedAt === "string" ? b.updatedAt : new Date().toISOString();
  return { formation, players, updatedAt };
}

export function mergeSketchEntsById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of local) {
    if (x?.id) m.set(x.id, x);
  }
  for (const x of cloud) {
    if (x?.id) m.set(x.id, x);
  }
  return Array.from(m.values());
}

export function mergeScoutingBoards(local: SketchScoutingBoardState, cloud: SketchScoutingBoardState): SketchScoutingBoardState {
  const tL = new Date(local.updatedAt).getTime();
  const tC = new Date(cloud.updatedAt).getTime();
  if (!Number.isFinite(tC) && !Number.isFinite(tL)) return cloud;
  if (!Number.isFinite(tC)) return local;
  if (!Number.isFinite(tL)) return cloud;
  return tC >= tL ? cloud : local;
}

