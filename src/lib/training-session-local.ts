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

/**
 * Vídeo do exercício "9v9 + 2 Game".
 * Coloca o ficheiro em `public/videos/training/9v9+2.mp4` ou substitui por um link YouTube.
 */
export const NINE_V_NINE_PLUS_TWO_VIDEO_URL = "/videos/training/9v9+2.mp4";

/**
 * Vídeo do exercício "Double Finishing Drill".
 * Coloca o ficheiro em `public/videos/training/finishing-drill.mp4` ou substitui por um link YouTube.
 */
export const DOUBLE_FINISHING_DRILL_VIDEO_URL = "/videos/training/finishing-drill.mp4";

/**
 * Vídeo do exercício "Back Four Shifting".
 * Coloca o ficheiro em `public/videos/training/back-four-shifting.mp4` ou substitui por um link YouTube.
 */
export const BACK_FOUR_SHIFTING_VIDEO_URL = "/videos/training/back-four-shifting.mp4";

/**
 * Vídeo do exercício "Compact Defending Transition".
 * Coloca o ficheiro em `public/videos/training/compact-defending-transition.mp4` ou substitui por um link YouTube.
 */
export const COMPACT_DEFENDING_TRANSITION_VIDEO_URL =
  "/videos/training/compact-defending-transition.mp4";

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
    "campo reduzido",
    "9v9",
    "9v9+2",
    "neutros nas linhas",
    "extremos fixos",
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
    "ataques rápidos",
    "ataques rapidos",
    "futebol rápido",
    "futebol rapido",
    "primeiro toque",
    "jogo ofensivo",
    "between lines",
    "offensive",
    "quick attack",
    "midfield",
    "offensive between lines",
    "compact defending transition",
    "defesa compacta",
    "transição rápida",
    "transicao rapida",
    "quatro balizas",
    "4 balizas",
    "recuperação e ataque",
    "recuperacao e ataque",
  ],
  pressing: [
    "pressão",
    "pressao",
    "pressing",
    "press",
    "alta",
    "recuper",
    "ganhar bola",
    "fechar espaços",
    "fechar espacos",
    "pressão ao portador",
    "pressao ao portador",
    "back four shifting",
  ],
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
    "ataque organizado",
    "aparecer na área",
    "aparecer na area",
    "cruzamentos",
    "finalização na área",
    "finalizacao na area",
    "9v9 game",
    "9v9 + 2",
    "double finishing",
    "dupla finalização",
    "dupla finalizacao",
    "movimentação na área",
    "movimentacao na area",
    "overlap",
    "overlap lateral",
  ],
  defensive: [
    "defens",
    "defesa",
    "linha",
    "compacto",
    "bloco",
    "baixo",
    "equilíbrio",
    "equilibrio",
    "transição defensiva",
    "organização defensiva",
    "organizacao defensiva",
    "linha de 4",
    "linha dos 4",
    "fora de jogo",
    "movimentação sem bola",
    "movimentacao sem bola",
    "cobrir espaços",
    "cobrir espacos",
    "comunicação",
    "comunicacao",
    "back four",
    "shifting",
    "quatro defesas",
    "compact defending",
    "fechar o meio",
    "manter linha",
    "linha defensiva",
    "linha sempre",
    "trinco",
    "defesa e trinco",
    "bloco compacto",
  ],
  wide: [
    "largo",
    "flanco",
    "extremo",
    "lateral",
    "cruzamento",
    "largura",
    "extremos abertos",
    "mudança de corredor",
    "mudanca de corredor",
    "corredor",
    "utilização da largura",
    "utilizacao da largura",
    "9v9 + 2 game",
    "cruzamento para área",
    "cruzamento para area",
    "laterais",
  ],
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
    themes: ["defensive", "pressing", "balanced"],
    title: "Back Four Shifting",
    describe: (_pl, m) => ({
      description: `Organização da linha de 4 defensiva: manter a linha alinhada, explorar o fora de jogo e fechar espaços com rapidez. Pressão imediata ao portador da bola. O defesa mais próximo da bola deve pressionar o portador, enquanto os restantes ajustam o posicionamento, fechando dentro e protegendo a zona central. O objectivo é orientar o adversário para as zonas laterais, onde o perigo é menor. É fundamental manter uma boa orientação corporal, permitindo reagir rapidamente, e garantir comunicação constante entre os jogadores para coordenar movimentos e coberturas. (${m} min)`,
      coachingPoints:
        "Linha a subir e descer junta; lateral do lado da bola a fechar o corredor interior; não saltar sem cobertura; voz constante (troca de pressão, 'segura', 'linha'); se a bola vai à banda, bloquear o centro primeiro.",
      setup: "Meio-campo defensivo ou ~45×35 m; 4 defesas + GR; atacantes ou coletes a simular circulação e passes; bolas de reposição.",
      groupSplit:
        "Quatro defesas fixos na linha durante a série; atacantes a rodar como referência; opcional: médios a pressionar por detrás da bola.",
      diagramHint: "Linha de 4; seta de pressão ao portador; setas de fecho ao centro; canalização para a banda; linha de fora de jogo.",
      videoUrl: BACK_FOUR_SHIFTING_VIDEO_URL,
    }),
  },
  {
    themes: ["defensive", "transition", "balanced"],
    title: "Compact Defending Transition",
    describe: (_pl, m) => ({
      description: `Defesa compacta com transição rápida: a equipa organiza-se de forma compacta, com a linha defensiva e o trinco bem coordenados, garantindo equilíbrio e proximidade entre setores. A prioridade é fechar o corredor central, manter a linha defensiva alinhada e organizada e assegurar comunicação constante entre todos. Após a recuperação da bola, a equipa reage de imediato, procurando atacar o mais rápido possível as quatro balizas, explorando o espaço e a desorganização do adversário. (${m} min)`,
      coachingPoints:
        "Sem bola: linha recta e junta; trinco a tapar o eixo e a falar com a última linha; corpo aberto para ver bola + jogo. Com bola: primeira ação vertical ou para a baliza mais livre; não hesitar após o 'click' da recuperação.",
      setup: "Meio-campo defensivo ou ~45×36 m; quatro mini-balizas ou portas nos cantos / linha média para forçar decisão após recuperação; coletes e bolas extra.",
      groupSplit:
        "Bloco defensivo (linha + trinco) fixo num período; atacantes a simular circulação; após recuperação, os mesmos ou um núcleo ofensivo designado ataca as 4 balizas em 3–5 toques.",
      diagramHint: "Bloco compacto (defesas + trinco); corredor central fechado; após recuperação, setas rápidas para as 4 balizas.",
      videoUrl: COMPACT_DEFENDING_TRANSITION_VIDEO_URL,
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
  {
    themes: ["wide", "finishing", "possession"],
    title: "9v9 + 2 Game",
    describe: (_pl, m) => ({
      description: `Joga-se 9v9 em campo reduzido, com 2 extremos fixos nas linhas laterais a dar largura. As equipas devem circular a bola e procurar mudanças rápidas de corredor para explorar os extremos. Sempre que a bola entra no extremo, este tem no máximo 2 toques e é obrigatório cruzar para a área para finalização. O foco está na utilização da largura, rapidez na circulação e eficácia no momento de cruzamento e finalização. (${m} min)`,
      coachingPoints:
        "Extremo a receber com corpo aberto para a área; cruzamento decidido após 1.º ou 2.º toque; mínimo três jogadores a atacar a área (primeiro poste, penalty, segundo poste); circulação no meio para deslocar bloco adversário antes do último passe largo.",
      setup: "Campo estreito e longo (ex. 55×40 m ou proporcional); 2 coletes ou cores para extremos fixos; balizas regulamentares ou reduzidas; bolas ao redor.",
      groupSplit:
        "Dois jogadores fixos nas linhas laterais (um por banda ou a alternar por períodos); restantes em 9v9 com liberdade tática; GR em cada baliza ou rotação.",
      diagramHint: "Rectângulo; extremos fixos nas laterais; setas de circulação central → mudança de corredor → cruzamento → remates na área.",
      videoUrl: NINE_V_NINE_PLUS_TWO_VIDEO_URL,
    }),
  },
  {
    themes: ["finishing", "wide", "transition"],
    title: "Double Finishing Drill",
    describe: (_pl, m) => ({
      description: `O exercício inicia com trocas de bola curtas entre médio, avançado e extremo, preparando o momento para o remate do extremo. Após a finalização, a jogada continua automaticamente com um overlap do lateral, criando superioridade no corredor lateral. De seguida, há uma combinação rápida entre extremo e médio, acompanhada por movimentações dentro da área por parte dos jogadores ofensivos. O lateral cruza com precisão para finalização. Após a conclusão, o exercício repete no lado oposto. O foco está na qualidade da finalização, timing das movimentações na área e coordenação dos overlaps dos laterais. (${m} min)`,
      coachingPoints:
        "Primeiro toque sempre orientado ao golo ou ao próximo passe; extremo a fechar bem a linha de remate; lateral a tempo no overlap sem adiantar demasiado a bola; cruzamentos com variedade (rasteiro, segundo poste); mínimo dois atacantes a reagir às movimentações na área.",
      setup: "Último terço ou meio campo ofensivo (~35–40 m de comprimento); baliza ou GR; coletes; bolas em cada estação; ideal para bloco final do treino (15–20 min).",
      groupSplit:
        "Filas por função (médios, avançados, extremos, laterais) a rodar após cada sequência completa; repete banda esquerda e direita em espelho.",
      diagramHint: "Triângulo médio–avançado–extremo → remate → overlap lateral → combinação extremo–médio → movimentos na área → cruzamento → finalização; espelhar no outro lado.",
      videoUrl: DOUBLE_FINISHING_DRILL_VIDEO_URL,
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

const SINGLE_DRILL_20_MIN_TITLES = new Set<string>(["Offensive Between Lines", "9v9 + 2 Game"]);
/** Valor médio quando o treinador indica ~15–20 min (ex.: bloco final). */
const SINGLE_DRILL_18_MIN_TITLES = new Set<string>(["Double Finishing Drill"]);
const SINGLE_DRILL_10_MIN_TITLES = new Set<string>([
  "Back Four Shifting",
  "Compact Defending Transition",
]);
const SINGLE_DRILL_8_MIN_TITLES = new Set<string>(["Passing Activation", "Dual Passing"]);

export function buildLocalSingleDrill(brief: string, players: Player[]): AiSingleDrill {
  const themes = detectTrainingThemes(brief);
  const seed = hashSeed(brief, 0);
  const defs = pickMainDrills(themes, 1, seed);
  const def = defs[0]!;
  const mins = SINGLE_DRILL_20_MIN_TITLES.has(def.title)
    ? 20
    : SINGLE_DRILL_18_MIN_TITLES.has(def.title)
      ? 18
      : SINGLE_DRILL_10_MIN_TITLES.has(def.title)
        ? 10
        : SINGLE_DRILL_8_MIN_TITLES.has(def.title)
          ? 8
          : brief.length > 80
            ? 18
            : 14;
  const body = def.describe(players, mins);
  const isBetweenLines = def.title === "Offensive Between Lines";
  const isBackFourShifting = def.title === "Back Four Shifting";
  const isCompactDefendingTransition = def.title === "Compact Defending Transition";
  const isDoubleFinishing = def.title === "Double Finishing Drill";
  const is9v9Plus2Game = def.title === "9v9 + 2 Game";
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
      : isBackFourShifting
        ? "Encurta o espaço entre defesa e meio para forçar linha mais alta; ou acrescenta terceiro atacante a fixar o último defesa; ou alterna quem inicia a pressão a cada 90 s."
        : isCompactDefendingTransition
          ? "Reduz o tempo máximo após recuperação (ex.: 4 toques para remate); ou acrescenta quinta baliza no eixo para forçar ainda mais fecho do meio; ou exige que só o trinco fale na reorganização durante 3 min."
          : isDoubleFinishing
            ? "Aumenta a exigência no primeiro remate (vértice mais fechado); ou obriga cruzamento só com o pé interior; ou acrescenta defensor na área com contacto leve."
            : is9v9Plus2Game
              ? "Encosta o campo para forçar decisões mais rápidas no extremo; ou permite 3 toques no extremo em fase inicial; ou golo vale duplo se a jogada tiver mudança de corredor antes do cruzamento."
              : isPassingActivation
                ? "Aperta distâncias entre postes para exigir passes mais curtos e reacção mais rápida; ou fixa 2 toques máx.; ou alterna o pé obrigatório em cada série."
                : isDualPassing
                  ? "Encolhe o hexágono para forçar primeiro toque ainda mais limpo; ou acrescenta um defensor ligeiro no centro por 45 s; ou exige só combinações com o pé não dominante."
                  : "Aumenta espaço (mais difícil defender) ou reduz toques permitidos no rondo. Alterna pé fraco em passes fixos.",
    coachingCues: body.coachingPoints,
    ...(isDualPassing
      ? {}
      : {
          variations: isBetweenLines
            ? "Terceira equipa de 8 a rodar; ou zona obrigatória de 'pé em campo' nos médios; ou golo vale duplo se vier de passe rasteiro entre linhas."
            : isBackFourShifting
              ? "Atacante obrigado a receber de costas; ou passe filtrado simulado com linha a subir no timing; ou capitão da linha só ele dá ordem de pressão."
              : isCompactDefendingTransition
                ? "Só duas balizas activas de cada vez (rotação a cada 90 s); ou adversário com passe obrigatório ao pivô antes de finalizar contra o bloco; ou golo na transição vale duplo se vier de passe vertical do trinco."
                : isDoubleFinishing
                  ? "Segunda bola viva após o primeiro remate para forçar reacção; ou defensores a saírem na linha em 2 toques; ou contagem de golos só com assistência de lateral."
                  : is9v9Plus2Game
                    ? "Extremos a trocar de lado ao intervalo; ou um extremo neutro que só pode dar largura à equipa em posse; ou limite de 5 passes antes de obrigar jogo ao extremo."
                    : isPassingActivation
                      ? "Dois coletes com passes obrigatórios entre cores; ou inverte o sentido da rotação a cada minuto; ou acrescenta um jogador 'defensor' a tapar uma linha de passe por 30 s."
                      : "Reduz jogadores no meio; ou acrescenta neutro exterior; ou pontua por X passes seguidos.",
        }),
    diagramHint: body.diagramHint,
  };
}
