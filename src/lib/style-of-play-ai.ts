import type { FormationId, Player, QualityStatId } from "@/types";
import { FORMATION_LAYOUTS, MORE_FORMATION_IDS, PRIMARY_FORMATION_IDS, formationDisplayLabel } from "@/data/formations";
import { mergeQualities, ALL_QUALITY_STAT_IDS } from "@/lib/player-qualities";
import { playerEligibleForTacticsSlot } from "@/lib/tactics-slot-positions";

export type StyleOfPlayId =
  | "possession_high"
  | "vertical_transitions"
  | "high_press"
  | "low_block_counter"
  | "wide_overload"
  | "physical_duels"
  | "balanced_control";

export type StyleOfPlayDefinition = {
  id: StyleOfPlayId;
  labelPt: string;
  labelEn: string;
  shortPt: string;
  /** Pesos por atributo FIFA (0 = ignora). Média ponderada 0–100. */
  weights: Partial<Record<QualityStatId, number>>;
  transitionBulletsPt: string[];
  /** Ordem de preferência estática; o ranking dinâmico pode reordenar. */
  formationHints: FormationId[];
};

const ALL_FORMATIONS: FormationId[] = [
  ...new Set<FormationId>([...PRIMARY_FORMATION_IDS, ...MORE_FORMATION_IDS]),
];

