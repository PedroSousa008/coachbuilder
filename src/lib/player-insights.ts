import type { Player, PlayerQualities, Position, QualityStatId } from "@/types";
import {
  GK_QUALITY_STAT_IDS,
  OUTFIELD_QUALITY_STAT_IDS,
  mergeQualities,
} from "@/lib/player-qualities";
import { getPlayerPositions } from "@/lib/player-positions";

/** Atributos mais relevantes por posição (para identificar o que trabalhar). */
const POSITION_FOCUS: Record<Position, readonly QualityStatId[]> = {
  GK: [
    "diving",
    "handling",
    "reflexes",
    "positioning",
    "kicking",
    "passing",
    "vision",
    "acceleration",
    "sprintSpeed",
  ],
  CB: [
    "headingAccuracy",
    "defensiveAwareness",
    "standTackle",
    "slideTackle",
    "strength",
    "jumping",
    "interceptions",
    "reactions",
  ],
  LB: [
    "sprintSpeed",
    "acceleration",
    "crossing",
    "stamina",
    "slideTackle",
    "standTackle",
    "balance",
    "reactions",
  ],
  RB: [
    "sprintSpeed",
    "acceleration",
    "crossing",
    "stamina",
    "slideTackle",
    "standTackle",
    "balance",
    "reactions",
  ],
  CDM: [
    "interceptions",
    "defensiveAwareness",
    "standTackle",
    "stamina",
    "strength",
    "shortPass",
    "vision",
    "aggression",
  ],
  CM: [
    "vision",
    "shortPass",
    "longPass",
    "stamina",
    "ballControl",
    "reactions",
    "composure",
    "balance",
  ],
  CAM: [
    "vision",
    "shortPass",
    "ballControl",
    "agility",
    "dribbling",
    "finishing",
    "composure",
    "reactions",
  ],
  LW: [
    "acceleration",
    "sprintSpeed",
    "crossing",
    "dribbling",
    "ballControl",
    "agility",
    "finishing",
    "stamina",
  ],
  RW: [
    "acceleration",
    "sprintSpeed",
    "crossing",
    "dribbling",
    "ballControl",
    "agility",
    "finishing",
    "stamina",
  ],
  ST: [
    "finishing",
    "attackingPosition",
    "shotPower",
    "headingAccuracy",
    "strength",
    "acceleration",
    "ballControl",
    "balance",
  ],
};

const STAT_PT: Record<QualityStatId, string> = {
  acceleration: "Aceleração",
  sprintSpeed: "Velocidade",
  diving: "Mergulho",
  handling: "Manuseamento",
  kicking: "Pontapé",
  reflexes: "Reflexos (GR)",
  positioning: "Posicionamento (GR)",
  passing: "Passe (GR)",
  attackingPosition: "Movimento ofensivo",
  finishing: "Remate",
  shotPower: "Força do remate",
  longShots: "Remates longos",
  volleys: "Voleios",
  penalties: "Penáltis",
  vision: "Visão de jogo",
  crossing: "Cruzamentos",
  freeKickAccuracy: "Livres",
  shortPass: "Passe curto",
  longPass: "Passe longo",
  curve: "Efeito",
  agility: "Agilidade",
  balance: "Equilíbrio",
  reactions: "Reflexos",
  ballControl: "Controlo de bola",
  dribbling: "Drible",
  composure: "Compostura",
  interceptions: "Interceções",
  headingAccuracy: "Jogo aéreo",
  defensiveAwareness: "Leitura defensiva",
  standTackle: "Desarme em pé",
  slideTackle: "Entrada deslizante",
  jumping: "Salto",
  stamina: "Resistência",
  strength: "Força",
  aggression: "Agressividade",
};

export function statLabelPt(id: QualityStatId): string {
  return STAT_PT[id] ?? id;
}

const GK_OVERALL_WEIGHTS: Record<QualityStatId, number> = {
  acceleration: 0.02,
  sprintSpeed: 0.02,
  diving: 0.18,
  handling: 0.18,
  kicking: 0.18,
  reflexes: 0.18,
  positioning: 0.18,
  passing: 0.03,
  vision: 0.03,
  attackingPosition: 0,
  finishing: 0,
  shotPower: 0,
  longShots: 0,
  volleys: 0,
  penalties: 0,
  crossing: 0,
  freeKickAccuracy: 0,
  shortPass: 0,
  longPass: 0,
  curve: 0,
  agility: 0,
  balance: 0,
  reactions: 0,
  ballControl: 0,
  dribbling: 0,
  composure: 0,
  interceptions: 0,
  headingAccuracy: 0,
  defensiveAwareness: 0,
  standTackle: 0,
  slideTackle: 0,
  jumping: 0,
  stamina: 0,
  strength: 0,
  aggression: 0,
};

function getRelevantStatIds(position: Position): readonly QualityStatId[] {
  return position === "GK" ? GK_QUALITY_STAT_IDS : OUTFIELD_QUALITY_STAT_IDS;
}

