/**
 * Geração de planos de treino no cliente — regras e templates (sem API externa).
 * Filosofia: igual ao Style of Play Helper (lógica local + dados do plantel).
 */

import type { Player, Position } from "@/types";
import type { AiFullTrainingSession, AiSingleDrill, AiTrainingBlock } from "@/lib/training-ai-types";
import { formatPlayerPositions, playerHasPosition } from "@/lib/player-positions";

export type TrainingThemeId =
  | "possession"
  | "transition"
  | "pressing"
  | "finishing"
  | "defensive"
  | "wide"
  | "physical"
  | "balanced";

const THEME_KEYWORDS: Record<TrainingThemeId, readonly string[]> = {
  possession: [
    "posse",
    "posseção",
    "possession",
    "circular",
    "toques",
    "constru",
    "manter bola",
    "tocar",
  ],
  transition: [
    "transição",
    "transicao",
    "vertical",
    "rápido",
    "rapido",
    "contra",
    "ataque directo",
    "direto",
    "profundidade",
  ],
  pressing: ["pressão", "pressao", "pressing", "press", "alta", "recuper", "ganhar bola"],
  finishing: ["finaliza", "remate", "golo", "gol", "área", "area", "conclusão", "conclusao", "atacar"],
  defensive: ["defens", "linha", "compacto", "bloco", "baixo", "equilíbrio", "equilibrio", "transição defensiva"],
  wide: ["largo", "flanco", "extremo", "lateral", "cruzamento", "largura"],
  physical: ["físico", "fisico", "resistência", "resistencia", "intensidade", "sprint", "velocidade", "força", "forca"],
  balanced: [],
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function detectTrainingThemes(text: string): TrainingThemeId[] {
  const t = norm(text);
  const hit = new Set<TrainingThemeId>();
  (Object.keys(THEME_KEYWORDS) as TrainingThemeId[]).forEach((id) => {
    if (id === "balanced") return;
    for (const kw of THEME_KEYWORDS[id]) {
      if (t.includes(norm(kw))) {
        hit.add(id);
        break;
      }
    }
  });
  if (hit.size === 0) hit.add("balanced");
  return [...hit];
}

function rosterLines(players: Player[]): string {
  if (players.length === 0) return "Grupo completo disponível.";
  return players.map((p) => `#${p.number} ${p.name} (${formatPlayerPositions(p)})`).join("; ");
}

function pickNames(players: Player[], filter: (p: Player) => boolean, max = 4): string {
  const xs = players.filter(filter).slice(0, max);
  if (xs.length === 0) return "jogadores da linha indicada";
  return xs.map((p) => `#${p.number} ${p.name}`).join(", ");
}

function gkNames(players: Player[]): string {
  return pickNames(players, (p) => playerHasPosition(p, "GK"), 2);
}

const DEF_POS: Position[] = ["CB", "LB", "RB"];
const MID_POS: Position[] = ["CDM", "CM", "CAM"];
const FWD_POS: Position[] = ["LW", "RW", "ST"];

function defNames(players: Player[]): string {
  return pickNames(players, (p) => DEF_POS.some((pos) => playerHasPosition(p, pos)), 5);
}

function midNames(players: Player[]): string {
  return pickNames(players, (p) => MID_POS.some((pos) => playerHasPosition(p, pos)), 5);
}

function fwdNames(players: Player[]): string {
  return pickNames(players, (p) => FWD_POS.some((pos) => playerHasPosition(p, pos)), 4);
}

type MainDrillDef = {
  themes: TrainingThemeId[];
  title: string;
  describe: (players: Player[], minutes: number) => Omit<AiTrainingBlock, "durationMin" | "phase">;
};

const MAIN_DRILLS: MainDrillDef[] = [
  {
    themes: ["possession", "balanced"],
    title: "Rondo com pressão condicionada",
    describe: (pl, m) => ({
      description: `Dois quadrados ou círculos concentricos: interior com menos jogadores + 2 defesas a pressionar (${m} min). Rotação a cada 90s nas pressões. Plantel: ${rosterLines(pl)}.`,
      coachingPoints:
        "Corpo aberto na recepção; primeiro toque orientado; voz constante. Se a pressão ganhar a bola, 6 toques para voltar a estabilizar.",
      setup: "Cones; espaço total ~25x25 m (ajusta ao número).",
      groupSplit:
        pl.length >= 10
          ? `Grupo A: rondo 6v3+2 com ${midNames(pl)} e ${fwdNames(pl)}. Grupo B: ${defNames(pl)} trabalha passes em ziguezague entre 3 estações (mesmo tempo, troca ao intervalo).`
          : undefined,
      diagramHint: "Quadrado exterior; quadrado interior menor; 2 coletes a pressionar no meio.",
    }),
  },
  {
    themes: ["transition", "physical"],
    title: "Jogo 4+4 vs 4+4 com transição imediata",
    describe: (pl, m) => ({
      description: `Dois campos 30x22 m lado a lado. Ao perder, equipa que recupera tem ${Math.min(8, Math.max(4, Math.floor(m / 8)))} toques para marcar no campo vizinho. ${m} min em blocos de 4 min + 1 min pausa.`,
      coachingPoints:
        "Primeira ação após recuperação: olhar à frente. Se não houver linha, segurar e atrair para liberar terceiro homem.",
      setup: "4 coletes de cada cor; 2 balizas pequenas ou portas com cones.",
      groupSplit: `Atacantes em destaque na fase ofensiva: ${fwdNames(pl)}. Meios a apoiar ligações: ${midNames(pl)}.`,
      diagramHint: "Dois rectângulos; setas de transição cruzadas entre campos.",
    }),
  },
  {
    themes: ["pressing"],
    title: "Pressão alta coordenada 5v5+1",
    describe: (pl, m) => ({
      description: `Campo 32x24 m. Equipa com bola tem guarda-redes jogador (${gkNames(pl)} ou jogador em pé). Equipa sem bola pressiona em cunha: primeiro salta ao portador, segundos fecham linhas de passe. Séries de ${Math.max(3, Math.floor(m / 4))} min.`,
      coachingPoints: "Gatilho comum (voz ou mão); nunca saltar sozinho; canalizar para banda se for o plano.",
      setup: "Coletes; porta grande ou dois mini-golos.",
      diagramHint: "Cunha de pressão a partir do ponta de lança; meios tapam passes interiores.",
    }),
  },
  {
    themes: ["finishing", "wide"],
    title: "Finalização em velocidade a partir de cruzamento",
    describe: (pl, m) => ({
      description: `Filas nas bandas; cruzamentos alternados; 2 pontas de lança + 2 chegadas ao segundo poste por série. ${m} min com contagem de golos limpos.`,
      coachingPoints: "Tempo de corrida; contacto com o relvado na antevisão; decisão cabeça vs pé.",
      setup: "Bolas nas bandas; mini-balizas ou porta reduzida.",
      groupSplit: `Cruzamentos: ${pickNames(pl, (p) => playerHasPosition(p, "LW") || playerHasPosition(p, "LB"), 3)}. Finalizações: ${fwdNames(pl)}.`,
      diagramHint: "Banda → cruzamento rasteiro e alto alternados; 2 filas de atacantes.",
    }),
  },
  {
    themes: ["defensive", "balanced"],
    title: "Bloco médio-baixo + saída em W",
    describe: (pl, m) => ({
      description: `Meio-campo defensivo: linha de 5+4 atrás da bola; ao recuperar, dois jogadores largos esticam e um interior oferece entre linhas (${m} min).`,
      coachingPoints: "Distâncias 8–12 m entre linhas; lateral do lado da bola fecha; do lado oposto mantém largura.",
      setup: "Meio campo real ou 50x40 m.",
      groupSplit: `Defesas e médios defensivos (${defNames(pl)}, ${midNames(pl)}) no bloco; ${fwdNames(pl)} simula pressão adversária e depois lidera saída.`,
      diagramHint: "Duas linhas horizontais; seta em W na recuperação.",
    }),
  },
  {
    themes: ["physical", "possession"],
    title: "Possessão 8v8+2 neutros",
    describe: (pl, m) => ({
      description: `Retângulo 40x30 m; dois neutros nas bandas sempre com o equipa na posse; objectivo 10 passes seguidos = 1 ponto (${m} min).`,
      coachingPoints: "Neutros só com 2 toques; interiorizações dos extremos para criar superioridade.",
      setup: "Coletes; 1 bola principal + bolas ao redor.",
      diagramHint: "Rectângulo; neutros fixos nas linhas laterais.",
    }),
  },
];

function scoreDrill(themes: TrainingThemeId[], def: MainDrillDef): number {
  let s = 0;
  for (const t of def.themes) if (themes.includes(t)) s += 2;
  if (def.themes.includes("balanced") && themes.includes("balanced")) s += 1;
  return s;
}

function pickMainDrills(themes: TrainingThemeId[], count: number, seed: number): MainDrillDef[] {
  const scored = MAIN_DRILLS.map((d, i) => ({ d, s: scoreDrill(themes, d) + ((seed + i * 13) % 3) * 0.1 }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.d);
  const out: MainDrillDef[] = [];
  const used = new Set<string>();
  for (const d of scored) {
    if (out.length >= count) break;
    if (used.has(d.title)) continue;
    used.add(d.title);
    out.push(d);
  }
  let i = 0;
  while (out.length < count && i < MAIN_DRILLS.length) {
    const d = MAIN_DRILLS[i++]!;
    if (!used.has(d.title)) {
      used.add(d.title);
      out.push(d);
    }
  }
  return out;
}

function splitMinutes(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const rest = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Semente estável para escolher variantes (texto do objetivo + duração).
 */
function hashSeed(objective: string, durationMin: number): number {
  let h = durationMin * 31;
  const t = norm(objective);
  for (let i = 0; i < t.length; i++) h = (h + t.charCodeAt(i) * (i + 1)) % 1_000_000;
  return h;
}

export function buildLocalFullTrainingSession(params: {
  durationMin: number;
  objective: string;
  players: Player[];
}): AiFullTrainingSession {
  const { durationMin, objective, players } = params;
  const themes = detectTrainingThemes(objective);
  const seed = hashSeed(objective, durationMin);
  const nMain = durationMin <= 40 ? 2 : durationMin <= 75 ? 3 : 4;

  const summary = `Plano gerado localmente com base no teu objetivo (${themes.filter((t) => t !== "balanced").join(", ") || "equilíbrio"}) e ${players.length} jogadores seleccionados. Ajusta tempos e espaços ao teu relvado.`;

  const recalc: AiTrainingBlock[] = [];
  const warmD = Math.min(25, Math.max(8, Math.round(durationMin * 0.17)));
  const coolD = Math.min(18, Math.max(5, Math.round(durationMin * 0.1)));
  let mainTotal = durationMin - warmD - coolD;
  if (mainTotal < 10) mainTotal = 10;
  const parts2 = splitMinutes(mainTotal, nMain);
  const defs2 = pickMainDrills(themes, nMain, seed);

  recalc.push({
    title: "Aquecimento integrado com bola",
    durationMin: warmD,
    phase: "warmup",
    description: `Mobilidade + passes em movimento (pares e triângulos); últimos 3 min com aumento de ritmo. ${players.length} jogadores.`,
    coachingPoints: "Qualidade do passe antes da velocidade; cabeça levantada.",
    setup: "Bolsa de bolas; rectângulo 20x15 m.",
    diagramHint: "Zigzag entre cones com passe ao desmarcar.",
  });

  defs2.forEach((def, i) => {
    const mins = parts2[i] ?? Math.floor(mainTotal / nMain);
    const body = def.describe(players, mins);
    recalc.push({
      ...body,
      durationMin: mins,
      phase: "main",
    });
  });

  recalc.push({
    title: "Volta à calma e alongamento activo",
    durationMin: coolD,
    phase: "cooldown",
    description:
      "Caminhada 2 minutos; alongamentos dinâmicos leves em pares; respiração controlada. Hidratação e recapitulação de 1 ponto-chave do treino.",
    coachingPoints: "Sem forçar amplitude máxima; foco em costas e posteriores de coxa.",
    setup: "Relvado ou final do campo.",
  });

  const sum = recalc.reduce((a, b) => a + b.durationMin, 0);
  const drift = durationMin - sum;
  if (drift !== 0) {
    for (let i = recalc.length - 1; i >= 0; i--) {
      if (recalc[i]!.phase === "main") {
        const b = recalc[i]!;
        recalc[i] = { ...b, durationMin: Math.max(5, b.durationMin + drift) };
        break;
      }
    }
  }

  const themePt: Record<TrainingThemeId, string> = {
    possession: "Posse",
    transition: "Transições",
    pressing: "Pressão",
    finishing: "Finalização",
    defensive: "Defesa",
    wide: "Jogo largo",
    physical: "Carga física",
    balanced: "Equilíbrio",
  };
  const nonBal = themes.filter((x) => x !== "balanced");
  const themeLabel =
    nonBal.length === 0 ? "Treino equilibrado" : `Foco: ${nonBal.map((t) => themePt[t]).join(", ")}`;

  return {
    sessionTitle: `${themeLabel} · ${durationMin} min`,
    summary,
    blocks: recalc,
    closingNotes:
      "Este plano é sugestão automática: adapta cargas a lesões, idade e contexto da época. Grava na secção manual se quiseres histórico.",
  };
}

export function buildLocalSingleDrill(brief: string, players: Player[]): AiSingleDrill {
  const themes = detectTrainingThemes(brief);
  const seed = hashSeed(brief, 0);
  const defs = pickMainDrills(themes, 1, seed);
  const def = defs[0]!;
  const mins = brief.length > 80 ? 18 : 14;
  const body = def.describe(players, mins);

  return {
    title: def.title,
    durationMin: mins,
    objective: `Pedido: ${brief.slice(0, 120)}${brief.length > 120 ? "…" : ""}`,
    description: body.description,
    progression: "Aumenta espaço (mais difícil defender) ou reduz toques permitidos no rondo. Alterna pé fraco em passes fixos.",
    coachingCues: body.coachingPoints,
    variations: "Reduz jogadores no meio; ou acrescenta neutro exterior; ou pontua por X passes seguidos.",
    diagramHint: body.diagramHint,
  };
}