export const STYLE_OF_PLAY_DEFINITIONS: StyleOfPlayDefinition[] = [
  {
    id: "possession_high",
    labelPt: "Posse & construção alta",
    labelEn: "Possession & high build-up",
    shortPt: "Circular rápido, terceiro homem, fixar para liberar linhas.",
    weights: {
      shortPass: 1.6,
      vision: 1.5,
      composure: 1.3,
      ballControl: 1.3,
      agility: 1.0,
      reactions: 1.0,
      longPass: 1.0,
      dribbling: 0.9,
      defensiveAwareness: 0.6,
    },
    transitionBulletsPt: [
      "Após recuperação: segurar 2–3 toques para fixar o bloco adversário antes do passe vertical.",
      "Laterais interiores em saída; extremos largos para esticar e abrir half-spaces.",
      "Em perda: contra-pressão imediata nos 2–3 jogadores mais próximos da bola.",
    ],
    formationHints: ["4-3-3", "4-2-3-1", "4-3-2-1", "3-4-2-1"],
  },
  {
    id: "vertical_transitions",
    labelPt: "Transições rápidas & verticalidade",
    labelEn: "Fast transitions & vertical play",
    shortPt: "Bola longa ou condução directa; extremos e ponta de lança em profundidade.",
    weights: {
      acceleration: 1.5,
      sprintSpeed: 1.4,
      longPass: 1.2,
      vision: 1.0,
      finishing: 1.0,
      attackingPosition: 1.2,
      dribbling: 1.0,
      stamina: 1.0,
      composure: 0.8,
    },
    transitionBulletsPt: [
      "Defesa baixa → procurar 3º homem entre linhas ou extremo interior a atacar costas.",
      "Após ganhar no meio: passe em profundidade ou condução central com opção larga fixa.",
      "Em defesa: linha compacta; ao recuperar, máximo 2 toques para orientar ao ataque.",
    ],
    formationHints: ["4-3-3", "4-2-3-1", "4-4-2", "3-4-3"],
  },
  {
    id: "high_press",
    labelPt: "Pressão alta & recuperação",
    labelEn: "High press & ball recovery",
    shortPt: "Salto coordenado, agressividade e resistência para repetir esforços.",
    weights: {
      aggression: 1.4,
      stamina: 1.4,
      sprintSpeed: 1.1,
      interceptions: 1.2,
      defensiveAwareness: 1.2,
      standTackle: 1.1,
      reactions: 1.1,
      acceleration: 1.0,
      composure: 0.7,
    },
    transitionBulletsPt: [
      "Gatilho: passe para lateral ou guarda-redes mal orientado — salto do corredor e cobertura interior.",
      "Se não houver pressão à bola, recuar em 5m e recompactar antes do segundo salto.",
      "Transição ofensiva: passes curtos diagonais para jogador livre entre linhas após recuperação.",
    ],
    formationHints: ["4-3-3", "4-2-3-1", "4-4-2", "4-1-4-1"],
  },
  {
    id: "low_block_counter",
    labelPt: "Bloco baixo & contra-ataque",
    labelEn: "Low block & counter",
    shortPt: "Linhas baixas, disciplina, velocidade para explorar espaço nas costas.",
    weights: {
      defensiveAwareness: 1.5,
      standTackle: 1.3,
      interceptions: 1.2,
      sprintSpeed: 1.2,
      acceleration: 1.1,
      stamina: 1.0,
      headingAccuracy: 1.0,
      strength: 1.0,
      longPass: 0.9,
    },
    transitionBulletsPt: [
      "Bloco médio-baixo: meias a fechar meio-interior; extremos a fechar laterais adversários.",
      "Na recuperação: primeiro passe orientado ao corredor ou ponta com espaço — evitar rodeios.",
      "Em bola parada defensiva: homens fortes na primeira vaga + 1–2 soltos para saída.",
    ],
    formationHints: ["5-4-1", "5-3-2", "4-5-1", "4-4-2", "4-1-4-1"],
  },
  {
    id: "wide_overload",
    labelPt: "Jogo largo & sobrecargas",
    labelEn: "Wide overloads & crosses",
    shortPt: "Extremos e laterais com cruzamento e combinações na linha de fundo.",
    weights: {
      crossing: 1.6,
      stamina: 1.2,
      sprintSpeed: 1.1,
      vision: 1.0,
      shortPass: 1.0,
      ballControl: 1.0,
      headingAccuracy: 1.1,
      finishing: 0.9,
      curve: 0.8,
    },
    transitionBulletsPt: [
      "Interior atrai marcador → libertar extremo ou lateral para 2vs1 na linha.",
      "Segunda vaga de cruzamento: médio ou lateral oposto a fechar área.",
      "Se o bloco central está fechado, trocar o jogo rapidamente para o lado fraco.",
    ],
    formationHints: ["4-3-3", "3-4-3", "4-2-3-1", "5-2-3"],
  },
  {
    id: "physical_duels",
    labelPt: "Duelos & segunda bola",
    labelEn: "Duels & second balls",
    shortPt: "Força, salto e agressividade em lances directos e bolas divididas.",
    weights: {
      strength: 1.5,
      jumping: 1.3,
      aggression: 1.2,
      stamina: 1.2,
      headingAccuracy: 1.2,
      standTackle: 1.1,
      shotPower: 0.9,
      balance: 1.0,
    },
    transitionBulletsPt: [
      "Organizar vaga para segunda bola após lançamentos e desvio de cabeça.",
      "Em ataque posicional: fixar centrais com ST e explorar segunda linha.",
      "Defesa de área: agressão legal na primeira bola; não dar tempo ao pivot virar.",
    ],
    formationHints: ["4-4-2", "4-3-3", "5-3-2", "4-5-1"],
  },
  {
    id: "balanced_control",
    labelPt: "Equilíbrio & controlo",
    labelEn: "Balanced control",
    shortPt: "Perfil redondo: passe, mobilidade e solidez sem extremar um único eixo.",
    weights: {
      shortPass: 1.1,
      vision: 1.1,
      stamina: 1.1,
      defensiveAwareness: 1.0,
      ballControl: 1.0,
      composure: 1.0,
      reactions: 1.0,
      acceleration: 0.9,
      finishing: 0.8,
    },
    transitionBulletsPt: [
      "Alternar ritmo: períodos de posse curta com acelerações pontuais em corredor.",
      "Meio-campo em triângulos; um médio pode fixar entre linhas conforme fase.",
      "Transição defensiva: prioridade a fechar eixo central antes de pressionar a bola.",
    ],
    formationHints: ["4-3-3", "4-2-3-1", "4-3-1-2", "4-4-2"],
  },
];

const STYLE_BY_ID = Object.fromEntries(STYLE_OF_PLAY_DEFINITIONS.map((s) => [s.id, s])) as Record<
  StyleOfPlayId,
  StyleOfPlayDefinition
>;

export function getStyleDefinition(id: StyleOfPlayId): StyleOfPlayDefinition {
  return STYLE_BY_ID[id];
}

export function computeWeightedStyleScore(player: Player, styleId: StyleOfPlayId): number {
  const style = STYLE_BY_ID[styleId];
  const q = mergeQualities(player.qualities);
  let num = 0;
  let den = 0;
  for (const id of ALL_QUALITY_STAT_IDS) {
    const w = style.weights[id] ?? 0;
    if (w <= 0) continue;
    num += w * q[id];
    den += w;
  }
  if (den <= 0) return 50;
  return Math.round((num / den) * 10) / 10;
}

export type SuggestedSlot = {
  slotLabel: string;
  player: Player | null;
  score: number;
  usedFallback: boolean;
};

