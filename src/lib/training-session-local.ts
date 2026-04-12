/**
 * Geração de planos de treino no cliente — regras e templates (sem API externa).
 * Filosofia: igual ao Style of Play Helper (lógica local + dados do plantel).
 */

import type { Player, SavedExerciseCategory } from "@/types";
import { isGoalKickExercise } from "@/lib/saved-exercise-categories";
import type {
  AiFullTrainingSession,
  AiSingleDrill,
  AiTrainingBlock,
  AiTrainingPhase,
} from "@/lib/training-ai-types";

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

/**
 * Vídeo do exercício "Finishing Transition".
 * Coloca o ficheiro em `public/videos/training/transition-finishing.mp4` ou substitui por um link YouTube.
 */
export const FINISHING_TRANSITION_VIDEO_URL = "/videos/training/transition-finishing.mp4";

/**
 * Vídeo do exercício "Cross and Strike".
 * Coloca o ficheiro em `public/videos/training/cross-and-strike.mp4` ou substitui por um link YouTube.
 */
export const CROSS_AND_STRIKE_VIDEO_URL = "/videos/training/cross-and-strike.mp4";

/**
 * Vídeo do exercício "4 Finishing Drills".
 * Coloca o ficheiro em `public/videos/training/4-finishing-drills.mp4` (sem espaços no nome) ou substitui por YouTube.
 */
export const FOUR_FINISHING_DRILLS_VIDEO_URL = "/videos/training/4-finishing-drills.mp4";

/**
 * Vídeo do exercício "Rondo 9v3".
 * Coloca o ficheiro em `public/videos/training/rondo-9v3.mp4` ou substitui por um link YouTube.
 */
export const RONDO_9V3_VIDEO_URL = "/videos/training/rondo-9v3.mp4";

/**
 * Vídeo do exercício "Rondo 5v3".
 * Coloca o ficheiro em `public/videos/training/rondo-5v3.mp4` ou substitui por um link YouTube.
 */
export const RONDO_5V3_VIDEO_URL = "/videos/training/rondo-5v3.mp4";

/**
 * Vídeo do exercício "Goal Kick 1".
 * Coloca o ficheiro em `public/videos/training/goal-kick-1.mp4` ou substitui por um link YouTube.
 */
export const GOAL_KICK_1_VIDEO_URL = "/videos/training/goal-kick-1.mp4";

/**
 * Vídeo do exercício "Goal Kick 2".
 * Coloca o ficheiro em `public/videos/training/goal-kick-2.mp4` ou substitui por um link YouTube.
 */
export const GOAL_KICK_2_VIDEO_URL = "/videos/training/goal-kick-2.mp4";

/**
 * Vídeo do exercício "Midfielder Run Behind Defense".
 * Coloca o ficheiro em `public/videos/training/behind-defense.mp4` ou substitui por um link YouTube.
 */
export const MIDFIELDER_RUN_BEHIND_DEFENSE_VIDEO_URL = "/videos/training/behind-defense.mp4";

/**
 * Vídeo do exercício "3v2 Fast Break".
 * Coloca o ficheiro em `public/videos/training/3x2-fast-breaks.mp4` ou substitui por um link YouTube.
 */