export function computePlayerOverall(position: Position, partial?: Partial<PlayerQualities>): number {
  const q = mergeQualities(partial);
  if (position === "GK") {
    let weighted = 0;
    for (const id of GK_QUALITY_STAT_IDS) weighted += q[id] * GK_OVERALL_WEIGHTS[id];
    return Math.round(weighted);
  }
  let sum = 0;
  for (const id of OUTFIELD_QUALITY_STAT_IDS) sum += q[id];
  return Math.round(sum / OUTFIELD_QUALITY_STAT_IDS.length);
}

/**
 * Overall “por posição”: média dos atributos mais relevantes para essa função
 * (ver `POSITION_FOCUS`). Para GR mantém o modelo ponderado de `computePlayerOverall`.
 */
export function computePositionFocusedOverall(position: Position, partial?: Partial<PlayerQualities>): number {
  const q = mergeQualities(partial);
  if (position === "GK") return computePlayerOverall("GK", partial);
  const focus = POSITION_FOCUS[position];
  if (!focus?.length) return computePlayerOverall(position, partial);
  let sum = 0;
  for (const id of focus) sum += q[id];
  return Math.round(sum / focus.length);
}

export function getTopStrengths(
  q: PlayerQualities,
  n: number,
  position: Position
): { id: QualityStatId; label: string; value: number }[] {
  const ranked = getRelevantStatIds(position)
    .map((id) => ({ id, label: STAT_PT[id], value: q[id] }))
    .sort((a, b) => b.value - a.value);
  return ranked.slice(0, n);
}

/** Dentro dos atributos-chave da posição: os mais baixos (prioridade para treino). */
export function getImprovementsForPosition(
  primary: Position,
  q: PlayerQualities,
  n: number
): { id: QualityStatId; label: string; value: number }[] {
  const focus = [...POSITION_FOCUS[primary]];
  const scored = focus.map((id) => ({ id, label: STAT_PT[id], value: q[id] }));
  scored.sort((a, b) => a.value - b.value);
  return scored.slice(0, n);
}

export type PhysicalInsight = {
  ok: boolean;
  lines: string[];
  bmi: number | null;
};

function heightRangeHint(position: Position, heightCm: number): string | null {
  if (position === "GK" && heightCm < 182) {
    return "Altura abaixo do habitual para guarda-redes de alto nível — valoriza reflexos e saídas.";
  }
  if ((position === "CB" || position === "ST") && heightCm < 178) {
    return "Para o teu papel, ganhar duelos aéreos pode exigir compensar com salto e posicionamento.";
  }
  if ((position === "LW" || position === "RW") && heightCm > 188) {
    return "Perfil alto para extremo — mantém agilidade e mudanças de direção no foco.";
  }
  return null;
}

export function evaluatePhysicalProfile(
  position: Position,
  heightCm?: number,
  weightKg?: number
): PhysicalInsight {
  const lines: string[] = [];

  if (heightCm == null || weightKg == null || heightCm <= 0 || weightKg <= 0) {
    lines.push("Preenche altura e peso para avaliar IMC e adequação ao teu papel.");
    return { ok: false, lines, bmi: null };
  }

  const hM = heightCm / 100;
  const bmi = weightKg / (hM * hM);
  const rounded = Math.round(bmi * 10) / 10;

  if (bmi < 19) {
    lines.push(`IMC ${rounded}: abaixo do intervalo típico para atleta — foco em força e massa muscular com nutrição.`);
  } else if (bmi <= 24) {
    lines.push(`IMC ${rounded}: intervalo habitual para futebolista — mantém composição corporal estável.`);
  } else if (bmi <= 26.5) {
    lines.push(`IMC ${rounded}: ligeiramente elevado — atenção a explosividade e recuperação entre jogos.`);
  } else {
    lines.push(`IMC ${rounded}: elevado para o rendimento — trabalhar mobilidade e plano nutricional com a equipa.`);
  }

  const hint = heightRangeHint(position, heightCm);
  if (hint) lines.push(hint);

  const ok = bmi >= 19 && bmi <= 26 && !hint;
  return { ok, lines, bmi: rounded };
}

export type PlayerInsights = {
  overall: number;
  /** Posição principal usada para priorizar o que desenvolver */
  primaryPosition: Position;
  strengths: { id: QualityStatId; label: string; value: number }[];
  improvements: { id: QualityStatId; label: string; value: number }[];
  physical: PhysicalInsight;
  /** Texto curto para atributo title no cartão */
  summaryTitle: string;
};

export function buildPlayerInsights(player: Player): PlayerInsights {
  const q = mergeQualities(player.qualities);
  const primary = getPlayerPositions(player)[0] ?? player.position;
  const overall = computePlayerOverall(primary, player.qualities);

  const strengths = getTopStrengths(q, 3, primary);
  const improvements = getImprovementsForPosition(primary, q, 3);
  const physical = evaluatePhysicalProfile(primary, player.heightCm, player.weightKg);

  const sStr = strengths.map((x) => `${x.label} (${x.value})`).join(", ");
  const iStr = improvements.map((x) => `${x.label} (${x.value})`).join(", ");
  const pStr = physical.lines[0] ?? "";

  const summaryTitle = [
    `Overall ${overall}.`,
    `Destaques: ${sStr}.`,
    `A desenvolver (${primary}): ${iStr}.`,
    pStr,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    overall,
    primaryPosition: primary,
    strengths,
    improvements,
    physical,
    summaryTitle,
  };
}