export function suggestLineupForStyle(
  roster: Player[],
  formation: FormationId,
  styleId: StyleOfPlayId
): SuggestedSlot[] {
  const layout = FORMATION_LAYOUTS[formation];
  if (!layout?.length) return [];
  const used = new Set<string>();
  const style = STYLE_BY_ID[styleId];
  const out: SuggestedSlot[] = [];

  for (const slot of layout) {
    const label = slot.formationLabel;
    const eligible = roster.filter((p) => !used.has(p.id) && playerEligibleForTacticsSlot(label, p));
    const fallbackPool = roster.filter((p) => !used.has(p.id));
    const pool = eligible.length ? eligible : fallbackPool;
    const usedFallback = eligible.length === 0 && fallbackPool.length > 0;

    let best: Player | null = null;
    let bestScore = -1;
    for (const p of pool) {
      const q = mergeQualities(p.qualities);
      let num = 0;
      let den = 0;
      for (const id of ALL_QUALITY_STAT_IDS) {
        const w = style.weights[id] ?? 0;
        if (w <= 0) continue;
        num += w * q[id];
        den += w;
      }
      const score = den > 0 ? num / den : 50;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (best) used.add(best.id);
    out.push({
      slotLabel: label,
      player: best,
      score: Math.round(bestScore * 10) / 10,
      usedFallback,
    });
  }

  return out;
}

export function rankFormationsForStyle(
  roster: Player[],
  styleId: StyleOfPlayId,
  topN = 5
): { formation: FormationId; avgFit: number }[] {
  const scores = ALL_FORMATIONS.map((formation) => {
    const lineup = suggestLineupForStyle(roster, formation, styleId);
    const vals = lineup.map((s) => (s.player ? s.score : 0));
    const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
    return { formation, avgFit: Math.round(avg * 10) / 10 };
  });
  return scores.sort((a, b) => b.avgFit - a.avgFit).slice(0, topN);
}

export type SubSuggestionGroup = {
  titlePt: string;
  hintPt: string;
  players: Player[];
};

function benchPlayers(roster: Player[], starterIds: Set<string>): Player[] {
  return roster.filter((p) => !starterIds.has(p.id));
}

function sortByStat(players: Player[], pick: (q: ReturnType<typeof mergeQualities>) => number): Player[] {
  return [...players].sort((a, b) => pick(mergeQualities(b.qualities)) - pick(mergeQualities(a.qualities)));
}

export function buildSubstitutionSuggestions(roster: Player[], lineup: SuggestedSlot[]): SubSuggestionGroup[] {
  const starters = lineup.map((s) => s.player).filter(Boolean) as Player[];
  const starterIds = new Set(starters.map((p) => p.id));
  const bench = benchPlayers(roster, starterIds);
  if (bench.length === 0) return [];

  const q = mergeQualities;
  const chase = sortByStat(bench, (m) => m.finishing * 1.2 + m.attackingPosition + m.shotPower * 0.8).slice(0, 4);
  const protect = sortByStat(bench, (m) => m.defensiveAwareness + m.standTackle + m.stamina * 0.5).slice(0, 4);
  const paceWide = sortByStat(bench, (m) => m.sprintSpeed + m.acceleration + m.stamina * 0.3).slice(0, 4);
  const midfield = sortByStat(bench, (m) => m.vision + m.shortPass + m.interceptions * 0.6).slice(0, 4);

  return [
    {
      titlePt: "A perder — procurar golo",
      hintPt: "Entradas com remate, movimento sem bola e impacto na área.",
      players: chase,
    },
    {
      titlePt: "A ganhar — segurar resultado",
      hintPt: "Solidez, duelos e fôlego para fechar espaços.",
      players: protect,
    },
    {
      titlePt: "Largura & profundidade cansada",
      hintPt: "Pernas frescas para esticar o campo ou atacar costas.",
      players: paceWide,
    },
    {
      titlePt: "Meio-campo (ritmo & posse)",
      hintPt: "Alternar construção ou maior pressão no eixo.",
      players: midfield,
    },
  ].filter((g) => g.players.length > 0);
}

export function buildStyleOfPlayReport(roster: Player[], formation: FormationId, styleId: StyleOfPlayId) {
  const style = STYLE_BY_ID[styleId];
  const rankedFormations = rankFormationsForStyle(roster, styleId, 5);
  const lineup = suggestLineupForStyle(roster, formation, styleId);
  const subs = buildSubstitutionSuggestions(roster, lineup);
  const avgCurrent =
    lineup.filter((s) => s.player).reduce((a, s) => a + s.score, 0) /
    Math.max(lineup.filter((s) => s.player).length, 1);

  return {
    style,
    rankedFormations,
    lineup,
    subs,
    avgCurrentFit: Math.round(avgCurrent * 10) / 10,
    formationLabel: formationDisplayLabel(formation),
  };
}
