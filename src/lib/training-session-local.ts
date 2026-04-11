/**
 * Geração de planos de treino no cliente — regras e templates (sem API externa).
 * Filosofia: igual ao Style of Play Helper (lógica local + dados do plantel).
 */

import type { Player } from "@/types";
import type { AiFullTrainingSession, AiSingleDrill, AiTrainingBlock } from "@/lib/training-ai-types";

/**
 * Vídeo do exercício "Offensive Between Lines".
 * Coloca o ficheiro em `public/videos/training/offensive-between-lines.mp4` ou substitui por um link YouTube (URL completa).
 */
export const OFFENSIVE_BETWEEN_LINES_VIDEO_URL = "/videos/training/offensive-between-lines.mp4";

/**
 * Vídeo do exercício "Passing Activation".
 * Coloca o ficheiro em `public/videos/training/passing-activation.mp4` ou substitui por um link YouTube.
 */
export const PASSING_ACTIVATION_VIDEO_URL = "/videos/training/passing-activation.mp4";

/**
 * Vídeo do exercício "Dual Passing".
 * Coloca o ficheiro em `public/videos/training/dual-passing.mp4` ou substitui por um link YouTube.
 */
export const DUAL_PASSING_VIDEO_URL = "/videos/training/dual-passing.mp4";

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
    "posse de bola",
    "começar pela defesa",
    "comecar pela defesa",
    "pela defesa",
    "sair desde trás",
    "sair desde tras",
    "desde trás",
    "desde tras",
    "build from back",
    "start from defense",
    "ativação",
    "ativacao",
    "activation",
    "passing activation",
    "movimento",
    "movimentos",
    "poste",
    "postes",
    "passe e movimento",
    "posse rápida",
    "posse rapida",
    "warm up",
    "warmup",
    "futsal",
    "futebol rápido",
    "futebol rapido",
    "orientação",
    "orientacao",
    "orientação para a bola",
    "primeiro toque",
    "timing",
    "dual passing",
    "passe duplo",
    "combinação",
    "combinacao",
    "passe de apoio",
    "hexágono",
    "hexagono",
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
    "entre linhas",
    "meio-campo",
    "meio campo",
    "ofensivo",
    "ofensiva",
    "ataque rápido",
    "ataque rapido",
    "jogo ofensivo",
    "between lines",
    "offensive",
    "quick attack",
    "midfield",
    "offensive between lines",
  ],
  pressing: ["pressão", "pressao", "pressing", "press", "alta", "recuper", "ganhar bola"],
  finishing: [
    "finaliza",
    "remate",
    "golo",
    "gol",
    "área",
    "area",
    "conclusão",
    "conclusao",
    "atacar",
    "finalização rápida",
    "finalizacao rapida",
    "à baliza",
    "a baliza",
    "ataques à baliza",
    "ataques a baliza",
    "quick finish",
    "attack goal",
  ],
  defensive: ["defens", "linha", "compacto", "bloco", "baixo", "equilíbrio", "equilibrio", "transição defensiva"],
  wide: ["largo", "flanco", "extremo", "lateral", "cruzamento", "largura"],
  physical: [
    "físico",
    "fisico",
    "resistência",
    "resistencia",
    "intensidade",
    "sprint",
    "velocidade",
    "força",
    "forca",
    "aquecimento",
    "aquecer",
    "movimentação",
    "movimentacao",
  ],
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

type MainDrillDef = {
  themes: TrainingThemeId[];
  title: string;
  describe: (players: Player[], minutes: number) => Omit<AiTrainingBlock, "durationMin" | "phase" | "title">;
};