export const THREE_V_TWO_FAST_BREAK_VIDEO_URL = "/videos/training/3x2-fast-breaks.mp4";

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
    "rondo 9v3",
    "9v3",
    "vantagem numérica no rondo",
    "vantagem numerica no rondo",
    "10 passes",
    "dez passes",
    "meiinho",
    "futebol curto",
    "ligar com o centro",
    "jogador no centro",
    "pontapé de baliza",
    "pontape de baliza",
    "goal kick",
    "goal kick 1",
    "saída curta GR",
    "saida curta gr",
    "overlap lateral",
    "futebol direto",
    "central a bater pontapé",
    "goal kick 2",
    "virar o jogo",
    "midfielder run behind",
    "run behind defense",
    "combinação médio extremo",
    "combinacao medio extremo",
    "cruzamento médio para médio",
    "cruzamento medio para medio",
    "rondo 5v3",
    "5v3",
    "rondo para aquecimento",
    "rondo para aquecimento rápido",
    "troca de bola rápida",
    "linhas de passe",
    "meio toque",
    "meios toques",
    "1 toque",
    "2 toques",
    "comunicação no rondo",
    "comunicacao no rondo",
    "movimentação após passe",
    "movimentacao apos passe",
    "variar o jogo rapidamente",
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
    "finishing transition",
    "transição ofensiva",
    "transicao ofensiva",
    "1v1",
    "2v1",
    "3v2",
    "3v3",
    "2v2",
    "superioridade numérica",
    "superioridade numerica",
    "ataques em transição",
    "ataques em transicao",
    "cross and strike",
    "cruzamento da linha central",
    "cruzamento do médio",
    "cruzamento do medio",
    "remate fora de área",
    "remate fora de area",
    "4 finishing drills",
    "finalização variada",
    "finalizacao variada",
    "mudança de cenário",
    "mudanca de cenario",
    "ataque nas costas",
    "profundidade ofensiva",
    "rondo 9v3",
    "transição após roubo",
    "transicao apos roubo",
    "reação à perda",
    "reacao a perda",
    "três balizas",
    "tres balizas",
    "goal kick",
    "goal kick 1",
    "pontapé de baliza",
    "pontape de baliza",
    "futebol direto",
    "costas da defesa",
    "passe em profundidade",
    "atrair para um lado",
    "atração para o meio",
    "atracao para o meio",
    "goal kick 2",
    "2v1 no corredor",
    "vantagem 2v1",
    "leitura da pressão",
    "leitura da pressao",
    "midfielder run behind",
    "run behind defense",
    "médios nas costas",
    "medios nas costas",
    "médios a aparecer nas costas",
    "medios a aparecer nas costas",
    "cruzamento médio para médio",
    "cruzamento medio para medio",
    "rondo 5v3",
    "5v3",
    "3v2 fast break",
    "3x2 fast break",
    "3x2 fast breaks",
    "contra-ataques rápidos",
    "contra ataques rapidos",
    "contra-ataque 3v2",
    "contra ataque 3v2",
    "decisão rápida",
    "decisao rapida",
    "variação de jogo",
    "variacao de jogo",
    "segunda bola",
    "primeiro lance cruzamento",
    "virar o jogo",
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
    "rondo 9v3",
    "pressão no rondo",
    "pressao no rondo",
    "pressão rápida",
    "pressao rapida",
    "forte recuperação",
    "forte recuperacao",
    "recuperação na perda",
    "recuperacao na perda",
    "rondo 5v3",
    "5v3",
    "pressão alta",
    "pressao alta",
    "pressão sobre o portador",
    "pressao sobre o portador",
    "forte pressão",
    "forte pressao",
    "pressão no quadrado",
    "pressao no quadrado",
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
    "finishing transition",
    "transição ofensiva",
    "transicao ofensiva",
    "finalização objetiva",
    "finalizacao objetiva",
    "jogo interior",
    "1v1",
    "2v1",
    "3v2",
    "3v3",
    "2v2",
    "ataques rápidos na finalização",
    "ataques rapidos na finalizacao",
    "cross and strike",
    "cruzamento do médio",
    "cruzamento do medio",
    "cruzamento do lateral",
    "primeiro poste",
    "segundo poste",
    "trocas na área",
    "trocas na area",
    "remate fora de área",
    "remate fora de area",
    "ataque forte na finalização",
    "ataque forte na finalizacao",
    "4 finishing drills",
    "finalização variada",
    "finalizacao variada",
    "finalização primeiro toque",
    "finalizacao primeiro toque",
    "finalização cruzada",
    "finalizacao cruzada",
    "dois pés",
    "dois pes",
    "médio ofensivo",
    "medio ofensivo",
    "avançados",
    "avancados",
    "extremos na finalização",
    "extremos na finalizacao",
    "ataque nas costas",
    "goal kick",
    "goal kick 1",
    "passe atrasado",
    "midfielder run behind",
    "run behind defense",
    "médios nas costas",
    "medios nas costas",
    "médios a aparecer nas costas",
    "medios a aparecer nas costas",
    "extremos a apoiar",
    "ataque ao segundo poste",
    "cruzamento médio para médio",
    "cruzamento medio para medio",
    "3v2 fast break",
    "3x2 fast break",
    "contra-ataque rápido",
    "contra ataque rapido",
    "bolas nas costas",
    "bola nas costas da defesa",
    "2v2 na área",
    "2v2 na area",
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
    "pontapé de baliza",
    "pontape de baliza",
    "goal kick",
    "organização defensiva",
    "organizacao defensiva",
    "defesa a bater o pontapé",
    "defesa a bater o pontape",
    "criar dúvida no avançado",
    "dúvida no avançado",
    "duvida no avancado",
    "superioridade no pontapé",
    "superioridade no pontape",
    "goal kick 2",
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
    "finishing transition",
    "transição com extremos",
    "transicao com extremos",
    "cross and strike",
    "cruzamento central",
    "linha central ofensiva",
    "4 finishing drills",
    "jogador aberto",
    "extremo na finalização",
    "extremo na finalizacao",
    "goal kick",
    "goal kick 1",
    "overlap total",
    "lateral rápido",
    "lateral rapido",
    "atrair defesa",
    "goal kick 2",
    "extremo na pressão",
    "extremo na pressao",
    "corredor lateral livre",
    "midfielder run behind",
    "run behind defense",
    "extremos a apoiar",
    "cruzamento médio para médio",
    "cruzamento medio para medio",
    "médios nas costas",
    "medios nas costas",
    "3v2 fast break",
    "3x2 fast break",
    "bola longa extremo",
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
    "4 finishing drills",
    "circuito de finalização",
    "circuito de finalizacao",
    "ritmo de finalização",
    "ritmo de finalizacao",
    "rondo 9v3",
    "aquecimento com rondo",
    "rondo com pressão",
    "rondo com pressao",
    "rondo 5v3",
    "rondo de aquecimento",
    "aquecimento com rondo",
    "futebol curto",
    "movimentos rápidos após passar a bola",
    "movimentos rapidos apos passar a bola",
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
  {
    themes: ["transition", "finishing", "wide"],
    title: "Finishing Transition",
    describe: (pl, m) => ({
      description: `O exercício inicia com 1v1, com a equipa branca em posse a atacar. Após a finalização, a equipa preta (que defendia) passa imediatamente a atacar numa situação de 2v1. Depois dessa acção, a equipa branca adiciona um jogador, criando um 3v2, voltando a atacar. Por fim, a equipa preta entra com mais um jogador, ficando 3v3, com apoio de 2 extremos fixos e bem abertos. O exercício decorre de forma contínua, com transições muito rápidas e pouco tempo entre finalizações, focando a reacção à perda e ganho de bola, tomada de decisão e aproveitamento de superioridades numéricas. (${m} min)`,
      coachingPoints:
        "Após cada finalização ou defesa, reentrada imediata na fase seguinte — sem pausa longa. Em superioridade, fixar o último defensor com passe ou condução antes do último passe ao golo. Em 3v3, extremos fixos largos: corpo aberto, cruzamento em no máximo 2 toques quando a jogada vai à banda.",
      setup:
        "Meio campo ofensivo ou ~40×32 m; 2 balizas (GR ou jogador nas traves); coletes (ex.: branco / preto); 2 extremos fixos nas laterais na fase 3v3; bolas extra junto às balizas para manter ritmo.",
      groupSplit:
        pl.length >= 12
          ? "Rotação por cores: todos passam por atacar e defender nas várias fases; extremos fixos a alternar de lado ao intervalo."
          : pl.length >= 8
            ? "Núcleo reduzido no ciclo central; jogadores extra a rodar como extremos fixos ou como 'próximo a entrar' na fase 3v3."
            : "Reduz tempos de fase ou mantém só 1v1 → 2v1 → 3v2 até haver números para 3v3+2 extremos.",
      diagramHint:
        "Sequência contínua: 1v1 à baliza → transição → 2v1 na outra → +1 branco (3v2) → +1 preto (3v3) + 2 extremos fixos abertos; setas de recuperação imediata.",
      videoUrl: FINISHING_TRANSITION_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "wide"],
    title: "Cross and Strike",
    describe: (_pl, m) => ({
      description: `O exercício inicia com troca de bola entre médio e lateral ou extremo, preparando o momento do cruzamento vindo da zona central / interior. O médio (ou quem assume o papel de cruzador desde o eixo) executa o cruzamento no timing certo, enquanto os avançados fazem movimentos cruzados para atacar o primeiro e o segundo poste. Após a primeira finalização, a bola é colocada em passe atrasado para a entrada da área, onde o médio finaliza de primeira. De seguida, o exercício repete no lado oposto. O foco está no timing das movimentações, qualidade do cruzamento e eficácia na finalização (na área e em situação de remate vindo de fora da área após o lay-off). (${m} min)`,
      coachingPoints:
        "Cruzamento com cabeça levantada e pé de apoio orientado à área; avançados a não cruzarem na mesma linha — um ataca primeiro poste, outro segundo / zona do penalty. No lay-off, apoio num ângulo aberto para o médio bater de primeira com corpo por cima da bola.",
      setup:
        "Último terço ou meio campo ofensivo (~32–38 m de profundidade); baliza ou GR; cones para marcar zona de cruzamento a partir do corredor central; bolas em cada estação; coletes.",
      groupSplit:
        "Filas: médios a cruzar e a finalizar fora da área; laterais/extremos no combinar inicial; dois avançados fixos na área por série, a rodar com o grupo.",
      diagramHint:
        "Meio/lateral ↔ troca → cruzamento desde zona central/interior → movimentos cruzados 1.º/2.º poste → remate; lay-off na entrada da área → remate médio de primeira; espelhar na outra banda.",
      videoUrl: CROSS_AND_STRIKE_VIDEO_URL,
    }),
  },
  {
    themes: ["finishing", "transition", "physical"],
    title: "4 Finishing Drills",
    describe: (pl, m) => ({
      description: `O exercício começa com o jogador aberto na largura, que recebe a bola e deve atacar rapidamente o cone (ou referência de golo) e finalizar. De seguida, recua, recebe novo passe e finaliza outra vez. Depois, realiza um movimento nas costas da defesa para receber em profundidade e finalizar de frente para o guarda-redes. Volta a recuar, recebe a bola e executa uma rotação completa do corpo para finalizar. Por fim, ataca o cone, recua e recebe um passe entre linhas, finalizando com o pé contrário ao dominante. Após completar a sequência, entra um novo avançado (ou extremo / médio ofensivo). O foco está na variedade de finalizações, movimentos ofensivos, mudança rápida de cenário e rapidez de execução, trabalhando os dois pés. (${m} min)`,
      coachingPoints:
        "Zero hesitação entre recepção e primeira acção ofensiva; cada remate com intenção (canto baixo ou zona que o GR não cobre). Na rotação do corpo, bloquear o defensor com o corpo antes de bater. Passe entre linhas com peso para o último remate sair em velocidade com o pé 'menos natural'.",
      setup:
        "Área frontal à baliza (~20–25 m de profundidade); cone ou mini-baliza como alvo inicial; GR opcional ou redes; várias bolas junto ao coach ou médios que servem; coletes para defesa de sombra nas costas (opcional).",
      groupSplit:
        pl.length >= 10
          ? "Duas filas de finalizadores a alternar; quem serve (médios / laterais) fixo num período e roda ao intervalo."
          : pl.length >= 6
            ? "Um jogador na sequência completa de cada vez; resto a servir e a recuperar bolas."
            : "Séries mais curtas por jogador; coach a alimentar passes se faltarem servidores.",
      diagramHint:
        "1) Aberto → condução ao cone → remate. 2) Recuar → remate. 3) Movimento costas defesa → profundidade → 1v1 GR. 4) Recuar → rotação 180° → remate. 5) Cone → recuar → passe entre linhas → remate pé contrário; seta rotação de jogadores.",
      videoUrl: FOUR_FINISHING_DRILLS_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "pressing", "transition"],
    title: "Rondo 9v3",
    describe: (pl, m) => ({
      description: `Joga-se um rondo em vantagem numérica de 9v3. A equipa com 9 jogadores tem como objectivo manter a posse e realizar 10 passes consecutivos, somando 1 ponto se conseguir. Se a equipa de 3 recuperar a bola, deve atacar de imediato uma das 3 mini-balizas (ou portas com cones); se marcar, também soma 1 ponto. Objectivo extra: sempre que a equipa em posse liga com o jogador no centro (meiinho), ganha +2 pontos. O foco está na circulação rápida, tomada de decisão, reacção à perda e eficácia na transição ofensiva dos 3 após recuperação. (${m} min)`,
      coachingPoints:
        "Com bola: triângulos curtos, corpo aberto, voz para pedir linha de passe; procurar o meiinho sem forçar — o +2 só vale com passe limpo ao centro. Sem bola: os 3 pressionam em cunha e, ao roubar, primeiro olhar à frente para a baliza mais livre.",
      setup:
        "Rectângulo ~28×22 m (ajusta ao espaço); 3 mini-balizas ou portas pequenas nos vértices ou linha de fundo; 1 jogador de campo fixo no centro (meiinho); coletes; bolas extra.",
      groupSplit:
        pl.length >= 14
          ? "Dois grupos 9+3 a alternar em campo; meiinho a rodar a cada 4 min."
          : pl.length >= 12
            ? "Um único bloco 9v3+1 centro; sobras a servir e a repor bolas."
            : "Reduz para 7v2+1 centro ou espaço menor; mesma lógica de pontos com 8 passes se precisares.",
      diagramHint:
        "Rectângulo; 9 no perímetro + 1 meiinho no meio; 3 coletes a pressionar; 3 alvos de golo; setas de passe rápido ao centro (+2); setas de contra-ataque aos 3 após recuperação.",
      videoUrl: RONDO_9V3_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "pressing", "physical", "transition"],
    title: "Rondo 5v3",
    describe: (pl, m) => ({
      description: `Três equipas de 5 jogadores distribuem-se por dois quadrados laterais e um setor central com 2 jogadores. O treinador inicia passando a bola a uma das equipas num dos quadrados; de imediato, 3 jogadores da equipa do setor central entram a pressionar, formando um 5v3. A equipa em posse deve realizar 5 passes consecutivos (número ajustável pelo treinador) e depois virar o jogo para a equipa do quadrado oposto, evitando a intercepção dos 3 defesas e dos 2 do centro. Se conseguir: os 2 do meio e 1 dos que pressionavam deslocam-se depressa para pressionar no outro lado, mantendo a lógica. Se a defesa recuperar: deve virar imediatamente para a equipa livre; a equipa que perdeu passa a defender com 3, mantendo 2 fixos no centro. O exercício corre de forma contínua durante 10–15 minutos. O foco está na circulação rápida, tomada de decisão, mudança de corredor, comunicação e reacção à perda/ganho de bola, com futebol curto e 1–2 toques. (${m} min)`,
      coachingPoints:
        "Em posse: corpo aberto, voz constante, linhas de passe curtas e apoio atrás e ao lado da bola; antes de virar, fixar um defensor com olhar ou passe falso. Pressão: os 3 fecham canto e canal ao portador; ao roubar, primeiro passe vertical ou para o espaço livre. Centro: os 2 leem o momento da viragem e saltam para o novo lado sem atrasar a transição.",
      setup:
        "Dois quadrados laterais (~12×12 m cada, ajustáveis) + faixa ou rectângulo central (~8×14 m) a unir as zonas; 15 jogadores de campo + treinador a servir primeira bola; coletes por equipa; várias bolas para repor ritmo.",
      groupSplit:
        pl.length >= 15
          ? "Três equipas de 5 com rotação de papéis (lateral / central / pressão) a cada 4–5 min."
          : pl.length >= 12
            ? "Reduz para 4+4+2 no centro e 2+2 a pressionar de cada lado, ou dois quadrados com menos jogadores mantendo a lógica 4v2."
            : "Espaço menor e meta de 4 passes; coach entra como neutro de ligação se faltarem jogadores.",
      diagramHint:
        "Dois quadrados laterais + zona central; seta coach→equipa A; 3 saltam do centro para 5v3; após 5 passes, viragem longa ao quadrado B; seta 2 do centro + 1 pressionador a migrar; se roubo, viragem à equipa livre e rotação de papéis defensivos.",
      videoUrl: RONDO_5V3_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "wide"],
    title: "Goal Kick 1",
    describe: (_pl, m) => ({
      description: `O exercício começa com pontapé de baliza: saída curta para o central do lado onde está o lateral mais rápido. A equipa procura atrair o adversário para o meio e para o lado direito (ou o corredor escolhido no plano), com extremo, avançado e médio a aproximarem-se para criar linhas de passe e libertar o lateral, que fica bem aberto e prepara o overlap total. O central joga no extremo ou no avançado e, nesse momento, o lateral inicia a sobreposição. O médio do lado da bola recua para bloquear / atrasar o médio adversário, abrindo espaço para a jogada. A bola segue para o trinco e é colocada em profundidade nas costas da defesa. A partir daí: o médio ofensivo ataca a profundidade — se for mais rápido, ataca o primeiro poste; se não, ataca o segundo poste para obrigar o defesa a decidir. Se o defesa sai ao portador, o médio fica livre no centro para finalizar; se o defesa acompanha o médio, o lateral progride e decide entre rematar ou assistir em passe atrasado. (${m} min)`,
      coachingPoints:
        "Reposição rápida após golo ou início de série — sem hesitar no primeiro passe. Atração com passes firmes e corpo aberto; lateral só explode no overlap quando a bola vai ao pé do extremo ou avançado. Trinco: último passe em profundidade com peso, para o médio atacar a linha sem atrasar; comunicação clara entre lateral e médio ofensivo nas leituras 1.º/2.º poste.",
      setup:
        "Meio campo real ou ~55×40 m; baliza + GR (ou jogador a simular reposição); coletes; adversário passivo ou semi-passivo com 4–5 jogadores na linha média-alta; cones opcionais para corredores.",
      groupSplit:
        "Cadeia fixa num período: GR + centrais + lateral rápido + médios + extremo + avançado + trinco; rotação de papéis ao intervalo para todos experimentarem lateral e médio ofensivo.",
      diagramHint:
        "Área pequena GR→central; setas de atração ao meio/direita; lateral largo → overlap; médio lateral recua (bloqueio); trinco → bola nas costas; médio ofensivo 1.º ou 2.º poste; bifurcação defesa ao portador vs acompanhar; lateral remate ou passe atrás.",
      videoUrl: GOAL_KICK_1_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "wide", "defensive"],
    title: "Goal Kick 2",
    describe: (_pl, m) => ({
      description: `O pontapé de baliza inicia no central do lado do extremo mais rápido, que joga no guarda-redes para este abrir com os pés. O GR lê a pressão do avançado adversário: se o avançado fecha o lado do central que bateu o pontapé, a bola entra no trinco, que de primeira liga no central que subiu, explorando o espaço livre; se o avançado pressiona de frente ao GR, o guarda-redes joga no outro central enquanto o primeiro abre com o seu lateral. Com a bola no lado oposto, cria-se espaço graças ao arrastamento do meio-campo, e o central espera o momento certo para virar o jogo. Como o avançado está mais atrasado na pressão, quem salta primeiro é o extremo, deixando o nosso lateral livre e projetado. Após o passe para o lateral: se o lateral adversário sai na pressão, o nosso extremo ataca a profundidade e cria 1v1 com o central; se não sai, o lateral progride com espaço. O foco está na leitura da pressão, criação de espaço, atrair para um lado e explorar rapidamente o corredor lateral com futebol directo. (${m} min)`,
      coachingPoints:
        "Central no pontapé: passe firme ao GR com ângulo para abrir; GR cabeça levantada e duas soluções pré-definidas conforme o trigger do avançado. Trinco: primeiro toque limpo na diagonal quando o avançado fecha o primeiro lado. Extremo: timing do 'salto' na pressão — não antes da bola sair do pé do GR/lateral. Lateral: primeira acção em linha recta ou por dentro conforme a saída do adversário.",
      setup:
        "Meio campo ou terço defensivo + transição (~50×40 m); baliza + GR; 2 centrais + laterais + trinco + extremos + médios; coletes para bloco adversário (avançado + laterais ou médios a simular pressões); bolas extra.",
      groupSplit:
        "Equipa A executa o padrão completo; equipa B roda o papel de pressão (avançado fecha vs pressiona GR). A cada 6–8 repetições, troca o central que inicia o pontapé e o corredor preferencial.",
      diagramHint:
        "Pontapé central→GR→abertura; bifurcação avançado fecha lateral vs pressiona GR; trinco liga central subido OU GR→2.º central + 1.º abre com lateral; viragem de jogo; extremo salta → lateral livre; bifurcação lateral adv. sai → extremo profundidade 1v1 vs não sai → lateral progride.",
      videoUrl: GOAL_KICK_2_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "finishing", "wide"],
    title: "Midfielder Run Behind Defense",
    describe: (_pl, m) => ({
      description: `A jogada começa com bola no médio, que liga no extremo. O extremo simula que vai abrir, mas vem para dentro e joga de primeira no avançado, que amortece para o médio em apoio. Em paralelo, o médio e o extremo do lado oposto atacam as costas da defesa, preparando a zona de finalização. O médio em posse cruza para o segundo poste, onde surgem os jogadores em movimento para finalizar. O foco está na combinação rápida na primeira zona, nos movimentos sem bola nas costas da linha e no ataque coordenado ao segundo poste. (${m} min)`,
      coachingPoints:
        "Combinação inicial: extremo vende a abertura com corpo e primeiro passo antes de cortar para dentro; avançado amortecimento orientado para o médio já em movimento. Lado oposto: arranque nas costas no timing do passe interior — não antes da bola sair. Cruzamento: cabeça levantada, bola entre GR e defesa ou à altura do 2.º poste; finalizadores chegam de fora do cone de visão do defesa.",
      setup:
        "Terço ofensivo ou meio campo atacado (~40×36 m); baliza ou GR; linha defensiva simulada (4 defesas passivos ou cones); bolas junto ao médio inicial e ao servidor de continuidade; coletes.",
      groupSplit:
        "Cadeia: médio iniciador + extremo + avançado + médio oposto + extremo oposto + 2 finalizadores no 2.º poste; rotação a cada 6–8 repetições para todos passarem por médio em posse, extremo interior e corrida nas costas.",
      diagramHint:
        "Médio A→extremo (falso largo→corte interior)→1ª no avançado→amortecimento→médio A; simultâneo médio B+extremo B corridas nas costas; médio A cruza 2.º poste→entradas finalização; seta espelhar na outra banda.",
      videoUrl: MIDFIELDER_RUN_BEHIND_DEFENSE_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "wide"],
    title: "3v2 Fast Break",
    describe: (pl, m) => ({
      description: `O exercício decorre num espaço de ~30 metros com duas balizas. Inicia com o treinador ou um médio a colocar uma bola longa no extremo oposto, fora do setor central. Este recebe e realiza um cruzamento obrigatório para a área, onde os avançados enfrentam os defesas numa situação de 2v2 para finalização. Após remate ou corte, todos transitam depressa para a outra baliza; os avançados ajustam o timing de corrida para evitar fora de jogo. De seguida, o extremo do lado contrário recebe nova bola (podendo entrar no setor central), criando um 3v2 ofensivo com bola no chão e jogo normal no interior. Após nova finalização, o exercício reinicia com outros jogadores. O foco está na velocidade de transição, na tomada de decisão e na eficácia na finalização. (${m} min)`,
      coachingPoints:
        "1.ª fase: extremo largo recebe com orientação para cruzar cedo; avançados atacam primeiro e segundo poste com arranques escalonados. Transição: sprint coletivo à outra baliza sem adiantar demasiado a linha de ataque. 2.ª fase: 3v2 com apoios curtos e penetração; explorar superioridade numérica com passes firmes e remate ou último passe limpo.",
      setup:
        "Faixa longitudinal ~30×36 m (ajustável) com baliza em cada extremo; cones para delimitar 'fora do eixo' na 1.ª entrega; várias bolas; coletes para ataque e defesa; GR ou mini-balizas opcionais.",
      groupSplit:
        pl.length >= 12
          ? "Rotação por posição: pares de avançados e defesas no 2v2; extremos alternam o primeiro e o segundo lance; fila de reposição rápida."
          : pl.length >= 8
            ? "Reduz defesas a 1v2 na área na 1.ª fase ou 2v2 com menos largura; mantém a lógica cruzamento → transição → 3v2."
            : "Escala o campo, 2v1 na área na 1.ª fase e 2v1 no segundo lance; coach como servidor e neutro no 3v2 se necessário.",
      diagramHint:
        "Bola longa ao extremo fora do eixo → cruzamento → 2v2 na área; seta transição rápida toda a equipa à baliza oposta; 2.ª bola ao extremo contrário (pode entrar ao centro) → 3v2 com bola no chão no interior; rotação de jogadores.",
      videoUrl: THREE_V_TWO_FAST_BREAK_VIDEO_URL,
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

const SINGLE_DRILL_20_MIN_TITLES = new Set<string>([
  "Offensive Between Lines",
  "9v9 + 2 Game",
  "Finishing Transition",
]);
/** Valor médio quando o treinador indica ~15–20 min (ex.: bloco final). */
const SINGLE_DRILL_18_MIN_TITLES = new Set<string>(["Double Finishing Drill"]);
const SINGLE_DRILL_15_MIN_TITLES = new Set<string>(["3v2 Fast Break"]);
const SINGLE_DRILL_10_MIN_TITLES = new Set<string>([
  "Back Four Shifting",
  "Compact Defending Transition",
  "Cross and Strike",
  "4 Finishing Drills",
  "Goal Kick 1",
  "Goal Kick 2",
  "Midfielder Run Behind Defense",
  "Rondo 5v3",
]);
const SINGLE_DRILL_8_MIN_TITLES = new Set<string>(["Passing Activation", "Dual Passing"]);
const SINGLE_DRILL_5_MIN_TITLES = new Set<string>(["Rondo 9v3"]);

function singleDrillDurationForTitle(title: string, briefLength: number): number {
  if (SINGLE_DRILL_20_MIN_TITLES.has(title)) return 20;
  if (SINGLE_DRILL_18_MIN_TITLES.has(title)) return 18;
  if (SINGLE_DRILL_15_MIN_TITLES.has(title)) return 15;
  if (SINGLE_DRILL_10_MIN_TITLES.has(title)) return 10;
  if (SINGLE_DRILL_8_MIN_TITLES.has(title)) return 8;
  if (SINGLE_DRILL_5_MIN_TITLES.has(title)) return 5;
  return briefLength > 80 ? 18 : 14;
}

function singleDrillProgressionVariationsForTitle(title: string): {
  progression: string;
  variations?: string;
} {
  const isBetweenLines = title === "Offensive Between Lines";
  const isBackFourShifting = title === "Back Four Shifting";
  const isCompactDefendingTransition = title === "Compact Defending Transition";
  const isFinishingTransition = title === "Finishing Transition";
  const isCrossAndStrike = title === "Cross and Strike";
  const isFourFinishingDrills = title === "4 Finishing Drills";
  const isDoubleFinishing = title === "Double Finishing Drill";
  const is9v9Plus2Game = title === "9v9 + 2 Game";
  const isRondo9v3 = title === "Rondo 9v3";
  const isRondo5v3 = title === "Rondo 5v3";
  const isGoalKick1 = title === "Goal Kick 1";
  const isGoalKick2 = title === "Goal Kick 2";
  const isMidfielderRunBehindDefense = title === "Midfielder Run Behind Defense";
  const is3v2FastBreak = title === "3v2 Fast Break";
  const isPassingActivation = title === "Passing Activation";
  const isDualPassing = title === "Dual Passing";

  const progression = isBetweenLines
    ? "Aperta o meio-campo (menos espaço entre linhas) ou exige 2 toques máx. depois do passe interior; aumenta largura para forçar mais metros percorridos após a rotação."
    : isBackFourShifting
      ? "Encurta o espaço entre defesa e meio para forçar linha mais alta; ou acrescenta terceiro atacante a fixar o último defesa; ou alterna quem inicia a pressão a cada 90 s."
      : isCompactDefendingTransition
        ? "Reduz o tempo máximo após recuperação (ex.: 4 toques para remate); ou acrescenta quinta baliza no eixo para forçar ainda mais fecho do meio; ou exige que só o trinco fale na reorganização durante 3 min."
        : isFinishingTransition
          ? "Encurta o tempo entre fases (apito ou grito a cada 10–15 s); ou na 1v1 obriga remate em 2 toques; ou na fase 3v3 exige que o golo venha sempre de cruzamento de extremo."
          : isCrossAndStrike
            ? "Exige cruzamento só com o pé 'fraco'; ou máximo 3 toques antes do cruzamento; ou acrescenta defensor a fechar o primeiro poste com contacto leve."
            : isFourFinishingDrills
              ? "Apito a cada 5 s entre estímulos; ou GR a sair ao jogador no 1v1; ou últimos dois remates da sequência obrigatoriamente com o pé esquerdo numa série e direito na seguinte."
              : isDoubleFinishing
                ? "Aumenta a exigência no primeiro remate (vértice mais fechado); ou obriga cruzamento só com o pé interior; ou acrescenta defensor na área com contacto leve."
                : is9v9Plus2Game
                  ? "Encosta o campo para forçar decisões mais rápidas no extremo; ou permite 3 toques no extremo em fase inicial; ou golo vale duplo se a jogada tiver mudança de corredor antes do cruzamento."
                  : isRondo9v3
                    ? "Sobe a meta a 12 passes por ponto; ou os 3 têm no máximo 4 toques para marcar após recuperação; ou meiinho só pode tocar com 1 toque."
                    : isRondo5v3
                      ? "Meta de 7 passes antes da viragem; ou máximo 6 s para o grupo de 3 roubar; ou zona central com 1 toque obrigatório para os 2 fixos."
                      : isGoalKick1
                        ? "Adversário com linha mais alta para forçar timing do overlap; ou máximo 8 s desde a reposição até ao passe em profundidade; ou lateral obrigado a cruzar com o pé interior na primeira série."
                        : isGoalKick2
                          ? "Avançado adversário com pressão dobrada (salto + sombra ao GR); ou GR com máximo 5 s para jogar; ou extremo obrigado a iniciar o movimento de pressão antes do passe ao lateral."
                          : isMidfielderRunBehindDefense
                            ? "Linha defensiva mais alta e viva; ou máximo 2 toques na combinação médio–extremo–avançado; ou cruzamento obrigatório com o pé interior na primeira série."
                            : is3v2FastBreak
                              ? "Encurta o eixo a ~24 m para decisões ainda mais rápidas; ou extremo com máximo 2 toques antes do cruzamento na 1.ª fase; ou defesa pode sair ao cruzamento com contacto leve."
                              : isPassingActivation
                              ? "Aperta distâncias entre postes para exigir passes mais curtos e reacção mais rápida; ou fixa 2 toques máx.; ou alterna o pé obrigatório em cada série."
                              : isDualPassing
                                ? "Encolhe o hexágono para forçar primeiro toque ainda mais limpo; ou acrescenta um defensor ligeiro no centro por 45 s; ou exige só combinações com o pé não dominante."
                                : "Aumenta espaço (mais difícil defender) ou reduz toques permitidos no rondo. Alterna pé fraco em passes fixos.";

  if (isDualPassing) return { progression };

  const variations = isBetweenLines
    ? "Terceira equipa de 8 a rodar; ou zona obrigatória de 'pé em campo' nos médios; ou golo vale duplo se vier de passe rasteiro entre linhas."
    : isBackFourShifting
      ? "Atacante obrigado a receber de costas; ou passe filtrado simulado com linha a subir no timing; ou capitão da linha só ele dá ordem de pressão."
      : isCompactDefendingTransition
        ? "Só duas balizas activas de cada vez (rotação a cada 90 s); ou adversário com passe obrigatório ao pivô antes de finalizar contra o bloco; ou golo na transição vale duplo se vier de passe vertical do trinco."
        : isFinishingTransition
          ? "Começar o ciclo pelo 2v1 ou 2v2; ou extremos neutros que só podem cruzar com o pé interior; ou golo nas fases 1v1 e 2v1 vale duplo."
          : isCrossAndStrike
            ? "Primeira fase só cruzamento à altura do segundo poste; ou remate de fora da área após lay-off obrigatório com o pé não dominante; ou médio e lateral trocam de papel a cada 3 repetições."
            : isFourFinishingDrills
              ? "Cone substituído por mini-baliza com GR; ou defensor leve nas costas na fase de profundidade; ou 6.º remate de cabeça após cruzamento lateral."
              : isDoubleFinishing
                ? "Segunda bola viva após o primeiro remate para forçar reacção; ou defensores a saírem na linha em 2 toques; ou contagem de golos só com assistência de lateral."
                : is9v9Plus2Game
                  ? "Extremos a trocar de lado ao intervalo; ou um extremo neutro que só pode dar largura à equipa em posse; ou limite de 5 passes antes de obrigar jogo ao extremo."
                  : isRondo9v3
                    ? "Golo dos 3 após recuperação vale duplo se vier em ≤3 toques; ou só uma baliza 'viva' de cada vez; ou equipa de 9 perde 1 ponto se o meiinho perder a bola."
                    : isRondo5v3
                      ? "Quadrados mais estreitos para forçar viragem longa; ou quarto jogador a saltar à pressão no último minuto; ou viragem obrigatória só após combinação triangular."
                      : isGoalKick1
                        ? "Espelhar toda a sequência pelo lado esquerdo; ou falso 9 a descair antes do passe ao trinco; ou profundidade obrigatoriamente em passe rasteiro (sem elevação)."
                        : isGoalKick2
                          ? "Espelhar padrão no lado esquerdo; ou trinco com 1 toque obrigatório nas duas primeiras saídas; ou lateral adversário com 'permissão' de contacto leve no duelo com o extremo."
                          : isMidfielderRunBehindDefense
                            ? "Espelhar sequência completa pelo lado esquerdo; ou defensor vivo a acompanhar uma das corridas nas costas; ou golo vale duplo se a finalização for de cabeça no 2.º poste."
                            : is3v2FastBreak
                              ? "1.ª fase só cruzamento rasteiro; ou médio/treinador serve a 2.ª bola em profundidade para o extremo entrar ao eixo; ou GR activo nas duas fases com saída ao primeiro passe."
                              : isPassingActivation
                              ? "Dois coletes com passes obrigatórios entre cores; ou inverte o sentido da rotação a cada minuto; ou acrescenta um jogador 'defensor' a tapar uma linha de passe por 30 s."
                              : "Reduz jogadores no meio; ou acrescenta neutro exterior; ou pontua por X passes seguidos.";

  return { progression, variations };
}

export function buildLocalSingleDrill(brief: string, players: Player[]): AiSingleDrill {
  const themes = detectTrainingThemes(brief);
  const seed = hashSeed(brief, 0);
  const defs = pickMainDrills(themes, 1, seed);
  const def = defs[0]!;
  const mins = singleDrillDurationForTitle(def.title, brief.length);
  const body = def.describe(players, mins);
  const { progression, variations } = singleDrillProgressionVariationsForTitle(def.title);
  const isDualPassing = def.title === "Dual Passing";

  return {
    title: def.title,
    durationMin: mins,
    objective: `Pedido: ${brief.slice(0, 120)}${brief.length > 120 ? "…" : ""}`,
    description: body.description,
    ...(body.videoUrl ? { videoUrl: body.videoUrl } : {}),
    progression,
    coachingCues: body.coachingPoints,
    ...(isDualPassing ? {} : { variations }),
    diagramHint: body.diagramHint,
  };
}

function themesToFilterCategories(themes: TrainingThemeId[]): SavedExerciseCategory[] {
  const s = new Set<SavedExerciseCategory>();
  for (const th of themes) {
    if (th === "possession") s.add("possession");
    else if (th === "transition") s.add("transition");
    else if (th === "pressing") s.add("pressing");
    else if (th === "finishing") s.add("finishing");
    else if (th === "defensive") s.add("defensive");
    else if (th === "physical") s.add("physical");
    else if (th === "wide") s.add("mixed");
    else if (th === "balanced") s.add("mixed");
  }
  if (s.size === 0) s.add("mixed");
  return [...s];
}

function primarySaveCategoryFromFilters(cats: SavedExerciseCategory[]): SavedExerciseCategory {
  const order: SavedExerciseCategory[] = [
    "goalKick",
    "finishing",
    "defensive",
    "pressing",
    "transition",
    "possession",
    "physical",
    "warmup",
    "mixed",
  ];
  for (const o of order) if (cats.includes(o)) return o;
  return "mixed";
}

export type TrainingCatalogItem = {
  catalogId: string;
  title: string;
  phase: AiTrainingPhase;
  durationMin: number;
  brief: string;
  description: string;
  coachingPoints: string;
  setup?: string;
  groupSplit?: string;
  diagramHint?: string;
  videoUrl?: string;
  progression?: string;
  variations?: string;
  /** Filtros na aba «Todos os exercícios» (OR). */
  filterCategories: readonly SavedExerciseCategory[];
  defaultSaveCategory: SavedExerciseCategory;
};

/**
 * Catálogo completo do motor local: aquecimento fixo, todos os exercícios principais (com ou sem vídeo), volta à calma.
 */
export function getTrainingCatalogItems(players: Player[]): TrainingCatalogItem[] {
  const n = Math.max(1, players.length);
  const warmDuration = 12;
  const coolDuration = 10;

  const warmup: TrainingCatalogItem = {
    catalogId: "template:warmup",
    title: "Aquecimento integrado com bola",
    phase: "warmup",
    durationMin: warmDuration,
    brief: `Mobilidade + passes em movimento (pares e triângulos); últimos 3 min com aumento de ritmo. ${n} jogadores.`,
    description: `Mobilidade + passes em movimento (pares e triângulos); últimos 3 min com aumento de ritmo. ${n} jogadores.`,
    coachingPoints: "Qualidade do passe antes da velocidade; cabeça levantada.",
    setup: "Bolsa de bolas; rectângulo 20x15 m.",
    diagramHint: "Zigzag entre cones com passe ao desmarcar.",
    filterCategories: ["warmup", "possession", "physical"],
    defaultSaveCategory: "warmup",
  };

  const cooldown: TrainingCatalogItem = {
    catalogId: "template:cooldown",
    title: "Volta à calma e alongamento activo",
    phase: "cooldown",
    durationMin: coolDuration,
    brief:
      "Caminhada 2 minutos; alongamentos dinâmicos leves em pares; respiração controlada. Hidratação e recapitulação de 1 ponto-chave do treino.",
    description:
      "Caminhada 2 minutos; alongamentos dinâmicos leves em pares; respiração controlada. Hidratação e recapitulação de 1 ponto-chave do treino.",
    coachingPoints: "Sem forçar amplitude máxima; foco em costas e posteriores de coxa.",
    setup: "Relvado ou final do campo.",
    filterCategories: ["warmup", "physical"],
    defaultSaveCategory: "warmup",
  };

  const mains: TrainingCatalogItem[] = MAIN_DRILLS.map((def) => {
    const mins = singleDrillDurationForTitle(def.title, 40);
    const body = def.describe(players, mins);
    const { progression, variations } = singleDrillProgressionVariationsForTitle(def.title);
    const brief = body.description.replace(/\s*\(\d+\s*min\)\s*\.?$/iu, "").trim();
    const fcBase = themesToFilterCategories(def.themes);
    const fc = isGoalKickExercise(def.title, body.videoUrl)
      ? [...new Set<SavedExerciseCategory>([...fcBase, "goalKick"])]
      : fcBase;
    return {
      catalogId: `main:${def.title}`,
      title: def.title,
      phase: "main" as const,
      durationMin: mins,
      brief,
      description: body.description,
      coachingPoints: body.coachingPoints,
      setup: body.setup,
      groupSplit: body.groupSplit,
      diagramHint: body.diagramHint,
      ...(body.videoUrl ? { videoUrl: body.videoUrl } : {}),
      progression,
      ...(variations !== undefined ? { variations } : {}),
      filterCategories: fc,
      defaultSaveCategory: primarySaveCategoryFromFilters(fc),
    };
  });

  return [warmup, ...mains, cooldown];
}