const MAIN_DRILLS: MainDrillDef[] = [
  {
    themes: ["possession", "physical", "balanced"],
    title: "Passing Activation",
    describe: (_pl, m) => ({
      description: `Colocam-se 6 postes formando uma estrutura, com 5 jogadores posicionados (um poste fica sempre livre). O jogador em posse passa a bola a um colega e, de imediato, desloca-se para o poste livre. O exercício continua em sequência, mantendo sempre um poste vazio. O objectivo é garantir passe e movimento constante, com boa qualidade técnica, timing e ocupação de espaço. (${m} min)`,
      coachingPoints:
        "Passe firme e jogável; arranque ao poste livre no instante após soltar a bola; cabeça levantada para antecipar o próximo espaço livre; ritmo alto sem sacrificar precisão.",
      setup: "6 postes ou cones + bolas ao pé; área compacta (ex. ~12×10 m ou hexágono proporcional ao grupo).",
      diagramHint: "Seis marcas; cinco jogadores; após cada passe, corrida ao único poste livre; sequência contínua.",
      videoUrl: PASSING_ACTIVATION_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "physical", "balanced"],
    title: "Dual Passing",
    describe: (_pl, m) => ({
      description: `Organizam-se 6 jogadores nos vértices de um hexágono e 1 jogador atrás do que começa com a bola (7 jogadores no total). A bola circula pelos jogadores exteriores enquanto, em simultâneo, se realizam combinações com o jogador do centro (passe de apoio / devolução). O foco está no timing dos movimentos, orientação corporal para jogar rápido e tomada de decisão, garantindo fluidez e precisão em todas as ações. (${m} min)`,
      coachingPoints:
        "Corpo aberto antes da bola chegar; primeiro toque na direcção da combinação seguinte; sincronizar entrada do centro com o passe periférico; ritmo de futebol reduzido sem perder qualidade.",
      setup: "Hexágono proporcional ao grupo (ex. 10–14 m por lado); 7 jogadores; bolas extra para manter fluidez.",
      diagramHint: "Seis nos vértices; um no centro (apoio/devolução); circulação no anel + combinações interiores; um jogador atrás do ponto de primeira saída.",
      videoUrl: DUAL_PASSING_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "balanced"],
    title: "Rondo com pressão condicionada",
    describe: (pl, m) => ({
      description: `Dois quadrados ou círculos concentricos: interior com menos jogadores + 2 defesas a pressionar (${m} min). Rotação a cada 90s nas pressões.`,
      coachingPoints:
        "Corpo aberto na recepção; primeiro toque orientado; voz constante. Se a pressão ganhar a bola, 6 toques para voltar a estabilizar.",
      setup: "Cones; espaço total ~25x25 m (ajusta ao número).",
      groupSplit:
        pl.length >= 10
          ? "Dois grupos sem repetir jogadores: maioria no rondo + pressões; defesas em ziguezague entre estações. Troca de papéis ao intervalo."
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
      groupSplit:
        "Avançados lideram a transição ao último terço; médios fazem ligações; quem não está nesses papéis apoia e roda para todos experimentarem os dois lados.",
      diagramHint: "Dois rectângulos; setas de transição cruzadas entre campos.",
    }),
  },
  {
    themes: ["pressing"],
    title: "Pressão alta coordenada 5v5+1",
    describe: (pl, m) => ({
      description: `Campo 32x24 m. Equipa com bola: GR real ou jogador em pé nas balizas. Equipa sem bola pressiona em cunha: primeiro salta ao portador, segundos fecham linhas de passe. Séries de ${Math.max(3, Math.floor(m / 4))} min.`,
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
      groupSplit:
        "Largos (laterais / extremos) iniciam cruzamentos; finalizadores no eixo e segundo poste; apoios sem repetir o mesmo papel na mesma jogada.",
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
      groupSplit:
        "Bloco com defesas e médios; avançados simulam pressão e depois lideram a saída; GR pode ficar na baliza ou participar na construção, conforme o plano.",
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
  {
    themes: ["transition", "finishing", "possession"],
    title: "Offensive Between Lines",
    describe: (pl, m) => ({
      description: `Jogo em meio-campo (${m} min): duas equipas com balizas; ideal ~12–20 jogadores de campo + 2 ou 3 GR (8v8 ou 9v9 — com terceira equipa de 8, roda à espera ou em campo vizinho). A equipa em posse começa sempre pela linha defensiva: com poucos toques, procurar um passe rasteiro entre linhas para um médio. Ao receber entre linhas, os médios rodam depressa e a equipa ataca a baliza. Se a bola for intercetada, a equipa que recupera não pode atacar de imediato: primeiro recua e toca nos seus defesas, depois repete o mesmo ciclo (entre linhas → rotação → finalização).`,
      coachingPoints:
        "Primeiro toque no médio entre linhas orientado ao golo ou à terceira linha; corpo aberto antes da bola chegar. Após perda, reset disciplinado: bola aos defesas antes de voltar a progredir. Limita toques (ex.: 3) se precisares de mais ritmo e passes rasteiros.",
      setup: "Meio-campo real ou ~55×40 m; 2 balizas; coletes; bolas extra nas linhas de fundo.",
      groupSplit:
        "Monta duas equipas equilibradas a partir do plantel; cada jogador numa só equipa. Dois ou três GR a alternar ou um por baliza; com terceira equipa de oito, rodar mantendo grupos sempre disjuntos.",
      diagramHint: "Meio-campo; seta desde defesas → passe rasteiro entre linhas → médios a rodar → remate; após recuperação, seta de volta aos defesas antes de repetir.",
      videoUrl: OFFENSIVE_BETWEEN_LINES_VIDEO_URL,
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
      title: def.title,
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

const SINGLE_DRILL_TITLE_20_MIN = "Offensive Between Lines";
const SINGLE_DRILL_8_MIN_TITLES = new Set<string>(["Passing Activation", "Dual Passing"]);

export function buildLocalSingleDrill(brief: string, players: Player[]): AiSingleDrill {
  const themes = detectTrainingThemes(brief);
  const seed = hashSeed(brief, 0);
  const defs = pickMainDrills(themes, 1, seed);
  const def = defs[0]!;
  const mins =
    def.title === SINGLE_DRILL_TITLE_20_MIN
      ? 20
      : SINGLE_DRILL_8_MIN_TITLES.has(def.title)
        ? 8
        : brief.length > 80
          ? 18
          : 14;
  const body = def.describe(players, mins);
  const isBetweenLines = def.title === SINGLE_DRILL_TITLE_20_MIN;
  const isPassingActivation = def.title === "Passing Activation";
  const isDualPassing = def.title === "Dual Passing";

  return {
    title: def.title,
    durationMin: mins,
    objective: `Pedido: ${brief.slice(0, 120)}${brief.length > 120 ? "…" : ""}`,
    description: body.description,
    ...(body.videoUrl ? { videoUrl: body.videoUrl } : {}),
    progression: isBetweenLines
      ? "Aperta o meio-campo (menos espaço entre linhas) ou exige 2 toques máx. depois do passe interior; aumenta largura para forçar mais metros percorridos após a rotação."
      : isPassingActivation
        ? "Aperta distâncias entre postes para exigir passes mais curtos e reacção mais rápida; ou fixa 2 toques máx.; ou alterna o pé obrigatório em cada série."
        : isDualPassing
          ? "Encolhe o hexágono para forçar primeiro toque ainda mais limpo; ou acrescenta um defensor ligeiro no centro por 45 s; ou exige só combinações com o pé não dominante."
          : "Aumenta espaço (mais difícil defender) ou reduz toques permitidos no rondo. Alterna pé fraco em passes fixos.",
    coachingCues: body.coachingPoints,
    variations: isBetweenLines
      ? "Terceira equipa de 8 a rodar; ou zona obrigatória de 'pé em campo' nos médios; ou golo vale duplo se vier de passe rasteiro entre linhas."
      : isPassingActivation
        ? "Dois coletes com passes obrigatórios entre cores; ou inverte o sentido da rotação a cada minuto; ou acrescenta um jogador 'defensor' a tapar uma linha de passe por 30 s."
        : isDualPassing
          ? "Rotação do jogador central a cada minuto; ou dois jogadores no miolo a alternar apoios; ou sentido horário fixo na periferia com inversão ao apito."
          : "Reduz jogadores no meio; ou acrescenta neutro exterior; ou pontua por X passes seguidos.",
    diagramHint: body.diagramHint,
  };
}
