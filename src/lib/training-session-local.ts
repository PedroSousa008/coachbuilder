/**
 * Geração de planos de treino no cliente — regras e templates (sem API externa).
 * Filosofia: igual ao Style of Play Helper (lógica local + dados do plantel).
 */

import type { Player, SavedExerciseCategory, TrainingAgeGroupId } from "@/types";
import {
  ensureExerciseAgeDefaults,
  resolveExerciseAgeGroupsForTitle,
  type TrainingExerciseAgeMap,
} from "@/lib/training-age-groups";
import type {
  AiFullTrainingSession,
  AiSingleDrill,
  AiTrainingBlock,
  AiTrainingPhase,
} from "@/lib/training-ai-types";
/**
 * Vídeo do exercício "Passe Entre Linhas e Ataque".
 * Coloca o ficheiro em `public/videos/training/offensive-between-lines.mp4` ou substitui por um link YouTube (URL completa).
 */
export const OFFENSIVE_BETWEEN_LINES_VIDEO_URL = "/videos/training/offensive-between-lines.mp4";

/**
 * Vídeo do exercício "Passe Entre Linhas 7v3" (7v3 + 2 balizas).
 * Coloca o ficheiro em `public/videos/training/between-the-lines.mp4`.
 */
export const BETWEEN_THE_LINES_VIDEO_URL = "/videos/training/between-the-lines.mp4";

/**
 * Vídeo do exercício "Recuperação Defensiva no Contra Ataque" (2v1 + recuperação).
 * Coloca o ficheiro em `public/videos/training/defensive-recovery.mp4`.
 */
export const DEFENSIVE_RECOVERY_ON_COUNTER_ATTACK_VIDEO_URL =
  "/videos/training/defensive-recovery.mp4";

/**
 * Vídeo do exercício "Ativação dos Passes".
 * Coloca o ficheiro em `public/videos/training/passing-activity.mp4` ou substitui por um link YouTube.
 */
export const PASSING_ACTIVATION_VIDEO_URL = "/videos/training/passing-activity.mp4";

/**
 * Vídeo do exercício "Aquecimento com Bola".
 * Coloca o ficheiro em `public/videos/training/warm-up.mp4` ou substitui por um link YouTube.
 */
export const WARM_UP_WITH_BALL_VIDEO_URL = "/videos/training/warm-up.mp4";

/**
 * Vídeo do exercício "Passe Duplo e Movimentação".
 * Coloca o ficheiro em `public/videos/training/dual-passing.mp4` ou substitui por um link YouTube.
 */
export const DUAL_PASSING_VIDEO_URL = "/videos/training/dual-passing.mp4";

/**
 * Vídeo do exercício "Jogo de 9v9 + 2".
 * Coloca o ficheiro em `public/videos/training/9v9+2.mp4` ou substitui por um link YouTube.
 */
export const NINE_V_NINE_PLUS_TWO_VIDEO_URL = "/videos/training/9v9+2.mp4";

/**
 * Vídeo do exercício "Duplo Exercício de Finalização".
 * Coloca o ficheiro em `public/videos/training/finishing-drill.mp4` ou substitui por um link YouTube.
 */
export const DOUBLE_FINISHING_DRILL_VIDEO_URL = "/videos/training/finishing-drill.mp4";

/**
 * Vídeo do exercício "Rotação de 4 Defesas a Pressionar".
 * Coloca o ficheiro em `public/videos/training/back-four-shifting.mp4` ou substitui por um link YouTube.
 */
export const BACK_FOUR_SHIFTING_VIDEO_URL = "/videos/training/back-four-shifting.mp4";

/**
 * Vídeo do exercício "Transição Defensiva Compacta".
 * Coloca o ficheiro em `public/videos/training/compact-defending-transition.mp4` ou substitui por um link YouTube.
 */
export const COMPACT_DEFENDING_TRANSITION_VIDEO_URL =
  "/videos/training/compact-defending-transition.mp4";

/**
 * Vídeo do exercício "Transição com Finalização".
 * Coloca o ficheiro em `public/videos/training/transition-finishing.mp4` ou substitui por um link YouTube.
 */
export const FINISHING_TRANSITION_VIDEO_URL = "/videos/training/transition-finishing.mp4";

/**
 * Vídeo do exercício "Cruzamento e Finalização fora da Área".
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
 * Vídeo do exercício "Constante abertura de Rondo".
 * Coloca o ficheiro em `public/videos/training/breakout-rondo.mp4` ou substitui por um link YouTube.
 */
export const BREAKOUT_RONDO_VIDEO_URL = "/videos/training/breakout-rondo.mp4";

/**
 * Vídeo do exercício "Transição (2+1)v1".
 * Coloca o ficheiro em `public/videos/training/2+1v1-transition.mp4` ou substitui por um link YouTube.
 */
export const TWO_PLUS_ONE_V_ONE_TRANSITION_VIDEO_URL = "/videos/training/2+1v1-transition.mp4";

/**
 * Vídeo do exercício "De Construção para Contra Ataque ".
 * Coloca o ficheiro em `public/videos/training/build-up-into-counter-attack.mp4` ou substitui por um link YouTube.
 */
export const BUILD_UP_INTO_COUNTER_ATTACK_VIDEO_URL = "/videos/training/build-up-into-counter-attack.mp4";

/**
 * Vídeo do exercício "Recuperação de Bola no Rondo para Finalização".
 * Coloca o ficheiro em `public/videos/training/fitness-rondo-finishing.mp4` ou substitui por um link YouTube.
 */
export const FITNESS_RONDO_INTO_FINISHING_VIDEO_URL = "/videos/training/fitness-rondo-finishing.mp4";

/**
 * Vídeo do exercício "Rondo para Contra Ataque".
 * Coloca o ficheiro em `public/videos/training/rondo-to-counter.mp4` ou substitui por um link YouTube.
 */
export const RONDO_TO_COUNTER_ATTACK_VIDEO_URL = "/videos/training/rondo-to-counter.mp4";

/**
 * Vídeo do exercício "Pontapé de Baliza 1".
 * Coloca o ficheiro em `public/videos/training/goal-kick-1.mp4` ou substitui por um link YouTube.
 */
export const GOAL_KICK_1_VIDEO_URL = "/videos/training/goal-kick-1.mp4";

/**
 * Vídeo do exercício "Pontapé de Baliza 2".
 * Coloca o ficheiro em `public/videos/training/goal-kick-2.mp4` ou substitui por um link YouTube.
 */
export const GOAL_KICK_2_VIDEO_URL = "/videos/training/goal-kick-2.mp4";

/**
 * Vídeo do exercício "Corrida do Meio Campo nas Costas da Defesa".
 * Coloca o ficheiro em `public/videos/training/behind-defense.mp4` ou substitui por um link YouTube.
 */
export const MIDFIELDER_RUN_BEHIND_DEFENSE_VIDEO_URL = "/videos/training/behind-defense.mp4";

/**
 * Vídeo do exercício "Transição Rápida 3v2".
 * Coloca o ficheiro em `public/videos/training/3x2-fast-breaks.mp4` ou substitui por um link YouTube.
 */
export const THREE_V_TWO_FAST_BREAK_VIDEO_URL = "/videos/training/3x2-fast-breaks.mp4";

/**
 * Vídeo do exercício "Exercício de Finalização 3v2".
 * Coloca o ficheiro em `public/videos/training/3v2-finishing-drill.mp4` ou substitui por um link YouTube.
 */
export const THREE_V_TWO_FINISHING_DRILL_VIDEO_URL = "/videos/training/3v2-finishing-drill.mp4";

/**
 * Vídeo do exercício "Ataque com 5 Equipas 3v3".
 * Coloca o ficheiro em `public/videos/training/3v3-5-teams.mp4`.
 */
export const FIVE_TEAMS_3V3_ATTACKING_VIDEO_URL = "/videos/training/3v3-5-teams.mp4";

/**
 * Vídeo do exercício "Rondo com Organização Fixa Posicional".
 * Coloca o ficheiro em `public/videos/training/fixed-position-rondo.mp4`.
 */
export const FIXED_POSITION_RONDO_VIDEO_URL = "/videos/training/fixed-position-rondo.mp4";

/**
 * Vídeo do exercício "Aquecimento com Bola - Movimentação".
 * Coloca o ficheiro em `public/videos/training/aquecimento-com-movimentação.mp4`.
 */
export const WARM_UP_WITH_MOVEMENT_VIDEO_URL = "/videos/training/aquecimento-com-movimentação.mp4";

/**
 * Vídeo do exercício "Variação de Posse de Bola com base na Pressão".
 * Coloca o ficheiro em `public/videos/training/variacao-jogo.mp4` (ASCII; evita 404 por NFD/NFC no deploy).
 */
export const VARIACAO_POSSE_PRESSAO_VIDEO_URL = "/videos/training/variacao-jogo.mp4";

/**
 * Vídeo do exercício "Combinações e Passe de Rotura".
 * Coloca o ficheiro em `public/videos/training/passe-rotura.mp4`.
 */
export const PASSE_ROTURA_COMBINACOES_VIDEO_URL = "/videos/training/passe-rotura.mp4";

/**
 * Vídeo do exercício "Combinações sob Pressão".
 * Coloca o ficheiro em `public/videos/training/combinacoes-pressao.mp4`.
 */
export const COMBINACOES_SOB_PRESSAO_VIDEO_URL = "/videos/training/combinacoes-pressao.mp4";

/**
 * Vídeo do exercício "Canto Curto: Newcastle".
 * Coloca o ficheiro em `public/videos/training/short-corner-newcastle.mp4`.
 */
export const SHORT_CORNER_BY_NEWCASTLE_VIDEO_URL = "/videos/training/short-corner-newcastle.mp4";

/**
 * Vídeo do exercício "Canto Curto: Empoli".
 * Coloca o ficheiro em `public/videos/training/short-corner-empoli.mp4`.
 */
export const SHORT_CORNER_BY_EMPOLI_VIDEO_URL = "/videos/training/short-corner-empoli.mp4";

/**
 * Vídeo do exercício "Canto Curto Estudado".
 * Coloca o ficheiro em `public/videos/training/short-corner.mp4` ou substitui por um link YouTube.
 */
export const SHORT_CORNER_ROUTINE_VIDEO_URL = "/videos/training/short-corner.mp4";

/**
 * Vídeo do exercício "Livre Direto Estudado ".
 * Coloca o ficheiro em `public/videos/training/free-kick-routine.mp4`.
 */
export const FREE_KICK_ROUTINE_VIDEO_URL = "/videos/training/free-kick-routine.mp4";

/**
 * Vídeo do exercício "Livre Direto Estudado: Movimentação do Extremo".
 * Coloca o ficheiro em `public/videos/training/short-free-kick.mp4`.
 */
export const SHORT_FREE_KICK_WINGER_MOVEMENT_VIDEO_URL = "/videos/training/short-free-kick.mp4";

/**
 * Vídeo do exercício "Situações de 1v1".
 * Coloca o ficheiro em `public/videos/training/1v1-situations.mp4`.
 */
export const ONE_V_ONE_SITUATIONS_VIDEO_URL = "/videos/training/1v1-situations.mp4";

/**
 * Vídeo do exercício "Passe e Movimentação".
 * Coloca o ficheiro em `public/videos/training/pass-move.mp4`.
 */
export const PASS_AND_MOVE_VIDEO_URL = "/videos/training/pass-move.mp4";

/**
 * Vídeo do exercício "Reação e Finalização".
 * Coloca o ficheiro em `public/videos/training/reaction-finishing.mp4`.
 */
export const REACTION_AND_FINISHING_VIDEO_URL = "/videos/training/reaction-finishing.mp4";

/**
 * Vídeo do exercício "Drible Rápido e Passe".
 * Coloca o ficheiro em `public/videos/training/dribbling-passing.mp4`.
 */
export const DRIBBLING_FAST_AND_PASS_VIDEO_URL = "/videos/training/dribbling-passing.mp4";

/**
 * Vídeo do exercício "Posse de Bola com Transição".
 * Coloca o ficheiro em `public/videos/training/possession-transfer.mp4`.
 */
export const POSSESSION_BALL_WITH_TRANSITION_VIDEO_URL = "/videos/training/possession-transfer.mp4";

/**
 * Vídeo do exercício "Sair a Jogar da Defesa com Pressão".
 * Coloca o ficheiro em `public/videos/training/sair-jogar.mp4`.
 */
export const PLAYING_OUT_FROM_BACK_UNDER_PRESSURE_VIDEO_URL = "/videos/training/sair-jogar.mp4";

/**
 * Vídeo do exercício "Jogo do Galo".
 * Coloca o ficheiro em `public/videos/training/jogo-galo.mp4`.
 */
export const TIC_TAC_TOE_GAME_VIDEO_URL = "/videos/training/jogo-galo.mp4";

/**
 * Vídeo do exercício "Movimentação dentro de Área em Cruzamentos".
 * Coloca o ficheiro em `public/videos/training/movimentação-cruzamento.mp4`.
 */
export const MOVIMENTACAO_AREA_CRUZAMENTOS_VIDEO_URL =
  "/videos/training/movimentação-cruzamento.mp4";

/**
 * Vídeo do exercício "Variação de Cruzamentos".
 * Coloca o ficheiro em `public/videos/training/variação-cruzamentos.mp4`.
 */
export const VARIACAO_CRUZAMENTOS_VIDEO_URL = "/videos/training/variação-cruzamentos.mp4";

/**
 * Vídeo do exercício "Variações para Cruzamento".
 * Coloca o ficheiro em `public/videos/training/crossing-drill.mp4`.
 */
export const CROSSING_DRILL_VIDEO_URL = "/videos/training/crossing-drill.mp4";

/**
 * Vídeo do exercício "3 Cenários 5v5".
 * Coloca o ficheiro em `public/videos/training/3-cenarios.mp4`.
 */
export const THREE_SCENARIOS_5V5_VIDEO_URL = "/videos/training/3-cenarios.mp4";

/**
 * Vídeo do exercício "Ataque após sucessão de passes".
 * Coloca o ficheiro em `public/videos/training/possession-to-attack.mp4`.
 */
export const POSSESSION_TO_ATTACK_VIDEO_URL = "/videos/training/possession-to-attack.mp4";

/**
 * Vídeo do exercício "4v4 + Apoios Laterais".
 * Coloca o ficheiro em `public/videos/training/4v4-4-teams.mp4`.
 */
export const FOUR_V_FOUR_FOUR_TEAMS_VIDEO_URL = "/videos/training/4v4-4-teams.mp4";

/**
 * Vídeo do exercício "Superioridade nos Setores".
 * Coloca o ficheiro em `public/videos/training/superioridade-setores.mp4`.
 */
export const SUPERIORIDADE_SETORES_VIDEO_URL = "/videos/training/superioridade-setores.mp4";

/**
 * Vídeo do exercício "Overlap do Lateral: Avançado ".
 * Coloca o ficheiro em `public/videos/training/full-back-overlap-2.mp4` ou substitui por um link YouTube.
 */
export const FULL_BACK_OVERLAP_STRIKER_VIDEO_URL = "/videos/training/full-back-overlap-2.mp4";
export const FULL_BACK_OVERLAP_WINGER_VIDEO_URL = "/videos/training/full-back-overlap-1.mp4";

/** Vídeo do exercício "Exercício de Pressão". Coloca o ficheiro em `public/videos/training/pressing-exercise.mp4`. */
export const PRESSING_EXERCISE_VIDEO_URL = "/videos/training/pressing-exercise.mp4";

/** Vídeo do exercício "Circuito de Construção para Quebrar Linhas". `public/videos/training/circuito.mp4`. */
export const CIRCUITO_CONSTRUCAO_QUEBRAR_LINHAS_VIDEO_URL = "/videos/training/circuito.mp4";

/** Vídeo do exercício "Saída de Jogo com Finalização Rápida". `public/videos/training/kick-off.mp4`. */
export const KICK_OFF_FAST_FINISH_VIDEO_URL = "/videos/training/kick-off.mp4";

/** Vídeo do exercício "Rondo com Variação do Jogo". `public/videos/training/virar-jogo-rondo.mp4`. */
export const VIRAR_JOGO_RONDO_VIDEO_URL = "/videos/training/virar-jogo-rondo.mp4";

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
    "aquecimento com bola movimentacao",
    "aquecimento com bola movimentação",
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
    "fixed position rondo",
    "rondo posicional",
    "posições definidas",
    "posicoes definidas",
    "movimentação sem bola",
    "movimentacao sem bola",
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
    "breakout rondo",
    "build up into counter attack",
    "build-up-into-counter-attack",
    "inferioridade na saída",
    "inferioridade na saida",
    "contra ataque",
    "contra-ataque",
    "superioridade no ataque",
    "superioridade numérica no ataque",
    "superioridade numerica no ataque",
    "fitness rondo into finishing",
    "rondo to counter attack",
    "rondo to counter",
    "2+1v1 transition",
    "(2+1)v1 transition",
    "passe e movimentacao",
    "passe e movimentação",
    "rececao",
    "receção",
    "apoio constante",
    "rapidez de execução",
    "rapidez de execucao",
    "reação e finalização",
    "reacao e finalizacao",
    "2v1",
    "estimulo de cor",
    "estímulo de cor",
    "mini baliza",
    "comando de cor",
    "drible rápido e passe",
    "drible rapido e passe",
    "velocidade com bola",
    "receção orientada",
    "rececao orientada",
    "qualidade no primeiro toque",
    "3v1",
    "fitness rondo",
    "rondo com finalização",
    "rondo com finalizacao",
    "passes rápidos",
    "passes rapidos",
    "posse de bola com transicao",
    "posse de bola com transição",
    "posse com transicao",
    "posse com transição",
    "viragem de jogo",
    "ligar jogo pelo chao",
    "ligar jogo pelo chão",
    "balizas laterais",
    "mini balizas",
    "posse sob pressão",
    "posse sob pressao",
    "jogo curto com finalização rápida",
    "jogo curto com finalizacao rapida",
    "breakout",
    "rondo breakout",
    "dois quadrados",
    "quadrado interior",
    "quadrado exterior",
    "6 passes",
    "seis passes",
    "9v6",
    "reação à perda",
    "reacao a perda",
    "finalização em poucos segundos",
    "finalizacao em poucos segundos",
    "tempo de decisão",
    "tempo de decisao",
    "inteligência de jogo",
    "inteligencia de jogo",
    "movimentação após passe",
    "movimentacao apos passe",
    "variar o jogo rapidamente",
    "warm up with ball",
    "início de treino",
    "inicio de treino",
    "movimentação com bola",
    "movimentacao com bola",
    "canto curto",
    "jogada estudada",
    "bola parada",
    "short corner routine",
    "controlo de bola",
    "controle de bola",
    "ativação",
    "ativacao",
  ],
  transition: [
    "transição",
    "transicao",
    "posse de bola com transicao",
    "posse de bola com transição",
    "posse com transicao",
    "posse com transição",
    "viragem de jogo",
    "ligar jogo pelo chao",
    "ligar jogo pelo chão",
    "balizas laterais",
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
    "5 teams",
    "five teams",
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
    "recuperação de bola rápida",
    "recuperacao de bola rapida",
    "decisão após recuperação",
    "decisao apos recuperacao",
    "reação rápida à perda",
    "reacao rapida a perda",
    "2+1v1 transition",
    "(2+1)v1 transition",
    "aparecer à entrada da área",
    "aparecer a entrada da area",
    "finalização rápida",
    "finalizacao rapida",
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
    "canto curto",
    "short corner",
    "corner short",
    "rondo 5v3",
    "5v3",
    "breakout rondo",
    "build up into counter attack",
    "fitness rondo into finishing",
    "rondo to counter attack",
    "2+1 v1",
    "4v2",
    "contra ataque",
    "recuperação rápida",
    "recuperacao rapida",
    "resistência",
    "resistencia",
    "2v1",
    "9v6",
    "3v2",
    "3v2 fast break",
    "3x2 fast break",
    "3x2 fast breaks",
    "contra-ataques rápidos",
    "contra ataques rapidos",
    "contra-ataque 3v2",
    "contra ataque 3v2",
    "3v2 finishing drill",
    "vantagem numérica",
    "vantagem numerica",
    "decisão rápida",
    "decisao rapida",
    "variação de jogo",
    "variacao de jogo",
    "segunda bola",
    "primeiro lance cruzamento",
    "virar o jogo",
    "movimentacao dentro de area em cruzamentos",
    "3 atacantes contra 1",
    "bola aerea nas costas",
    "cruzamento overlap",
    "variacoes para cruzamento",
    "coordenacao lateral extremo",
    "3 cenarios 5v5",
    "golo vale x2",
    "reposicao rapida treinador",
    "apenas passes para a frente",
    "primeira equipa a marcar 3 golos",
    "ataque rapido",
    "ataque apos sucessao de passes",
    "possession to attack",
    "4v4 mais apoios",
    "4v4 apoios laterais",
    "sai imediatamente",
    "equipa de fora entra",
    "superioridade nos setores",
    "ataque apos sucessao de passes",
    "sucessao de passes",
    "7 passes consecutivos",
    "6v2 posse",
    "5v4 ofensivo",
    "organizacao ofensiva e defensiva",
    "superioridade ofensiva",
    "reconhecimento de superioridade",
    "organizacao ofensiva",
    "organização ofensiva",
    "variacao de cruzamentos",
    "tres equipas",
    "3 equipas",
    "devolucao interior",
    "combinacao exterior",
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
    "breakout rondo",
    "build up into counter attack",
    "fitness rondo into finishing",
    "rondo to counter attack",
    "6v3",
    "3v2",
    "3 setores",
    "3 sectores",
    "3 em pressão",
    "3 em pressao",
    "pressão alta",
    "pressao alta",
    "pressão sobre o portador",
    "pressao sobre o portador",
    "forte pressão",
    "forte pressao",
    "pressão no quadrado",
    "pressao no quadrado",
    "pressing exercise",
    "segunda bola",
    "2ª bola",
    "2a bola",
    "saída adversária",
    "saida adversaria",
    "jogo longo",
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
    "movimentacao dentro de area em cruzamentos",
    "cruzamento em 2 toques",
    "timming",
    "timing do cruzamento",
    "variacao de cruzamentos",
    "variacoes para cruzamento",
    "3 cenarios 5v5",
    "golo vale duplo",
    "bloco alto",
    "underlap",
    "underlap do extremo",
    "underlap do lateral",
    "primeiro poste segundo poste",
    "4v4 mais apoios",
    "finalizacoes rapidas",
    "finalizações rápidas",
    "jogo interior",
    "apoios exteriores",
    "superioridade ofensiva",
    "reconhecimento de superioridade",
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
    "3v2 finishing drill",
    "3v2 finishing",
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
    "inferioridade numérica",
    "inferioridade numerica",
    "3v2 finishing drill",
    "1v1",
    "1v1 situations",
    "situações de 1v1",
    "situacoes de 1v1",
    "jogo rápido",
    "jogo rapido",
    "drible",
    "reação",
    "reacao",
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
    "warm up with ball",
    "warm up",
    "início de treino",
    "inicio de treino",
    "movimentação com bola",
    "movimentacao com bola",
    "controlo de bola",
    "controle de bola",
    "ativação",
    "ativacao",
    "1v1 situations",
    "1v1",
    "jogo rápido",
    "jogo rapido",
    "movimentos rápidos e objetivos",
    "movimentos rapidos e objetivos",
    "reação",
    "reacao",
    "drible",
    "passe e movimentacao",
    "passe e movimentação",
    "rececao",
    "receção",
    "apoio constante",
    "rapidez de execução",
    "rapidez de execucao",
    "reação e finalização",
    "reacao e finalizacao",
    "2v1",
    "estimulo de cor",
    "estímulo de cor",
    "mini baliza",
    "comando de cor",
    "drible rápido e passe",
    "drible rapido e passe",
    "velocidade com bola",
    "receção orientada",
    "rececao orientada",
    "qualidade no primeiro toque",
    "4v4 mais apoios",
    "apoios exteriores 1 toque",
    "competitividade",
    "espaco reduzido",
    "espaço reduzido",
    "superioridade nos setores",
    "progressao por corredores",
    "progressão por corredores",
  ],
  balanced: [],
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

const TITLE_MATCH_STOP_WORDS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "com",
  "de",
  "do",
  "dos",
  "da",
  "das",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "por",
  "um",
  "uma",
]);

function stemPtToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("oes")) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("aes")) return `${token.slice(0, -3)}ao`;
  if (token.endsWith("is") && token.length > 4) return `${token.slice(0, -2)}il`;
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function titleMatchTokens(text: string): string[] {
  return norm(text)
    .split(/[^a-z0-9]+/g)
    .map((t) => stemPtToken(t.trim()))
    .filter((t) => t.length > 0 && !TITLE_MATCH_STOP_WORDS.has(t));
}

function scoreDrillTitleMatchInObjective(
  objective: string,
  title: string
): { score: number; idx: number } {
  const objectiveNorm = norm(objective);
  const titleNorm = norm(title);
  const exactIdx = objectiveNorm.indexOf(titleNorm);
  if (exactIdx >= 0) return { score: 100, idx: exactIdx };

  const titleTokens = titleMatchTokens(title);
  const objectiveTokens = new Set(titleMatchTokens(objective));
  if (titleTokens.length === 0 || objectiveTokens.size === 0) return { score: 0, idx: Number.MAX_SAFE_INTEGER };

  let overlap = 0;
  for (const t of titleTokens) if (objectiveTokens.has(t)) overlap += 1;
  const ratio = overlap / titleTokens.length;
  if (overlap < 2 || ratio < 0.66) return { score: 0, idx: Number.MAX_SAFE_INTEGER };

  let idx = Number.MAX_SAFE_INTEGER;
  for (const t of titleTokens) {
    const i = objectiveNorm.indexOf(t);
    if (i >= 0 && i < idx) idx = i;
  }
  if (idx === Number.MAX_SAFE_INTEGER) idx = objectiveNorm.length;
  return { score: Math.round(ratio * 10), idx };
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
    themes: ["physical", "possession", "balanced"],
    title: "Aquecimento com Bola",
    describe: (pl, m) => ({
      description: `Os jogadores conduzem a bola, passam por 2 cones em drible e, após realizar o passe para um colega, saem imediatamente em sprint para o espaço livre. O exercício decorre de forma contínua, focando a coordenação, controlo de bola e aceleração após passe. (${m} min)`,
      coachingPoints:
        "Condução com toques próximos e cabeça levantada nos cones; passe firme e jogável ao colega; arranque explosivo no instante após o passe, atacando espaço livre sem colidir com o próximo par.",
      setup: "Rectângulo ou corredor ~20×15 m (ajustável); 2 cones por repetição + bolas suficientes para fluidez; filas ou rotação em pares.",
      groupSplit:
        pl.length >= 10
          ? "Dois corredores paralelos com filas alternadas; rotação de papéis condução / recepção / sprint."
          : pl.length >= 6
            ? "Um corredor; pares a alternar quem conduz e quem oferece o alvo de passe."
            : "Espaço menor; coach como parede de passe ou neutro se faltarem jogadores.",
      diagramHint: "Condução → slalom 2 cones → passe ao colega → sprint imediato ao espaço; rotação contínua.",
      videoUrl: WARM_UP_WITH_BALL_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "balanced"],
    title: "Ativação dos Passes",
    describe: (pl, m) => ({
      description: `Circuito dinâmico de aquecimento focado em coordenação, agilidade e ativação física. Os jogadores passam por diferentes estações em sequência: escada de agilidade (skipping rápido, frequência elevada de pés); cones (contornar rapidamente, mudanças de direção); barreira de mobilidade (saltos com os dois pés, explosão e coordenação); cones finais (sprint em vaivém com aceleração e travagem rápida). O foco está na mobilidade, velocidade de pés, coordenação e preparação física para o treino. (${m} min)`,
      coachingPoints:
        "Qualidade de apoios nos saltos e na escada (não \"atropelar\" padrões); mudanças de direção baixas e explosivas nos cones; saltos na barreira com estabilidade no aterragem; vaivém final com aceleração máxima e travagem controlada; ritmo elevado com técnica limpa.",
      setup:
        "Linha ou circuito com escada de agilidade (ou marcas no chão), série de cones para slalom, barreira/hurdle baixo para saltos bilaterais e zona final para vaivém em sprint; distâncias ajustáveis ao espaço disponível.",
      groupSplit:
        pl.length >= 14
          ? "Duas filas em circuitos paralelos (mesma sequência), escalonadas no arranque para evitar cruzamentos na zaga de saltos."
          : pl.length >= 8
            ? "Uma fila por estação com rotação ao fim do percurso; repetições contínuas com descanso activo ao regressar ao início."
            : "Circuito mais curto ou duas passagens por estação; treinador pode dar o ritmo com apito a cada troca.",
      diagramHint:
        "Sequência linear: escada → slalom cones → saltos barreira → vaivém sprint final; seta de retorno ao ponto inicial entre séries.",
      videoUrl: PASSING_ACTIVATION_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "transition", "balanced"],
    title: "Situações de 1v1",
    describe: (pl, m) => ({
      description: `Colocam-se 2 cones de partida afastados cerca de 5 metros, com 5 cones centrais alinhados a dividir os dois lados. Nas laterais ficam 2 balizas pequenas. Dois jogadores arrancam em simultâneo em direção aos cones centrais, sendo que um parte com bola e outro sem bola. Quando se encontram frente a frente, inicia-se o 1v1: o jogador com bola deve ultrapassar o adversário e entrar em sprint por uma das balizas laterais, enquanto o defensor tenta recuperar ou desarmar. Após cada ação entram os jogadores seguintes, e os que terminaram trocam funções (atacante passa a defender e vice-versa). O foco está na reação, drible, agressividade defensiva e intensidade no aquecimento. (${m} min)`,
      coachingPoints:
        "Arranque explosivo nos primeiros metros, cabeça levantada antes do duelo, atacar o defensor com intenção (finta curta + mudança de velocidade), finalizar a ação com sprint decidido para uma baliza lateral; defensor reage rápido, encurta espaço e temporiza sem mergulhar cedo no desarme.",
      setup:
        "2 cones de partida com ~5 m entre si; 5 cones centrais em linha como zona de encontro; 2 mini-balizas laterais; bolas na linha de partida do atacante.",
      groupSplit:
        pl.length >= 10
          ? "Duas filas por lado (atacantes e defensores) para manter ritmo alto; rotação contínua ataque ↔ defesa a cada repetição."
          : pl.length >= 6
            ? "Uma fila de atacantes e uma de defensores; quem termina troca de função e vai para o fim da fila oposta."
            : "Espaço reduzido com séries curtas (20–30s) e recuperação ativa entre repetições.",
      diagramHint:
        "Partida em 2 cones (5 m) → corrida aos 5 cones centrais → duelo 1v1 → atacante sai em sprint para mini-baliza lateral; rotação de papéis no fim.",
      videoUrl: ONE_V_ONE_SITUATIONS_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "possession", "balanced"],
    title: "Passe e Movimentação",
    describe: (pl, m) => ({
      description: `Colocam-se 2 cones afastados 10 metros, com um quadrado no centro. Dentro do quadrado começa 1 jogador, enquanto os restantes se posicionam nos cones exteriores. A bola inicia num jogador exterior, que passa ao jogador dentro do quadrado. Este joga de primeira, devolvendo a bola, e sai de seguida para fora do quadrado. O jogador exterior que recebeu volta a passar para esse colega que abriu fora do quadrado e corre para ocupar o espaço central, recebendo novamente para dar continuidade ao exercício. Regras: máximo de 2 toques para os jogadores exteriores e jogador no quadrado sempre em 1 toque. O foco está na qualidade de passe, mobilidade, apoio constante e rapidez de execução. (${m} min)`,
      coachingPoints:
        "Passe tenso e orientado ao pé de apoio; jogador central prepara o corpo antes da receção para devolver de primeira com qualidade; exterior controla no máximo em 2 toques e já acelera a próxima linha de passe; mobilidade constante para não haver linhas mortas.",
      setup:
        "2 cones exteriores com ~10 m de distância; quadrado central marcado com cones (4–6 m de lado); 1 bola por estação e bolas de reposição.",
      groupSplit:
        pl.length >= 10
          ? "Dois quadrados em paralelo para alta repetição; rotação contínua exterior → centro → exterior."
          : pl.length >= 6
            ? "Um quadrado com fila curta; alternar sentido de passe a cada 2–3 minutos."
            : "Espaço reduzido com foco técnico e ritmo controlado; treinador pode servir bola de reposição.",
      diagramHint:
        "Cones exteriores (10 m) + quadrado central; passe exterior → centro (1 toque) → devolução → passe para colega que abriu → exterior ocupa centro; rotação contínua.",
      videoUrl: PASS_AND_MOVE_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "finishing", "balanced"],
    title: "Reação e Finalização",
    describe: (pl, m) => ({
      description: `O exercício é realizado com 2 equipas em simultâneo, competindo entre si, necessitando no mínimo 16 jogadores. Existem 2 quadrados idênticos, cada um com 4 cones nos vértices (cores iguais nos dois campos, mas em posições diferentes), uma mini baliza e 1 jogador junto à baliza. Em cada quadrado começa uma situação de 2v1, onde os 2 jogadores em posse devem manter a bola o máximo de tempo possível em espaço reduzido. Se conseguirem manter a posse durante o tempo definido, aguardam o comando do treinador, que grita uma das 4 cores. De imediato, os jogadores devem identificar o cone correto e passar para o colega colocado nesse vértice. Esse jogador finaliza de primeira na mini baliza. Se marcar, soma 1 ponto. O exercício continua logo de seguida: o jogador junto à baliza entra em ação e espera movimentação dos 2 colegas para combinar e tentar nova finalização de primeira, enquanto o defensor tenta impedir. Se marcarem, somam mais 1 ponto. Se a dupla perder a posse antes do comando, falha a primeira fase, mas pode continuar a disputar a segunda oportunidade de pontuar. Após cada ronda: os 2 jogadores do centro trocam com 2 jogadores dos vértices e o defensor troca com o jogador que estava junto à baliza. O foco está na posse sob pressão, reação ao estímulo, rapidez mental, finalização e competitividade. (${m} min)`,
      coachingPoints:
        "Dupla em posse com linhas de passe curtas e apoio angular constante; leitura rápida do estímulo de cor sem perder qualidade técnica; passe final tenso para remate de primeira; após a primeira finalização, atacar logo a segunda fase com mobilidade e decisão rápida para finalizar antes do defensor estabilizar.",
      setup:
        "Dois quadrados idênticos (um por equipa), 4 cones coloridos nos vértices de cada quadrado, 1 mini-baliza por campo, 1 jogador de apoio junto à baliza, bolas de reposição junto ao treinador.",
      groupSplit:
        pl.length >= 16
          ? "Dois campos em paralelo com rotação contínua: 2 no centro, 1 defensor, 1 junto à baliza e 2 nos vértices activos em cada ronda."
          : pl.length >= 12
            ? "Um campo principal com rondas mais curtas e competição por tempo/pontos; equipa de espera roda por função a cada série."
            : "Versão reduzida em 1 campo com menos vértices activos, mantendo o estímulo de cor e as 2 fases de finalização.",
      diagramHint:
        "2 quadrados paralelos com 4 cones coloridos; no centro 2v1 em posse; comando de cor -> passe ao vértice chamado -> finalização 1 na mini-baliza; fase 2 com apoio do jogador junto à baliza para nova finalização; rotação de papéis por ronda.",
      videoUrl: REACTION_AND_FINISHING_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "balanced"],
    title: "Drible Rápido e Passe",
    describe: (pl, m) => ({
      description: `Os jogadores recebem a bola de forma orientada e devem conduzi-la rapidamente através de um percurso de cones, controlando a velocidade e a mudança de direção. Após ultrapassar os cones, realizam um passe preciso para a mini baliza. De seguida, vão buscar a bola e regressam em condução rápida até à posição inicial para repetir o exercício. O foco está na condução em velocidade, agilidade, qualidade do primeiro toque e consistência no passe. (${m} min)`,
      coachingPoints:
        "Primeira receção sempre orientada para o corredor livre; condução com mudanças curtas de direção sem perder velocidade; levantar cabeça antes do passe final para acertar na mini baliza; recuperar bola rápido e regressar com intensidade controlada para manter ritmo contínuo.",
      setup:
        "Percurso com cones em slalom/corredor, mini baliza no final da ação, bolas de reposição no ponto de partida e zona de retorno marcada para não cruzar trajetórias.",
      groupSplit:
        pl.length >= 10
          ? "Dois corredores em paralelo para reduzir espera; rotação contínua com saídas alternadas."
          : pl.length >= 6
            ? "Um corredor principal com partidas intervaladas de 2–3 segundos."
            : "Espaço reduzido com menos cones e foco em qualidade técnica + ritmo constante.",
      diagramHint:
        "Receção orientada -> condução rápida em slalom de cones -> passe à mini baliza -> recolha da bola -> retorno em condução ao início; ciclo contínuo.",
      videoUrl: DRIBBLING_FAST_AND_PASS_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "pressing", "physical", "balanced"],
    title: "Posse de Bola com Transição",
    describe: (pl, m) => ({
      description: `O exercício é composto por 3 equipas de 5 jogadores e dividido em 2 setores. Num dos lados joga-se uma situação de 5v3, enquanto a terceira equipa aguarda no setor oposto. A equipa de 5 em posse deve circular a bola e ligar jogo pelo chão através das balizas laterais para a equipa que está à espera no outro setor. Os 3 defensores procuram recuperar a bola e marcar nas mini balizas. Se conseguirem, trocam imediatamente de função: passam a ser a equipa em posse e a equipa que perdeu a bola passa a defender. Se a equipa em posse conseguir virar o jogo com sucesso para o outro setor, 2 jogadores da equipa que estava no setor central entram a pressionar, juntamente com 1 dos 3 defensores que já estava em ação. O exercício continua com transições constantes. O foco está na posse sob pressão, mudança de corredor, reação à perda e intensidade nas transições. (${m} min)`,
      coachingPoints:
        "Equipa em posse: circulação rápida com corpo aberto, passes rasteiros e decisões curtas; procurar sempre o corredor livre antes da viragem; após viragem bem-sucedida, 2 jogadores saltam à pressão com ângulo e distância corretos (não em linha). Defensores: pressão coordenada ao portador, sombra ao passe interior e recuperação agressiva para mini-balizas; após golo/recuperação, transição imediata de papéis sem pausa longa.",
      setup:
        "Dois setores rectangulares lado a lado (ex. 25×18 m cada, ajustável); mini-balizas nas extremidades laterais como 'portas' de viragem; 2–3 bolas de reposição; coletes para 3 equipas de 5.",
      groupSplit:
        pl.length >= 15
          ? "3×5 com rotação por tempo (cada bloco 3–4 min) para manter intensidade e clareza de funções."
          : pl.length >= 12
            ? "Reduzir para 4v2+1 ou 4v3 no setor de posse e equipa de espera com 4; manter a lógica de viragem e pressão pós-viragem."
            : "Versão reduzida em 1 setor com 3v2+neutro e viragem simulada com cones; treinador dá estímulo de pressão após cada passe lateral.",
      diagramHint:
        "Setor A: 5v3 em posse; setor B: equipa à espera; balizas laterais como canal de viragem; após viragem, +2 pressam do setor central +1 defensor; rotação contínua de equipas.",
      videoUrl: POSSESSION_BALL_WITH_TRANSITION_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "pressing", "finishing", "balanced"],
    title: "Sair a Jogar da Defesa com Pressão",
    describe: (pl, m) => ({
      description: `O exercício divide-se em 2 setores, cada um com balizas de 11. Em cada setor joga-se uma situação de 4v2, composta por guarda-redes, trinco e 2 jogadores de linha (centrais, médios ou laterais), contra 2 adversários que estão a pressionar (avançados ou extremos). O trinco pode mover-se apenas na horizontal, procurando estar sempre disponível para oferecer linha de passe. A equipa em posse tem como objetivo manter a bola o máximo de tempo possível; cada sequência de 10 passes vale 1 ponto. A equipa defensora procura recuperar a bola e atacar rapidamente uma das 2 balizas. Após a recuperação, pode entrar 1 jogador adicional do setor, criando uma situação de 3v2 ofensivo. O foco está na saída sob pressão, criação de linhas de passe, reação à perda e transição rápida para finalizar. (${m} min)`,
      coachingPoints:
        "Na posse: orientar receção para o lado livre, usar o trinco como apoio horizontal constante e alternar ritmo curto/longo para tirar pressão. Sem bola: pressão coordenada por dentro para fora, ataque imediato à baliza após recuperação e decisão rápida no 3v2 para finalizar antes da reorganização adversária.",
      setup:
        "2 setores com balizas de 11, cada setor com estrutura base de 4v2 (GR + trinco + 2 jogadores de linha vs 2 pressionantes), 2 balizas alvo para transição ofensiva após recuperação e bolas de reposição junto aos guarda-redes.",
      groupSplit:
        pl.length >= 15
          ? "Três equipas de 5: duas em exercício simultâneo (um setor cada) e rotação por séries curtas de 2–3 minutos."
          : pl.length >= 12
            ? "Dois setores com 4v2 fixo e rotação de pressing a cada 60–90 segundos; jogador extra entra apenas no momento de recuperação."
            : "Versão reduzida em 1 setor com 3v2+GR e regra de 6 passes por ponto; manter transição 3v2 com entrada de 1 apoio após recuperação.",
      diagramHint:
        "Dois setores paralelos em 4v2 de saída; trinco com deslocamento horizontal; contagem de 10 passes = 1 ponto; após recuperação, entrada de +1 atacante e transição 3v2 para finalização.",
      videoUrl: PLAYING_OUT_FROM_BACK_UNDER_PRESSURE_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "balanced"],
    title: "Jogo do Galo",
    describe: (pl, m) => ({
      description: `O exercício adapta o clássico Jogo do Galo ao contexto do futebol. Existem 2 equipas, que competem para completar uma sequência de 3 em linha (horizontal, vertical ou diagonal). Cada equipa utiliza coletes de cor diferente ou, idealmente, bolas de cores distintas. Os jogadores saem rapidamente, colocam a bola/cor no espaço pretendido e regressam, entrando depois o colega seguinte. O objetivo é decidir rapidamente onde jogar para criar a própria sequência ou bloquear a adversária. O foco está na velocidade, reação, inteligência, visão de jogo e tomada de decisão sob pressão. (${m} min)`,
      coachingPoints:
        "Saída explosiva ao sinal, leitura rápida do tabuleiro antes de correr, comunicação curta entre colegas para não duplicar decisão e controlo da respiração para manter velocidade e clareza mental em repetições seguidas.",
      setup:
        "Tabuleiro 3x3 marcado no chão com cones/discos, 2 conjuntos de coletes (ou bolas de cores diferentes), linha de partida para cada equipa a 6–10 m do tabuleiro e bolas de reposição para ritmo contínuo.",
      groupSplit:
        pl.length >= 10
          ? "Duas equipas com rotação rápida de 1 jogador por ação; quem termina volta ao fim da fila e o colega seguinte parte de imediato."
          : pl.length >= 6
            ? "Equipas curtas (3–4) com rondas mais frequentes; reduzir distância de partida para manter intensidade."
            : "Versão reduzida com treinador a lançar estímulo verbal ('atacar' ou 'bloquear') antes de cada saída.",
      diagramHint:
        "Tabuleiro 3x3 ao centro; duas filas opostas; cada sprint coloca colete/bola numa casa; objetivo: completar 3 em linha ou bloquear adversário.",
      videoUrl: TIC_TAC_TOE_GAME_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "physical", "balanced"],
    title: "Passe Duplo e Movimentação",
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
    themes: ["physical", "possession", "balanced"],
    title: "Aquecimento com Bola - Movimentação",
    describe: (pl, m) => ({
      description: `Os jogadores posicionam-se em circulação, abrindo para receber a bola em largura. Devem receber bem orientados e, em máximo de 2 toques, realizar de imediato o passe para o colega seguinte. Após o passe, o jogador sai em sprint para o cone vazio, mantendo rotação constante e intensidade no exercício. O foco está na receção orientada, qualidade de passe, mobilidade e aceleração após ação técnica. (${m} min)`,
      coachingPoints:
        "Receção orientada com o corpo aberto para jogar para a frente do circuito; máximo de 2 toques (controlar e soltar); passe tenso e jogável no pé de apoio; sprint imediato ao cone vazio após passe sem quebrar ritmo do grupo.",
      setup:
        "Círculo ou quadrado alargado com cones (1 cone vazio em permanência), bolas suficientes para reposição rápida e coletes por subgrupos.",
      groupSplit:
        pl.length >= 12
          ? "Dois circuitos paralelos para manter alta intensidade e poucas esperas."
          : pl.length >= 8
            ? "Um circuito com rotação contínua e reposição de bola no ponto inicial."
            : "Espaço reduzido com menos cones; treinador serve como apoio para manter ritmo.",
      diagramHint:
        "Jogadores em circuito com 1 cone vazio; passe em 2 toques máx.; após passe sprint para o cone livre; rotação contínua.",
      videoUrl: WARM_UP_WITH_MOVEMENT_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "possession", "pressing", "balanced"],
    title: "Variação de Posse de Bola com base na Pressão",
    describe: (pl, m) => ({
      description: `O exercício utiliza 5 cones distribuídos desde a área até à linha de meio-campo. Idealmente participam 4 treinadores como elementos de pressão (mínimo 2). No primeiro cone colocam-se 3 jogadores com bola, nos restantes fica 1 jogador por cone. A jogada inicia com passe para um colega que vem receber sob pressão de um treinador. Esse jogador devolve de primeira e movimenta-se para a frente. A bola segue para o jogador mais aberto, que também toca de primeira para o jogador do meio. Depois disso, o jogador aberto contorna por fora e prepara-se para receber novamente, tendo de analisar a posição do treinador e decidir: se o treinador pressiona o jogador aberto, explorar o espaço pelo meio; se o treinador fecha o meio, jogar no jogador aberto. Se a opção for exterior, o jogador no meio-campo recebe orientado, vira o jogo e aproxima-se para fazer 1-2, conduzindo depois até ao final. Se a opção for interior, o jogador do lado oposto aproxima-se, joga de primeira para o jogador do meio-campo, e cria-se uma combinação com movimento nas costas da pressão e overlap, terminando também em condução final. Após cada passe, os jogadores deslocam-se sempre para o cone seguinte. O foco está na tomada de decisão, perceção da pressão, qualidade técnica e mobilidade constante. (${m} min)`,
      coachingPoints:
        "Antes da bola chegar, ler o corpo do treinador-pressor e o espaço livre; máximo 1–2 toques com receção orientada; decisão clara interior vs exterior sem hesitar; após a combinação, condução firme até ao fim do percurso; após cada passe, sprint curto ao cone seguinte para manter fluidez e ritmo.",
      setup:
        "Cinco cones em linha desde a grande área até à linha de meio-campo; bolas suficientes; 2 a 4 treinadores (ou staff) como pressores activos; distâncias ajustáveis à idade e ao espaço disponível.",
      groupSplit:
        pl.length >= 12
          ? "Dois circuitos paralelos (mesma lógica), com pressores a alternarem de lado a cada bloco de 2–3 minutos."
          : pl.length >= 8
            ? "Um circuito completo; rotação de quem inicia com bola nos 3 do primeiro cone; pressores com intensidade escalonada (sombra → pressão activa)."
            : "Reduzir a 4 cones ou usar 2 pressores com pausas curtas; treinador pode ser parede de passe no arranque se faltarem jogadores.",
      diagramHint:
        "Linha de 5 cones (área → meio); 3 jogadores no 1.º cone com bola + 1 em cada cone seguinte; pressores entre linhas; fluxo: passe sob pressão → devolução de primeira → jogador aberto decide meio vs exterior → 1-2 e condução final; rotação ao cone seguinte.",
      videoUrl: VARIACAO_POSSE_PRESSAO_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "possession", "transition", "balanced"],
    title: "Combinações e Passe de Rotura",
    describe: (pl, m) => ({
      description: `O exercício realiza-se em 2 lados em simultâneo, cada um com a sua bola, utilizando 5 posições ou cones: CB, CDM, RB/LB, CM e RW/LW. A jogada começa no CB, que passa ao CDM. Este joga de primeira no lateral (RB/LB) e sobe ligeiramente para voltar a dar linha de passe. O lateral toca de primeira no CM, que recebe de costas e deixa também de primeira no CDM, agora de frente para o jogo. No momento em que o CM solta a bola, o extremo inicia a rotura nas costas da defesa, acelerando para receber no espaço. O CDM coloca a bola em profundidade e, após receber, o extremo faz passe para o início do circuito do lado oposto. Após a ação, cada jogador roda para a posição onde realizou o primeiro passe. O foco está no jogo a um toque, timing da desmarcação, apoio frontal e passe de rotura. (${m} min)`,
      coachingPoints:
        "CB e CDM com corpo aberto e passe tenso na hora; lateral em 1 toque com apoio curto para voltar a oferecer linha; CM de costas a orientar o primeiro toque para o CDM já virado; extremo a arrancar no timing do último toque do CM (sem partir cedo); passe de rotura na medida (altura e força) para correr à bola; após a combinação, passe rasteiro firme ao início do outro lado; comunicação curta nas rotações de posição.",
      setup:
        "Dois meios-campos espelhados (ou dois corredores paralelos), cada um com 5 cones/marcas para CB, CDM, lateral, CM e extremo; 2 bolas (uma por lado); distâncias ajustáveis à idade.",
      groupSplit:
        pl.length >= 14
          ? "Dois grupos completos (5+5) em paralelo com rotação de funções a cada 3–4 minutos."
          : pl.length >= 10
            ? "Um lado completo e o segundo lado com funções duplas (treinador como CB ou extremo) para manter o padrão."
            : "Um só corredor com bola única e rotação mais lenta; foco em qualidade de timing e passe de rotura.",
      diagramHint:
        "CB → CDM → lateral (1 toque) → CM de costas → CDM virado → rotura do extremo → profundidade do CDM → passe ao CB do lado oposto; rotação: cada um avança para a posição do primeiro passe que deu.",
      videoUrl: PASSE_ROTURA_COMBINACOES_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "possession", "pressing", "balanced"],
    title: "Combinações sob Pressão",
    describe: (pl, m) => ({
      description: `Utilizam-se os dois lados do campo, com 7 cones em cada lado, permitindo trabalho em simultâneo. O objetivo é criar triangulações constantes, circulação rápida e decisões em poucos segundos conforme a pressão do treinador. Os jogadores devem ler o estímulo: se o treinador fecha por dentro, explorar a largura; se fecha por fora, jogar pelo meio-campo. O exercício inclui movimentações verticais, passes longos e desmarcações para receber, mantendo dinâmica contínua. Regra técnica: máximo de 2 toques por jogador. O foco está na tomada de decisão, perceção espacial, qualidade de passe e mobilidade ofensiva. (${m} min)`,
      coachingPoints:
        "Cabeça levantada antes da receção para ver o treinador e o espaço; decisão rápida largura vs meio; passes firmes e orientados (pé de apoio); apoios em triângulo sempre disponíveis; respeitar o limite de 2 toques sem sacrificar segurança; ritmo alto com comunicação curta.",
      setup:
        "Dois meios-campos ou dois rectângulos paralelos; 7 cones por lado (marcar triangulações e corredores); 2 bolas (uma por lado); treinadores/staff como referência de pressão entre linhas.",
      groupSplit:
        pl.length >= 16
          ? "Dois grupos completos em paralelo com rotação de função ou de lado a cada 3 minutos."
          : pl.length >= 10
            ? "Um lado a ritmo pleno e o segundo com elenco reduzido ou treinador a completar uma posição."
            : "Um só lado com uma bola; aumentar pausa entre séries para manter qualidade técnica.",
      diagramHint:
        "Dois lados espelhados com 7 cones cada; triangulações; setas de circulação rápida; treinador a fechar dentro vs fora → resposta largura ou meio; máximo 2 toques.",
      videoUrl: COMBINACOES_SOB_PRESSAO_VIDEO_URL,
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
    themes: ["defensive", "pressing", "balanced"],
    title: "Rotação de 4 Defesas a Pressionar",
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
    title: "Transição Defensiva Compacta",
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
    themes: ["transition", "finishing", "pressing", "possession", "defensive"],
    title: "Recuperação Defensiva no Contra Ataque",
    describe: (pl, m) => ({
      description: `O exercício (${m} min) começa com a bola num defesa junto à linha de fundo. À frente estão 2 jogadores ofensivos (preferencialmente avançados, extremos ou médios) prontos para receber, com 1 defesa atrás deles (lateral ou trinco). O central coloca a bola num dos atacantes e inicia-se uma situação de 2v1 em direção à baliza. Ao mesmo tempo, o jogador que estava atrás arranca em sprint para recuperar posição e condicionar a jogada. Os atacantes devem aproveitar a superioridade numérica e finalizar o mais rápido possível, antes da chegada do segundo defensor. O foco está na decisão rápida, eficácia no último passe e na finalização, e na recuperação defensiva em velocidade.`,
      coachingPoints:
        "Atacantes: primeiro toque orientado ao golo ou ao espaço livre; não prolongar o 2v1 — remate ou último passe limpo em poucos toques. Defensor inicial: atrasar sem faltar; escolher momento para pressionar ou fechar linha de passe. Recuperador: trajetória directa ao eixo da jogada, cabeça levantada para não cometer falta ao cortar; comunicar 'vai' ou 'segura' ao colega.",
      setup:
        "Corredor ou meio último terço ~28–36 m de profundidade até à baliza; baliza ou GR; cones para linha de fundo e zona de arranque do recuperador; bolas junto ao central que serve.",
      groupSplit:
        pl.length >= 12
          ? "Filas: centrais a servir; pares ofensivos a rodar; defensor do 2v1 e recuperador a alternar a cada 4–6 repetições."
          : pl.length >= 8
            ? "Mesma lógica com grupos mais curtos; coach como servidor na linha de fundo se faltarem defesas."
            : "Reduz a largura; 1 atacante + neutro de apoio no 2v1 ou recuperador parte mais tarde para manter desafio.",
      diagramHint:
        "Defesa com bola na linha de fundo; central a jogar num dos 2 atacantes à frente; 1 defesa atrás deles; seta 2v1 à baliza; em paralelo seta de sprint do recuperador a fechar; finalização rápida.",
      videoUrl: DEFENSIVE_RECOVERY_ON_COUNTER_ATTACK_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "possession"],
    title: "Passe Entre Linhas e Ataque",
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
    themes: ["possession", "pressing", "finishing", "transition"],
    title: "Passe Entre Linhas 7v3",
    describe: (pl, m) => ({
      description: `Situação de jogo 7v3 (${m} min): a equipa com superioridade numérica (7) procura marcar golo em duas balizas pequenas, defendidas pelos 3 jogadores adversários. Os 3 defensores não podem permanecer parados à frente das balizas: são obrigados a ajustar posicionamentos e a pressionar o portador da bola. A equipa em posse deve circular bola e jogadores rapidamente, procurando criar espaço e encontrar o passe entre linhas defensivas para finalizar. A bola deve ser jogada sempre no chão; não é permitido levantar. Sempre que os 3 jogadores sofrem golo, saem e entram outros 3 que estão de fora. Após uma série definida, trocam-se as equipas, mantendo-se o jogador extra como elemento neutro ou de apoio. O foco está na circulação rápida, mobilidade, criação de linhas de passe e reação defensiva em inferioridade numérica.`,
      coachingPoints:
        "Em posse: corpo aberto, combinações curtas e linhas de passe entre defensores; procurar o homem livre entre linhas antes de finalizar nas mini-balizas. Defensores: pressionar o portador e deslizar — nunca bloquear as balizas de forma estática. Neutro: jogo sempre a favor da equipa em posse; não finalizar. Após golo, reinício rápido e rotação dos 3 conforme combinado.",
      setup:
        "Rectângulo ou meio-campo ~40×30 m (ajustável); 2 mini-balizas pequenas; 1 jogador neutro ou de apoio ao centro; bolas extra para manter ritmo alto.",
      groupSplit:
        pl.length >= 14
          ? "Rotação dos 3 defensores por cada golo sofrido ou a cada 90 s; bloco de 7 mantém-se; neutro fixo 4–5 min antes de trocar."
          : pl.length >= 10
            ? "Reduz para 6v3+1 neutro ou rectângulo mais curto; mesma lógica de entrada dos 3 após golo."
            : "Espaço menor; coach como neutro ou 5v2+1 no mesmo modelo.",
      diagramHint:
        "7 em posse com bola no chão; 3 a pressionar sem bloquear balizas; 2 mini-balizas; setas de passe entre linhas e finalização; neutro entre quadrantes.",
      videoUrl: BETWEEN_THE_LINES_VIDEO_URL,
    }),
  },
  {
    themes: ["wide", "finishing", "possession"],
    title: "Jogo de 9v9 + 2",
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
    title: "Duplo Exercício de Finalização",
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
    title: "Transição com Finalização",
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
    title: "Cruzamento e Finalização fora da Área",
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
    themes: ["transition", "finishing", "wide"],
    title: "Movimentação dentro de Área em Cruzamentos",
    describe: (pl, m) => ({
      description: `O exercício trabalha movimentações ofensivas na área e precisão no cruzamento. O médio inicia a jogada colocando uma bola aérea nas costas da defesa para o lateral. O lateral deve receber e, em no máximo 2 toques, preparar e executar o cruzamento rapidamente. Na área existe uma situação de 3 atacantes contra 1 defesa: os avançados coordenam movimentos para atacar zonas de finalização e criar espaço. Após cada jogada, trocam os atacantes e o defensor; após ~10 minutos num corredor, repete-se no lado oposto. O foco está na qualidade do cruzamento, no timing das movimentações e na eficácia na finalização. (${m} min)`,
      coachingPoints:
        "Cruzamento com pé de apoio orientado à área e cabeça levantada; lateral a decidir em ≤2 toques. Avançados com rotas distintas (1.º/2.º poste, zona do penalty) sem colarem na mesma linha; overlap e desmarques para puxar o defensor. Defesa activa mas controlada; repor rápido após remate para manter ritmo.",
      setup:
        "Corredor lateral + grande área ou zona final (~½ campo ajustável); baliza ou GR; cones opcionais para linha de cruzamento; bolas junto ao médio que serve; coletes.",
      groupSplit:
        pl.length >= 12
          ? "Rotação: após cada repetição entram novo trio de ataque e outro defensor; dois corredores activos em espelho após o bloco de 10 min."
          : pl.length >= 8
            ? "Mesma lógica com menos filas: médio e lateral a rodar; defensor fixo 3–4 repetições antes de trocar."
            : "Reduzir a 2 atacantes vs 1 ou acrescentar neutro de apoio ao cruzamento; coach como servidor se faltar médio.",
      diagramHint:
        "Médio → bola aérea nas costas da linha → lateral recebe → cruzamento em ≤2 toques → 3 atacantes vs 1 defesa na área; seta para espelhar na outra banda.",
      videoUrl: MOVIMENTACAO_AREA_CRUZAMENTOS_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "wide"],
    title: "Variação de Cruzamentos",
    describe: (pl, m) => ({
      description: `O exercício divide os jogadores em 3 equipas, que competem entre si para marcar mais golos. Em todas as jogadas, os 3 atacantes repetem a mesma estrutura de movimentos: ataque ao primeiro poste, à zona central e ao segundo poste. Variações de arranque: (1) Combinação exterior + cruzamento de primeira — o jogador aberto combina com o colega em apoio interior e cruza de primeira; (2) Cruzamento após devolução interior — médio passa ao extremo ou lateral, recebe a devolução e cruza de imediato (ritmo ao estilo Kevin De Bruyne); (3) Um-dois no lado oposto + cruzamento — no corredor contrário, lateral ou extremo faz 1-2 com o treinador e cruza de primeira. As equipas alternam nas execuções e somam pontos por cada golo. O foco está na qualidade do cruzamento, no timing de entrada na área e na eficácia na finalização. (${m} min)`,
      coachingPoints:
        "Trio na área disciplinado: um ataca 1.º poste, outro zona do penalty, outro 2.º poste — sem colapsar na mesma linha. Cruzamento com intenção (largura da área, segundo poste ou remate cruzado); apoio interior a receber em aberto para a devolução rápida. Competir com fair-play: repor bola depressa e rodar equipas para volume de repetições.",
      setup:
        "Grande área ou zona final com dois corredores largos; baliza e GR (ou mini-balizas); coletes para 3 equipas; bolas junto ao coach e às estações laterais; referências opcionais para linha de cruzamento.",
      groupSplit:
        pl.length >= 15
          ? "Três equipas de 5 (ou 4+1) a alternar: uma ataca com cruzamento, as outras defendem / esperam; rotação a cada X golos ou minutos."
          : pl.length >= 12
            ? "Três equipas mais curtas; reduz defensores ou usa neutro de apoio no 1-2 com o treinador."
            : "Duas equipas + coach como terceira referência; ou reduz a 2 atacantes na área mantendo as mesmas variações de cruzamento.",
      diagramHint:
        "3 equipas; setas 1.º poste / central / 2.º poste; três vias de cruzamento (combinação exterior, devolução interior, 1-2 com treinador na banda oposta); pontuação por golo.",
      videoUrl: VARIACAO_CRUZAMENTOS_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "finishing", "wide"],
    title: "Variações para Cruzamento",
    describe: (pl, m) => ({
      description: `O exercício trabalha as relações e movimentações entre lateral e extremo, com duas variações de underlap. 1ª Variação — Underlap do extremo: o lateral mantém-se bem aberto, enquanto o extremo ocupa uma posição mais interior para fechar espaço e dar apoio. A jogada começa com uma tabela entre central e médio-centro, seguida de passe do central no lateral. O lateral conduz e espera pelo underlap do extremo nas costas da defesa; no timing certo, coloca a bola no espaço para o extremo entrar em zona de cruzamento/finalização. Na área entram os 2 avançados (movimentos cruzados) e o médio do lado da bola na entrada da área. 2ª Variação — Underlap do lateral: o extremo fica aberto e o lateral posiciona-se por dentro. Após a tabela entre central e médio, o central joga nas costas do lateral para o extremo que vem receber. O extremo conduz e espera pelo momento em que o lateral ultrapassa o defesa/manequim em underlap; a bola entra no lateral, que em 1 ou 2 toques deve cruzar rapidamente. Na área surgem novamente os 2 avançados e o médio do lado da bola. O foco está no timing das desmarcações, coordenação lateral-extremo, exploração do espaço interior e qualidade do cruzamento. (${m} min)`,
      coachingPoints:
        "1.ª variação: lateral aberto e paciente; extremo interior a fechar e a atacar o underlap só no timing do passe em profundidade; cruzamento com pé orientado à área. 2.ª variação: extremo aberto a conduzir; lateral por dentro a ultrapassar no underlap; cruzamento em 1–2 toques sem atrasar. Avançados com rotas distintas (1.º poste, penalty, 2.º poste); médio a chegar na entrada da área no momento do cruzamento.",
      setup:
        "Último terço ou meio campo ofensivo (~35–42 m de profundidade); baliza ou GR; manequins ou defesas leves na linha do underlap; cones para corredores lateral/extremo; bolas em cada estação.",
      groupSplit:
        pl.length >= 14
          ? "Filas por função: centrais e médios na tabela; pares lateral/extremo a rodar após cada sequência completa (1.ª e 2.ª variação); dois avançados + médio do lado a alternar na área."
          : pl.length >= 10
            ? "Mesma estrutura com menos filas; coach como central ou defesa de referência se faltarem jogadores."
            : "Reduz a um corredor; 1 avançado + médio na área ou neutro de apoio; foco na qualidade do underlap antes do volume.",
      diagramHint:
        "Tabela central–médio → passe ao lateral ou extremo conforme variação; seta underlap (extremo ou lateral) → passe em profundidade → cruzamento → 2 avançados + médio na área; repetir na 2.ª variação com papéis invertidos.",
      videoUrl: CROSSING_DRILL_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "physical"],
    title: "4v4 + Apoios Laterais",
    describe: (pl, m) => ({
      description: `O exercício decorre num campo curto com duas balizas de 11, envolvendo 4 equipas de 4 jogadores. Jogam 2 equipas no interior (4v4), enquanto as outras 2 aguardam fora do campo. A equipa que sofre golo sai de imediato, entrando uma das equipas que está de fora. Os 8 jogadores exteriores funcionam como apoios: 4 nas linhas laterais e 4 junto às balizas (um de cada lado em cada baliza). Os apoios exteriores só podem jogar com 1 toque, acelerando o ritmo. O foco está em finalizações rápidas, decisões em espaço reduzido, uso dos apoios exteriores, velocidade mental e intensidade competitiva. (${m} min)`,
      coachingPoints:
        "No interior: primeiro olhar à baliza, apoios curtos e remates decisivos; evitar conduções longas no sítio. Apoios exteriores: corpo aberto, comunicação, passe firme de primeira — se precisarem de 2 toques, repõe-se a bola com fair-play. Transição ao golo: equipa que sofreu sai rápido pela linha lateral; a que entra já posicionada para não atrasar o jogo.",
      setup:
        "Campo reduzido proporcional à idade (ex. ~32–40×20–24 m); 2 balizas de 11 com GR ou jogadores nas traves; 4 coletes distintos; bolas extra fora do campo para repor.",
      groupSplit:
        pl.length >= 24
          ? "4×4 jogadores de equipa + 8 apoios fixos (4 laterais + 4 junto às balizas); rotação automática ao golo."
          : pl.length >= 16
            ? "4 equipas de 4 sem apoios dedicados: jogadores de fora cumprem 1 toque como 'linha viva' ou reduz para 3 equipas de 4 com 1 neutro em cada lateral."
            : "3 equipas de 4 ou 4v4 simples com coach + 1–2 jogadores como apoios de 1 toque nas linhas.",
      diagramHint:
        "Rectângulo central 4v4; 4 apoios nas linhas laterais; 2+2 junto às balizas (fundo); seta: golo → equipa sai → equipa de fora entra.",
      videoUrl: FOUR_V_FOUR_FOUR_TEAMS_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "finishing", "physical"],
    title: "3 Cenários 5v5",
    describe: (pl, m) => ({
      description: `Jogo competitivo 5v5 com regras variáveis num campo reduzido com 2 balizas grandes. O objetivo é ser a primeira equipa a marcar 3 golos; a vencedora mantém-se em campo e a derrotada sai, sendo substituída por uma equipa que está fora a realizar trabalho físico (abdominais, sprints, etc.). Após cada golo muda a regra: 1ª — Golo vale x2 se todos os jogadores estiverem à frente da linha da área (bloco alto, agressividade ofensiva e reação rápida); 2ª — Reposição rápida do treinador: após golo, nova bola imediata para a equipa que marcou (intensidade, pressão e velocidade de transição); 3ª — Apenas passes para a frente: só passes em progressão (decisões rápidas, jogo direto, mobilidade ofensiva e duelos 1v1). O foco está na competitividade, intensidade, reação rápida, pressão ofensiva e tomada de decisão em espaço reduzido. (${m} min)`,
      coachingPoints:
        "1.ª regra: linha da área como referência — todos à frente antes do remate para valer duplo; atacar com bloco alto e recuperação imediata se perder. 2.ª regra: equipa que marca recebe bola do treinador sem esperar pelo GR; transição ofensiva em ≤3 toques quando possível. 3.ª regra: passes só em progressão (sem recuar com a bola); comunicar a mudança de regra após cada golo. Equipa de fora: trabalho físico curto e intenso; entrada rápida ao apito para não atrasar o jogo.",
      setup:
        "Campo reduzido proporcional à idade (ex. ~40–50×30–35 m); 2 balizas grandes com GR ou jogadores nas traves; 3 equipas de 5 com coletes distintos; linha da área marcada com cones; bolas extra com o treinador para a 2.ª regra.",
      groupSplit:
        pl.length >= 15
          ? "3×5 em campo; rotação vencedor fica / derrotado sai + equipa de fora com trabalho físico; alternar GR ou neutro se necessário."
          : pl.length >= 12
            ? "2 equipas de 5 + terceira reduzida (4v4+1 neutro) ou 4v4 com jogadores de fora a rodar após 2 golos."
            : "4v4 com regras por blocos de tempo em vez de por golo; coach como terceira referência ou trabalho físico simbólico.",
      diagramHint:
        "Rectângulo 5v5; 3 equipas; após golo → mudança de regra (x2 com bloco alto / reposição coach / passes só para a frente); vencedor mantém, derrotado sai → equipa de fora entra.",
      videoUrl: THREE_SCENARIOS_5V5_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "finishing"],
    title: "Ataque após sucessão de passes",
    describe: (pl, m) => ({
      description: `Exercício por setores com posse e transição ofensiva. Uma equipa defende a baliza de 11 e a outra ataca; a defensora procura recuperar e finalizar em 2 balizas pequenas. O campo divide-se em 2 setores. No primeiro, um retângulo onde a equipa atacante tem superioridade 6v2: os 6 mantêm-se nas laterais, circulam a bola e tentam completar 7 passes consecutivos. Após os 7 passes, a bola entra no segundo setor (n.º 10/falso 9, avançado e 2 extremos) numa situação inicial 4v4; o jogador que fez o passe de ligação pode avançar, transformando a jogada em 5v4 ofensivo para atacar rapidamente a baliza de 11. Se a defesa recuperar, os 2 pressores no retângulo saem e junta-se superioridade ofensiva para atacar as 2 mini-balizas. O foco está na posse sob pressão, ligação entre setores, transição ofensiva rápida e reação à recuperação. (${m} min)`,
      coachingPoints:
        "No retângulo 6v2: largura nas laterais, passes curtos e ritmo para contar 7 seguidos sem perder; decisão clara no 7.º passe para o 2.º setor. No 4v4→5v4: quem liga entra com velocidade; falso 9/10 a ligar extremos e avançado; remate ou último passe em ≤6–8 s após entrada no 2.º setor. Na recuperação defensiva: os 2 do retângulo saem de imediato; transição compacta para as 2 mini-balizas com superioridade numérica e poucos toques.",
      setup:
        "Mais de meio campo em 2 setores; retângulo delimitado no 1.º setor; baliza de 11 + 2 mini-balizas; coletes de 2 cores; bolas extra com o treinador; linha de transição entre setores bem marcada.",
      groupSplit:
        pl.length >= 16
          ? "Estrutura completa 6+2 no retângulo, 4+1 no 2.º setor e defesa à baliza + 2 pressores; rodar funções (posse, ligação, extremos, defesa) a cada 5–6 min."
          : pl.length >= 12
            ? "Reduzir a 5v2 no retângulo ou meta de 5 passes antes de ligar; manter 5v4 no 2.º setor com neutro de apoio se faltarem jogadores."
            : "Simplificar para 4v2 + 5 passes e 3v3+1 no 2.º setor; 1 mini-baliza na transição defensiva.",
      diagramHint:
        "Setor 1: retângulo 6v2 nas laterais → 7 passes → passe ao setor 2 (4v4: 10, avançado, 2 extremos) → entrada do passador (5v4) → finalização à baliza 11; recuperação → 2 pressores saem + superioridade → 2 mini-balizas.",
      videoUrl: POSSESSION_TO_ATTACK_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "physical"],
    title: "Superioridade nos Setores",
    describe: (pl, m) => ({
      description: `O exercício realiza-se em mais de meio campo, dividido em 4 setores: setor central (5v4), corredor esquerdo (2v2 + 1 apoio vindo do setor central), corredor direito (2v2 + 1 apoio vindo do setor central) e setor ofensivo (3v4 + entradas de apoio dos restantes setores). A jogada começa no setor central, com saída de bola do guarda-redes, procurando circular e encontrar a melhor linha de passe para ligar num dos corredores laterais. Quando a bola entra no corredor, cria-se 3v2 ofensivo e deixa de ser permitido voltar ao setor central. Ultrapassado o corredor lateral, a jogada entra no setor ofensivo; entra 1 jogador de cada um dos outros setores, formando 4v3 para finalizar o mais rápido possível. Se a equipa defensora recuperar, sai em transição rápida para marcar numa das 2 mini-balizas. O foco está na saída de bola, exploração da superioridade numérica, progressão por corredores e transição ofensiva/defensiva. (${m} min)`,
      coachingPoints:
        "No setor central, paciência com critério: atrair pressão para soltar no corredor livre. No corredor, usar o apoio extra para fixar e ultrapassar em vantagem (3v2) sem recuar ao centro. Na entrada no setor ofensivo, reconhecer de imediato o 4v3 e finalizar com poucos toques; se perder, reação agressiva à transição defensiva para proteger a baliza e mini-balizas.",
      setup:
        "Mais de meio campo dividido em 4 setores (central, dois corredores, ofensivo); 1 baliza principal + 2 mini-balizas para transição; coletes de duas cores; bolas extra com o treinador e junto ao GR.",
      groupSplit:
        pl.length >= 18
          ? "Manter estrutura completa por setores e rodar funções (apoio, corredor, setor ofensivo, defesa) a cada 4–6 minutos."
          : pl.length >= 14
            ? "Reduzir o setor ofensivo para 3v3+apoio ou jogar só um corredor por série, alternando lados."
            : "Simplificar para 4v3 no centro + progressão para corredor único, mantendo regra de transição para mini-balizas.",
      diagramHint:
        "4 setores: central 5v4 → passe ao corredor (3v2 com apoio) → entrada no ofensivo (4v3) → finalização; recuperação defensiva → transição para 2 mini-balizas.",
      videoUrl: SUPERIORIDADE_SETORES_VIDEO_URL,
    }),
  },
  {
    themes: ["finishing", "transition", "physical"],
    title: "4 Exercícios de Finalização",
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
    themes: ["possession", "pressing", "transition", "finishing"],
    title: "Constante abertura de Rondo",
    describe: (pl, m) => ({
      description: `O exercício decorre em dois quadrados (interior e exterior). No quadrado interior, a equipa preta joga em superioridade numérica (6v3), com o objetivo de realizar 6 passes consecutivos para poder sair para o quadrado exterior e finalizar o mais rápido possível. Se a equipa branca recuperar a bola: joga imediatamente para os jogadores do quadrado exterior; fica numa situação de 9v6 em superioridade; após 10 passes, pode finalizar nas balizas. Se a equipa preta voltar a recuperar a bola: pode finalizar imediatamente numa das balizas. O foco está na manutenção da posse, reação à perda/ganho de bola e rapidez na transição para finalização. (${m} min)`,
      coachingPoints:
        "Equipa preta em posse: triângulos curtos, corpo aberto e voz para pedir linha de passe antes dos 6 passes; ao cumprir a meta, saída rápida para o exterior com primeiro olhar à finalização. Equipa branca na pressão: fechar canto e canal ao portador; ao roubar, primeiro passe para o exterior e ocupar espaço para explorar a 9v6. Transições: pouca hesitação — recuperou ou perdeu, reage em 1–2 toques.",
      setup:
        "Dois rectângulos concêntricos ou adjacentes (interior ~18×18 m e anel exterior proporcional, ajusta ao espaço); balizas regulamentares ou reduzidas no exterior; coletes (preto/branco); bolas extra para repor ritmo.",
      groupSplit:
        pl.length >= 18
          ? "Rotação de papéis entre interior e exterior a cada 4–5 min; GR nas balizas ou mini-balizas com jogadores a simular."
          : pl.length >= 14
            ? "Reduz ligeiramente o anel exterior ou usa 5v2+1 no interior com a mesma lógica de passes para saída."
            : "Espaço mais compacto; mantém a regra de 6 passes no interior e 10 no exterior com números proporcionais (ex. 4v2 + apoios exteriores).",
      diagramHint:
        "Quadrado interior 6v3; setas de 6 passes → saída para anel exterior → finalização rápida; se roubo branco: bola ao exterior → 9v6 → após 10 passes remate à baliza; se preta recupera no exterior: remate imediato.",
      videoUrl: BREAKOUT_RONDO_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "pressing", "transition", "finishing"],
    title: "Transição (2+1)v1",
    describe: (pl, m) => ({
      description: `O exercício é dividido em 4 zonas, onde em cada uma existe uma situação de 2v1, com apoio de um terceiro jogador neutro, que vai rodando entre zonas para oferecer mais uma linha de passe. À volta das zonas estão colocadas 4 balizas pequenas. A equipa em posse deve manter a bola, criar linhas de passe constantes e variar o jogo rapidamente entre zonas, aproveitando a superioridade numérica. A equipa defensora procura fechar linhas de passe e recuperar a bola o mais rápido possível. Assim que recupera, deve finalizar imediatamente numa das 4 balizas. O foco está na posse orientada, mobilidade, mudança rápida de corredor e reação à recuperação da bola. (${m} min)`,
      coachingPoints:
        "Em posse: corpo aberto, triângulos curtos e voz para pedir linha antes do passe; usar o neutro em rotação para criar 3ª linha e mudar o corredor com poucos toques. Defesa: fechar canto e canal ao portador, saltar em coordenação ao passe previsível; ao roubar, primeiro olhar à mini-baliza mais próxima e remate em 1–2 toques.",
      setup:
        "Quatro zonas rectangulares (~10×12 m cada, ajustáveis) dispostas em quadrado ou fila, com 1 mini-baliza junto a cada zona; 1 neutro partilhado a migrar entre zonas; bolas em cada zona e coletes (posse vs 1 defesa por zona).",
      groupSplit:
        pl.length >= 16
          ? "Quatro zonas activas com rotação de neutro a cada 90 s e troca posse/defesa a cada 4–6 repetições."
          : pl.length >= 12
            ? "Três zonas activas + uma em espera, ou zonas mais pequenas com a mesma lógica (2+1)v1."
            : "Duas zonas em alternância; coach como neutro ou 2v1 simples sem rotação entre quatro quadrados.",
      diagramHint:
        "4 zonas em 2v1+1 neutro a circular; mini-balizas à volta; setas de circulação rápida entre zonas; após recuperação, seta imediata ao remate na mini-baliza mais próxima.",
      videoUrl: TWO_PLUS_ONE_V_ONE_TRANSITION_VIDEO_URL,
    }),
  },
  {
    themes: ["wide", "finishing", "possession", "transition"],
    title: "Canto Curto Estudado",
    describe: (_pl, m) => ({
      description: `O canto é batido curto para o jogador colocado na esquina da área. Em simultâneo, o jogador que estava no primeiro poste sai rapidamente para dar apoio e receber a bola. Enquanto isso, os restantes jogadores dentro da área fazem movimento para o segundo poste, arrastando marcações e criando espaço na zona frontal. No momento em que a bola entra no jogador que veio do primeiro poste, um dos jogadores da área regressa ao centro para bloquear o defesa responsável pela entrada da área. De seguida, a bola é colocada no jogador que surge sozinho à entrada da área, que deve rematar de primeira, preferencialmente para o poste mais próximo. Nos cantos do lado esquerdo utiliza-se, idealmente, batedor destro e apoio canhoto; no lado direito, o contrário. O foco está no timing das movimentações, bloqueio legal e finalização rápida de média distância. (${m} min)`,
      coachingPoints:
        "Canto curto com passe tenso e orientação corporal para jogar de frente; apoio do 1.º poste sai no timing certo para não 'matar' a linha curta. Dentro da área, movimentos coordenados ao 2.º poste para arrastar marcações e libertar a frontal; bloqueio legal com pés parados e contacto controlado. Finalizador à entrada da área prepara remate de 1.ª ao poste mais próximo.",
      setup:
        "Zona de canto com baliza e GR; 1 batedor, 1 apoio curto na esquina, 1 jogador a sair do 1.º poste, 3–5 jogadores na área para arraste/bloqueio e 1 finalizador na frontal; coletes e bolas junto à bandeirola.",
      groupSplit:
        "Alterna lado esquerdo/direito a cada série: no esquerdo, batedor destro + apoio canhoto; no direito, batedor canhoto + apoio destro. Rodar funções (batedor, apoio, bloqueador e finalizador) a cada 4–6 repetições.",
      diagramHint:
        "Canto curto para a esquina da área → apoio do 1.º poste recebe; área movimenta ao 2.º poste para arrastar; um regressa para bloqueio legal na frontal; passe para finalizador à entrada da área e remate de 1.ª ao poste próximo.",
      videoUrl: SHORT_CORNER_ROUTINE_VIDEO_URL,
    }),
  },
  {
    themes: ["wide", "finishing", "balanced"],
    title: "Canto Curto: Newcastle",
    describe: (_pl, m) => ({
      description: `A jogada inicia com organização prévia: 1 jogador no segundo poste, 1 junto ao guarda-redes, 1 na esquina da área para apoio curto, 2 na pequena área, 2 à entrada da área para movimentos e 2 no meio-campo para prevenir contra-ataque. No arranque, o jogador junto ao guarda-redes aproxima-se do batedor para receber curto, enquanto o jogador da esquina também se aproxima para atrair marcação. Em simultâneo, os dois jogadores da entrada da área atacam o segundo poste. Quando a bola entra no apoio curto, o jogador que estava no segundo poste arranca para a zona da marca de penálti. Ao mesmo tempo, os jogadores em movimento fazem bloqueio legal ao defesa que o seguia. Depois, a bola é devolvida ao batedor, que decide rapidamente entre passe tenso para a zona de penálti ou cruzamento para o segundo poste em contexto de 4v4. O foco está no timing das movimentações, bloqueios, criação de espaço e decisão rápida do batedor. (${m} min)`,
      coachingPoints:
        "Movimentos sincronizados no momento do passe curto; bloqueios legais com postura estável e sem carga pelas costas; batedor com leitura rápida entre passe tenso na marca de penálti e cruzamento ao 2.º poste; jogadores de prevenção em transição defensiva atentos à segunda bola.",
      setup:
        "Zona de canto com baliza e GR; 1 batedor, 1 apoio curto, 1 referência junto ao GR, 2 na pequena área, 2 à entrada da área, 1 no 2.º poste e 2 jogadores de segurança no meio-campo; bolas extra junto à bandeirola.",
      groupSplit:
        "Rodar funções (batedor, apoio curto, bloqueadores, finalizador e segurança) a cada 3–5 repetições; alternar lado esquerdo/direito para manter simetria tática.",
      diagramHint:
        "Canto curto: aproximação do apoio junto ao GR + apoio da esquina; atacantes da frontal atacam 2.º poste; referência do 2.º poste ataca zona de penálti com bloqueio legal; devolução ao batedor e decisão passe tenso vs cruzamento.",
      videoUrl: SHORT_CORNER_BY_NEWCASTLE_VIDEO_URL,
    }),
  },
  {
    themes: ["wide", "finishing", "balanced"],
    title: "Canto Curto: Empoli",
    describe: (_pl, m) => ({
      description: `A jogada começa com vários jogadores a arrastar movimentações para o primeiro poste, concentrando aí a atenção defensiva. Em simultâneo, o jogador mais afastado da área inicia corrida discreta para o segundo poste. Após o passe curto para o jogador de apoio, a equipa adversária é atraída ainda mais para a zona do primeiro poste, enquanto continua a movimentação de ataque ao segundo poste. Ao mesmo tempo, o jogador que estava inicialmente no primeiro poste faz o movimento inverso, recuando para garantir novamente dois jogadores atrás da linha da bola e prevenir o contra-ataque. O objetivo final é criar espaço para que um jogador surja completamente sozinho no segundo poste, pronto para finalizar sem marcação. O foco está no timing das movimentações, atração da marcação e finalização no segundo poste. (${m} min)`,
      coachingPoints:
        "Arraste coordenado ao 1.º poste para fixar a linha defensiva; passe curto com qualidade para atrair mais pressão; corrida ao 2.º poste com timing de surpresa (nem cedo demais nem atrasado); garantir sempre dois jogadores de segurança atrás da linha da bola após a inversão do movimento.",
      setup:
        "Zona de canto com baliza e GR; batedor + apoio curto; bloco de 4–6 jogadores para movimentos no 1.º poste/pequena área; 1 referência de ataque ao 2.º poste; 2 jogadores de prevenção em transição defensiva; bolas extra junto à bandeirola.",
      groupSplit:
        "Rodar funções (batedor, apoio, arraste ao 1.º poste, atacante do 2.º poste e segurança) a cada 3–5 repetições; alternar canto esquerdo/direito para treinar simetria.",
      diagramHint:
        "Movimentos iniciais ao 1.º poste para arrastar marcação; passe curto de apoio; corrida oculta ao 2.º poste; jogador do 1.º poste recua para formar 2 atrás da linha da bola; finalização livre no 2.º poste.",
      videoUrl: SHORT_CORNER_BY_EMPOLI_VIDEO_URL,
    }),
  },
  {
    themes: ["wide", "finishing", "balanced"],
    title: "Livre Direto Estudado ",
    describe: (pl, m) => ({
      description: `A jogada inicia com 2 jogadores na bola e 1 jogador aberto na esquina da área, preparado para receber e atrair marcação. Na área, 4 jogadores atacam o segundo poste, arrastando a linha defensiva. Em simultâneo, outro jogador parte de posição mais exterior e surge em corrida para a entrada da área. O executante toca curto para o jogador da esquina, que joga de primeira para o colega que aparece solto à entrada da área. Esse jogador tem três decisões: (1) rematar à baliza, se tiver espaço; (2) cruzar para o segundo poste, onde entram os 4 colegas; (3) ligar curto no jogador perto da barreira, criando nova combinação. O foco está no efeito surpresa, timing das movimentações e rapidez na decisão final. (${m} min)`,
      coachingPoints:
        "Arranque sincronizado: quatro à área a arrastar o 2.º poste sem antecipar o toque curto; jogador exterior entra ao eixo na mesma janela do passe da esquina. Apoio na esquina: receber em aberto e jogar de primeira com pé adequado ao corredor. Entrada na área: ler em tempo real remate vs cruzamento vs combinação junto à barreira; decisão em 2–3 toques máx.",
      setup:
        "Posição de livre (zona frontal à área) com GR e barreira; 2 na bola (executante + companheiro sobre a bola ou distracção), 1 na esquina da área, 4 no bloco ao 2.º poste, 1 em corrida desde fora para a entrada da área; opcional jogador junto à barreira para a 3.ª opção; coletes e bolas de reposição.",
      groupSplit:
        pl.length >= 14
          ? "Dois grupos a alternar (ataque vs barreira simulada) com saídas escalonadas; repetir do lado esquerdo e direito."
          : pl.length >= 9
            ? "Um grupo na movimentação e defesa com manequinhos ou coletes fixos na barreira; rodar executante, apoio da esquina e finalizador a cada 4–6 repetições."
            : "Reduz espaço na área; treinador como jogador da esquina ou da combinação junto à barreira; manter sempre a leitura das 3 decisões.",
      diagramHint:
        "2 na bola → toque curto à esquina → passe de 1.ª à entrada da área; setas dos 4 ao 2.º poste; corrida exterior para o desmarque; remate / cruzamento / ligação curta à barreira.",
      videoUrl: FREE_KICK_ROUTINE_VIDEO_URL,
    }),
  },
  {
    themes: ["wide", "finishing", "balanced"],
    title: "Livre Direto Estudado: Movimentação do Extremo",
    describe: (pl, m) => ({
      description: `A jogada inicia com 2 jogadores na bola, 1 jogador junto à barreira e 1 jogador aberto na esquina da área, preparado para acelerar nas costas da defesa. Na área, 5 jogadores atacam o segundo poste, arrastando a linha defensiva. Em simultâneo, um desses jogadores surge em corrida para a entrada da área. O executante toca curto para o jogador que recebe, que pica a bola de primeira para o colega que veio a correr da esquina da área em direcção ao segundo poste. Esse jogador tem três decisões: (1) rematar à baliza, se tiver espaço; (2) cruzar para o segundo poste, onde entram os 4 colegas; (3) ligar curto no jogador que está na entrada da área, criando nova combinação. O foco está no efeito surpresa, timing das movimentações e rapidez na decisão final. (${m} min)`,
      coachingPoints:
        "Executante e receptor do toque curto: ritmo e ângulo para o pique ir por cima ou à volta da barreira para o corredor do extremo. Extremo: arranque após gatilho (toque ou gesto) para não antecipar o fora-de-jogo; procura linha de passe nas costas. Bloco de 5: arrastar o 2.º poste sem colapsar cedo demais; um a atacar a entrada da área em simultâneo. Receptor final: ler remate vs cruzamento vs ligação curta na frontal em ≤3 toques.",
      setup:
        "Livre curto frontal à área com GR e barreira; 2 na bola, 1 junto à barreira (combinação / distração), 1 na esquina da área para arranque do extremo; 5 no bloco ofensivo (movimento ao 2.º poste + entrada na área); bolas e coletes.",
      groupSplit:
        pl.length >= 14
          ? "Dois grupos alternados com barreira viva ou manequinhos; trabalhar centro–direita e centro–esquerda em blocos separados."
          : pl.length >= 9
            ? "Rodar executante, primeiro receptor, extremo em movimento e finalizador a cada 4–6 repetições; defesa fixa na barreira 3–4 repetições antes de trocar pressão."
            : "Espaço reduzido; treinador como extremo ou primeiro receptor; manter o pique e a decisão final mesmo com menos jogadores na área.",
      diagramHint:
        "Toque curto → pique de 1.º tempo → extremo desde a esquina em curva ao 2.º poste; 5 a arrastar linha; setas remate frontal / cruzamento / passe à entrada da área.",
      videoUrl: SHORT_FREE_KICK_WINGER_MOVEMENT_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "finishing", "pressing"],
    title: "De Construção para Contra Ataque ",
    describe: (pl, m) => ({
      description: `O exercício realiza-se num espaço de 30 metros com 2 balizas, dividido em duas metades, e envolve 3 ou 4 equipas, jogando apenas 2 de cada vez. Na primeira metade, a equipa em posse tenta sair a jogar com 2 jogadores + guarda-redes, enfrentando 3 adversários em pressão. O objetivo é conseguir ligar o jogo para o setor seguinte através de passe. Se o passe entrar no setor ofensivo, os avançados recebem e atacam numa situação de 3v2, procurando finalização rápida. Se a equipa defensora recuperar a bola antes da ligação, pode finalizar imediatamente na baliza. Sempre que uma equipa sofre golo, sai e entra a equipa que está há mais tempo à espera. O foco está na saída sob pressão, ligação entre setores, transição ofensiva e reação rápida à perda/ganho de bola. (${m} min)`,
      coachingPoints:
        "Saída sob pressão: primeiro toque orientado e linhas curtas entre GR+2 para atrair e soltar no timing certo; no setor ofensivo, 3v2 com decisão vertical em poucos toques. Defensores: ao recuperar antes da ligação, atacar logo a baliza sem conduções longas. Na rotação de equipas, manter intensidade alta na reação à perda/ganho.",
      setup:
        "Campo ~30×22 m com 2 balizas, dividido em duas metades (construção e finalização); 3 ou 4 equipas com coletes distintos; bolas extra junto às balizas para reinício rápido.",
      groupSplit:
        pl.length >= 16
          ? "4 equipas: 2 em jogo e 2 em espera activa; troca por golo sofrido ou após série curta para manter intensidade."
          : pl.length >= 12
            ? "3 equipas: 2 em jogo e 1 em espera; rotação por golo sofrido ou tempo (60–90 s)."
            : "Reduz para 2+GR vs 2 na saída e 2v1 no setor ofensivo, mantendo a lógica ligação→finalização rápida.",
      diagramHint:
        "Campo dividido em 2 metades: setor 1 com 2+GR em saída vs 3 pressão; passe de ligação para setor 2; setor 2 em 3v2 para finalizar rápido; se recuperação no setor 1, finalização imediata na baliza próxima; seta de rotação da equipa que sofre golo.",
      videoUrl: BUILD_UP_INTO_COUNTER_ATTACK_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "pressing", "transition", "finishing", "physical"],
    title: "Recuperação de Bola no Rondo para Finalização",
    describe: (pl, m) => ({
      description: `O exercício é composto por 2 equipas de 10 jogadores (ajustável) e dividido em 3 setores consecutivos. A equipa com colete começa distribuída pelos setores, com 3 jogadores em cada zona, enquanto a equipa sem colete entra com duplas de 2 jogadores para pressionar. Em cada setor cria-se uma situação de 3v2, onde a equipa com colete tem como objetivo manter a posse de bola o máximo de tempo possível em espaço reduzido, valorizando controlo, apoio e rapidez de decisão sob pressão. A equipa sem colete procura recuperar a bola e sair do setor, avançando sucessivamente pelos 3 setores. Quando ultrapassa o último setor, ataca a baliza numa situação de 2v1 contra um defesa da equipa com colete. O exercício repete-se até todas as duplas realizarem o percurso. Depois, trocam-se as funções: quem estava dentro passa a pressionar e vice-versa. Tudo é cronometrado, vencendo a equipa que completar o exercício em menos tempo. Cada golo marcado desconta 10 segundos ao tempo final. O foco está na posse sob pressão, reação à perda, progressão entre zonas e eficácia na finalização. (${m} min)`,
      coachingPoints:
        "Equipa em posse: apoio constante, orientação corporal e passes rápidos para fugir ao 3v2 em espaço curto. Dupla pressionante: coordenar ângulos de pressão e, ao roubar, sair logo do setor sem hesitar. Na chegada ao fim, 2v1 com decisão objetiva e remate rápido para ganhar segundos no cronómetro.",
      setup:
        "Três setores consecutivos em espaço reduzido + baliza final; 2 equipas de 10 (ajustável); coletes; cronómetro; bolas extra nas zonas e junto à baliza para manter ritmo alto.",
      groupSplit:
        pl.length >= 20
          ? "Duas equipas completas: uma dentro em 3+3+3(+1 defesa final) e a outra em duplas de pressão a percorrer os setores; troca após todas as duplas terminarem."
          : pl.length >= 14
            ? "Reduz o número por setor (ex. 2+2+2) mantendo a lógica de duplas a progredir e 2v1 final."
            : "Usa 2 setores em vez de 3 e termina em 2v1, preservando o foco em posse sob pressão e finalização rápida.",
      diagramHint:
        "Três setores seguidos: em cada setor 3v2 para manter/roubar; dupla recupera e progride setor a setor; ao sair do último, ataca baliza em 2v1; cronómetro global e bónus de -10 s por golo.",
      videoUrl: FITNESS_RONDO_INTO_FINISHING_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "pressing", "transition", "finishing"],
    title: "Rondo para Contra Ataque",
    describe: (_pl, m) => ({
      description: `O exercício inicia com uma equipa de 5 jogadores a realizar posse de bola dentro de um retângulo curto, sendo pressionada por 3 defensores. A equipa em posse tem como objetivo manter a bola e completar 10 passes consecutivos, podendo depois finalizar nas balizas pequenas. A equipa defensora procura recuperar a bola o mais rápido possível e sair imediatamente em contra-ataque numa situação de 4v2. O segundo jogador que recua para defender será o que estiver mais próximo da baliza no momento da perda. O foco está na posse em espaço reduzido, reação à perda, transição ofensiva rápida e eficácia na finalização. (${m} min)`,
      coachingPoints:
        "Na posse: controlar orientado, apoio curto e circulação rápida para fugir à pressão dos 3. Na recuperação: primeiro passe para acelerar o 4v2 e atacar cedo a baliza. Quem perde a bola deve reagir de imediato, com o jogador mais próximo da baliza a baixar rápido para formar a defesa 4v2.",
      setup:
        "Retângulo curto para o rondo + espaço de saída para contra-ataque e balizas pequenas; 5 em posse vs 3 pressão; bolas extra junto ao retângulo e às balizas para manter intensidade alta.",
      groupSplit:
        "Bloco principal 5v3 no rondo; após recuperação, abrir em 4v2 para finalização rápida. Alterna os 2 que recuam para defender conforme a proximidade à baliza no momento da perda.",
      diagramHint:
        "Retângulo curto 5v3; após 10 passes, equipa em posse pode finalizar em mini-balizas; se defesa recupera, seta de saída imediata para 4v2; um defensor recua por proximidade à baliza para recompor a transição defensiva.",
      videoUrl: RONDO_TO_COUNTER_ATTACK_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "wide"],
    title: "Pontapé de Baliza 1",
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
    title: "Pontapé de Baliza 2",
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
    title: "Corrida do Meio Campo nas Costas da Defesa",
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
    themes: ["possession", "wide", "transition", "finishing"],
    title: "Overlap do Lateral: Extremo",
    describe: (_pl, m) => ({
      description: `Saída de bola iniciada por um dos centrais, com apoio do trinco para variar no outro central e manter linhas de passe constantes. O extremo aproxima para vir buscar jogo e libertar o corredor para o overlap do lateral nas costas. O médio-centro aproxima ao meio e abre linha entre linhas para o avançado que fixa no corredor central. Bola no extremo que recuou, aproximação do trinco para jogar de frente e leitura do movimento do lateral a atacar profundidade. A partir daí, passe no lateral e movimentos coordenados dentro da área do avançado, extremo do lado contrário e médio-centro para finalizar. Foco em futebol curto/apoiado, 1–2 toques e ocupação inteligente de área. (${m} min)`,
      coachingPoints:
        "Extremo deve temporizar a aproximação para arrastar o lateral adversário; trinco com corpo aberto para ver de frente a corrida do lateral; avançado fixa central e coordena entrada de área com o extremo oposto e médio-centro; passe final no timing certo para não anular overlap.",
      setup:
        "Meio-campo ofensivo (~50×40 m), baliza com GR, 2 centrais + trinco + 2 médios + 2 extremos + avançado + laterais; oposição semi-activa para orientar decisão; bolas extra junto aos centrais.",
      groupSplit:
        "Estrutura base fixa por bloco e rotação de funções (extremo de apoio, lateral em overlap, avançado de referência e médio-centro de entrada) a cada 4–5 repetições.",
      diagramHint:
        "Central (lado A) → trinco → central (lado B) → extremo recua para apoio → trinco de frente lê corrida do lateral nas costas → passe no lateral → 3 entradas na área (avançado, extremo oposto, médio-centro).",
      videoUrl: FULL_BACK_OVERLAP_WINGER_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "wide", "transition", "finishing"],
    title: "Overlap do Lateral: Avançado ",
    describe: (_pl, m) => ({
      description: `Saída de bola iniciada num central de um dos lados, com apoio do trinco para variar para o outro central e manter linhas de passe constantes. O central em posse tem várias opções: extremo a vir buscar, lateral a preparar overlap nas costas, médio-centro a abrir para expor linha ao avançado e trinco a recuar para segurança. A bola entra no avançado a jogar de costas para a baliza e a tocar de frente com 3 apoios frontais. A partir desse apoio: se entra no médio-centro do lado da bola, ativa-se o overlap do lateral e cobertura defensiva do extremo que recuou; se entra no médio do lado oposto, o extremo oposto ataca a rotura; se volta no trinco, ficam disponíveis os dois lados para decidir. Foco em futebol curto/apoiado, 1–2 toques e leitura de opções entre linhas. (${m} min)`,
      coachingPoints:
        "Avançado de costas deve fixar e jogar de frente em 1–2 toques; médio-centro abre cedo para mostrar linha entre linhas; lateral só acelera o overlap quando a bola entra no corredor interior; extremo coordena aproximação/rotura com timing; trinco garante equilíbrio para reagir à perda.",
      setup:
        "Meio-campo ofensivo (~50×40 m), baliza com GR, 2 centrais + trinco + 2 médios + 2 extremos + avançado + laterais; oposição semi-activa para condicionar linhas de passe; bolas extra com os centrais.",
      groupSplit:
        "Mantém estrutura base (linha de saída + apoios frontais) e roda funções a cada 4–5 repetições: avançado, extremos e médios-centro alternam para treinar diferentes leituras de apoio e rotura.",
      diagramHint:
        "Central (lado A) → trinco → central (lado B) → passe no avançado de costas → apoio frontal. Ramificação: lado da bola (overlap lateral) ou lado oposto (rotura do extremo); opção de reset no trinco para mudar corredor.",
      videoUrl: FULL_BACK_OVERLAP_STRIKER_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "wide"],
    title: "Transição Rápida 3v2",
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
  {
    themes: ["transition", "finishing", "defensive"],
    title: "Exercício de Finalização 3v2",
    describe: (pl, m) => ({
      description: `O exercício é composto por 2 defesas e 3 avançados. Inicia-se com os 2 centrais na linha de fundo, que colocam a bola no jogador ofensivo do meio. Após a receção, os 3 avançados atacam de imediato a baliza numa situação de 3v2, procurando aproveitar a superioridade numérica para marcar rapidamente. Os defesas devem ajustar posicionamentos, atrasar a jogada e tentar impedir a finalização. O foco está na transição ofensiva rápida, tomada de decisão no último terço e organização defensiva em inferioridade numérica. (${m} min)`,
      coachingPoints:
        "Ataque: primeira receção orientada e acelerar no primeiro passe; explorar a 3v2 com combinações curtas, penetração e remate ou último passe limpo. Defesa: retardar sem abrir linha directa à baliza; equilibrar pressão ao portador com cobertura da profundidade e do remate.",
      setup:
        "Terço ofensivo ou meio campo atacado com baliza (GR ou mini-balizas); 2 centrais na linha de fundo a iniciar, 2 defesas e 3 avançados no lance; bolas junto aos centrais; coletes.",
      groupSplit:
        pl.length >= 12
          ? "Rotação por funções: pares de centrais na saída; trio ofensivo e dupla defensiva alternam a cada 4–6 repetições; fila de reposição rápida."
          : pl.length >= 8
            ? "Mantém 3v2 e roda 1 central extra na saída ou acrescenta neutro servidor se faltar corpo."
            : "Reduz espaço ou usa 2v1 + 1 defesa com coach como 2.º defensor; mantém a lógica saída dos centrais → 3v2.",
      diagramHint:
        "2 centrais na linha de fundo → passe ao jogador ofensivo do meio → 3 avançados atacam a baliza em 3v2; defesas a fechar e atrasar; rotação após finalização ou saída.",
      videoUrl: THREE_V_TWO_FINISHING_DRILL_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "finishing", "physical"],
    title: "Ataque com 5 Equipas 3v3",
    describe: (pl, m) => ({
      description: `O exercício decorre em dois campos curtos, com jogos de 3v3 em simultâneo, envolvendo cinco equipas de três jogadores. Existe sempre uma equipa posicionada ao meio, à espera para entrar. O objectivo em cada campo é marcar golo o mais rapidamente possível, promovendo intensidade e decisões rápidas. Sempre que uma equipa sofre golo, sai imediatamente e entra a equipa que estava à espera no meio do campo; o jogo reinicia de forma contínua. O foco está na competitividade, nas transições rápidas, na intensidade alta e na eficácia na finalização. (${m} min)`,
      coachingPoints:
        "Equipa de espera atenta e pronta a entrar no instante do golo sofrido; priorizar transição imediata (sair do campo e recomeçar sem pausa longa); em 3v3, procurar finalização cedo e combinações curtas no último terço; comunicação clara sobre quem entra a seguir.",
      setup:
        "Dois campos curtos paralelos (ex.: largura de meio-campo reduzida ou faixas ~30–40×20–25 m) com baliza em cada extremo; quinze jogadores em cinco equipas de três, identificadas por coletes; bolas suficientes para recomeçar rápido em cada campo.",
      groupSplit:
        pl.length >= 15
          ? "Cinco equipas de 3 a rodar: sempre uma equipa neutra à espera no corredor central entre os dois campos; as outras quatro disputam os dois 3v3."
          : pl.length >= 12
            ? "Quatro equipas de 3 nos campos e uma trio a espera; se faltarem corpos, reduzir a dois mini-campos 3v2 com rotação idêntica ao golo."
            : "Reduz para um único campo 3v3 com equipa de espera ou acrescenta jogadores neutros/bancada do treinador.",
      diagramHint:
        "Dois rectângulos lado a lado 3v3; zona central com equipa de espera; seta: ao sofrer golo → saída imediata → entrada da equipa do meio; reinício contínuo.",
      videoUrl: FIVE_TEAMS_3V3_ATTACKING_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "pressing", "balanced"],
    title: "Rondo com Organização Fixa Posicional",
    describe: (pl, m) => ({
      description: `O exercício é realizado com uma equipa de dez jogadores de campo, posicionados nas suas funções reais dentro do sistema, distribuídos pelo terreno. Cada jogador pode movimentar-se apenas horizontalmente ou verticalmente dentro da sua zona, sem abandonar o espaço definido. O objectivo é circular a bola, criar linhas de passe e ajustar posicionamentos, desenvolvendo noção espacial, ocupação racional do campo e relações entre sectores. A equipa adversária pressiona com cinco jogadores, estando limitada a um máximo de dois jogadores a pressionar por zona (existem quatro zonas de pressão), para condicionar a posse e obrigar decisões rápidas. O foco está na disciplina posicional, na circulação sob pressão e no entendimento colectivo dos espaços. (${m} min)`,
      coachingPoints:
        "Respeitar estritamente as fronteiras da zona (só deslocamento horizontal ou vertical permitido); apoio ao portador com corpo aberto e ângulos curtos; quando a pressão dobra num corredor, soltar a bola de primeira e ‘saltar’ o bloco com terceiro homem. Pressores: comunicar quem salta à pressão para nunca ultrapassar 2 por zona; fechar linhas de passe sem sair da regra.",
      setup:
        "Rectângulo grande (ex.: ~55×45 m ou 3/4 de campo); quatro zonas de pressão claramente marcadas (cones ou linhas); dez jogadores em posição segundo o teu sistema (com ou sem GR como início de jogo); cinco pressores com coletes; bolas de reserva à margem para manter fluidez.",
      groupSplit:
        pl.length >= 16
          ? "10+5 no rondo; jogadores extra a aquecer nas linhas ou a alternar a última posição do sistema."
          : pl.length >= 15
            ? "10 em posição fixa + 5 pressores; se faltar um corpo, retira um setor ou usa treinador como fixo de baixo ritmo."
            : pl.length >= 12
              ? "Reduz para 8v4 com três zonas de pressão (máx. 2 por zona) ou mantém 10 zonas mais pequenas com funções agregadas."
              : "Espaço reduzido; menos zonas (2–3) ou pressão com 3 jogadores e regra de 1 por zona.",
      diagramHint:
        "Quatro zonas; dez jogadores nas células do sistema; cinco pressores a entrar por quadrantes; linhas de passe entre sectores; regra: no máximo 2 pressores por zona.",
      videoUrl: FIXED_POSITION_RONDO_VIDEO_URL,
    }),
  },
  {
    themes: ["physical", "possession", "transition"],
    title: "Circuito de Construção para Quebrar Linhas",
    describe: (pl, m) => ({
      description: `O exercício decorre com 2 bolas em simultâneo, uma em cada extremidade do campo, criando ritmo elevado e coordenação colectiva.
A jogada começa nos defesas, que passam a bola ao médio interior que se aproxima para receber. Este devolve no central, que de seguida liga no 10, que se afasta para receber entre linhas.
O 10 joga de frente no médio que aparece em apoio, e este coloca a bola pelo chão nas costas da defesa para o lateral que surge em overlap no corredor.
Ao mesmo tempo, a mesma sequência acontece no lado oposto.
O foco está na coordenação ofensiva, timing dos movimentos, jogo entre linhas e exploração da profundidade pelos laterais. (${m} min)`,
      coachingPoints:
        "Sincronizar os dois lados para não colidir no eixo; saída firme desde a defesa; o 10 desmarca cedo para receber entre linhas de frente ao jogo; médio de apoio domina o tempo antes do passe nas costas da linha; lateral explode no overlap só após a linha de passe estar livre; ritmo alto sem perder qualidade nos apoios — aquecimento, posse, transição, movimentação sem bola, quebrar linha, overlap e demarcação desde a defesa.",
      setup:
        "Campo completo ou dois grandes corredores paralelos; duas bolas activas em extremidades opostas; marcação opcional dos corredores de overlap e da zona entre linhas para o 10.",
      groupSplit:
        pl.length >= 18
          ? "Dois circuitos paralelos (meio campo cada um); rotação por funções (defesa / MI / central / 10 / lateral) a cada 5–7 repetições."
          : pl.length >= 12
            ? "Um lado em execução plena e fila de espera dinâmica no outro; alternância rápida para manter intensidade."
            : "Meio campo ou largura reduzida; menos jogadores por papel ou um neutro/fixador do treinador na saída.",
      diagramHint:
        "Defesa → médio interior → central → 10 entre linhas → médio apoio → passe em profundidade ao lateral em overlap; espelho simultâneo no outro lado com a 2.ª bola.",
      videoUrl: CIRCUITO_CONSTRUCAO_QUEBRAR_LINHAS_VIDEO_URL,
    }),
  },
  {
    themes: ["transition", "possession", "finishing", "wide"],
    title: "Saída de Jogo com Finalização Rápida",
    describe: (_pl, m) => ({
      description: `O pontapé de saída começa com a equipa a atrair o adversário para um dos lados do campo. Nesse lado, abrem o extremo e um dos médios-centro, simulando que a jogada será desenvolvida por aí. Enquanto isso, no lado oposto, fica o extremo mais rápido isolado e preparado para atacar a profundidade.
A bola sai do centro para o médio do lado oposto, que finge virar o jogo para o lado mais povoado, mas joga no avançado, que inicialmente simulou uma corrida em profundidade e trava para dar apoio frontal. O avançado, de costas, toca de primeira no médio que vem de frente.
Enquanto os jogadores do lado da bola continuam as movimentações para atrair vários adversários, o extremo rápido do lado contrário faz uma desmarcação silenciosa para o centro da área. O médio coloca então uma bola aérea nas costas da defesa para esse extremo receber e finalizar rapidamente.
Caso não haja golo, é fundamental a equipa manter-se subida e compacta para garantir a recuperação da segunda bola e continuar a pressão ofensiva. (${m} min)`,
      coachingPoints:
        "Bola parada e transição: atração credível no lado da bola (extremo + médio a aproximarem) antes de ligar o corredor oposto; médio do lado fraco finge viragem com corpo aberto e passa no avançado no timing certo; avançado de costas com primeiro toque limpo para o médio em apoio frontal; extremo rápido desmarca em silêncio para o centro da área — sem antecipar o cruzamento; bola aérea com peso e timing nas costas da linha; após remate ou defesa, bloco alto e compacto para segunda bola e pressão contínua.",
      setup:
        "Meio campo ou terço defensivo + transição (~55×45 m); baliza + GR (ou simulação de pontapé de saída); adversário com 4–6 jogadores a saltar para o lado da bola; cones opcionais para corredores de atração e zona de desmarcação do extremo; bolas extra junto ao centro do campo.",
      groupSplit:
        "Cadeia fixa por bloco: GR + centrais + médios (lado da bola e lado oposto) + extremos + avançado + trinco; rotação de papéis ao intervalo (extremo rápido, médio que cruza, avançado de apoio).",
      diagramHint:
        "Pontapé → atração num flanco (extremo + MC); médio oposto finge viragem → avançado (falso profundo + apoio de costas) → médio frontal; extremo rápido desmarca ao centro; bola aérea nas costas → finalização; seta de bloco alto para 2.ª bola.",
      videoUrl: KICK_OFF_FAST_FINISH_VIDEO_URL,
    }),
  },
  {
    themes: ["possession", "transition", "pressing", "physical"],
    title: "Rondo com Variação do Jogo",
    describe: (pl, m) => ({
      description: `O exercício é composto por 2 quadrados e 3 equipas de 4 jogadores. No quadrado ativo jogam 4 jogadores em posse contra 2 defensores. No quadrado oposto ficam 2 jogadores da terceira equipa à espera da variação, sempre ativos e preparados para receber.
Os outros 2 jogadores dessa equipa posicionam-se abertos em zonas laterais, simulando extremos e promovendo jogo aberto. Já os 2 jogadores restantes da equipa que defende ocupam o setor intermédio, preparados para reagir à mudança de corredor.
A equipa em posse deve realizar 7 passes consecutivos e depois obrigatoriamente ligar num dos jogadores abertos para virar o jogo para o outro quadrado. Numa progressão do exercício, essa variação só pode ser feita através de passe rasteiro entre linhas.
A equipa defensora procura recuperar antes da sequência de passes e da mudança de corredor. Quando recupera, deve virar imediatamente o jogo para o outro lado e reorganizar-se nas posições da equipa que perdeu a bola.
O foco está na posse sob pressão, mudança rápida de corredor, ocupação da largura e reação à transição. (${m} min)`,
      coachingPoints:
        "Aquecimento, posse e transição: contagem clara dos 7 passes antes da viragem; extremos abertos com corpo aberto e linha de passe sempre visível; 2 à espera no quadrado oposto em movimento (não estáticos); defensores no quadrado com pressão coordenada sem faltas; setor intermédio fecha o eixo mas não bloqueia a viragem lateral; após recuperação, primeiro passe imediato para o outro quadrado e reorganização rápida de funções (posse / defesa / variação).",
      setup:
        "Dois quadrados adjacentes ou opostos (~12×12 m cada, ajustável); 3 equipas × 4 jogadores (coletes); zonas laterais marcadas para os «extremos»; faixa intermédia entre quadrados para os 2 defensores de apoio; bolas extra em cada quadrado.",
      groupSplit:
        pl.length >= 12
          ? "12 jogadores: 4v2 no quadrado ativo + 2 à espera + 2 laterais + 2 no setor intermédio; rotação de equipas (posse / pressão / variação) a cada 3–4 minutos."
          : pl.length >= 10
            ? "Reduz para 3v2 no quadrado ativo e 1 extremo + 1 à espera; mantém a regra dos 7 passes e viragem obrigatória."
            : "Espaço único menor; treinador como neutro na viragem ou para completar o quarteto da equipa de variação.",
      diagramHint:
        "Quadrado A: 4v2 → 7 passes → passe ao extremo → quadrado B (2 à espera + receção); defesa: 2 no A + 2 no meio; recuperação → viragem imediata para o outro quadrado e troca de papéis.",
      videoUrl: VIRAR_JOGO_RONDO_VIDEO_URL,
    }),
  },
  {
    themes: ["pressing", "defensive", "transition"],
    title: "Exercício de Pressão",
    describe: (_pl, m) => ({
      description: `Pressão alta em 4-4-2 na saída adversária. A equipa organiza-se em 4-4-2, com o médio ofensivo ao lado do avançado, permitindo saída curta do adversário mas fechando sempre os espaços entre linhas. O objetivo é identificar o central com menor qualidade e direcionar o jogo para esse lado.
Quando a bola entra no lateral, surge o gatilho de pressão: o extremo aproxima para pressionar e toda a equipa desliza para esse lado, fechando linhas de passe interiores e profundidade. O objetivo é forçar o lateral a devolver ao central.
Quando a bola volta ao central: o nosso 10 bloqueia o trinco e o médio (8); o avançado posiciona-se para pressionar guarda-redes ou central; o extremo continua a fechar opções por dentro. Assim, o portador fica sem soluções seguras: guarda-redes pressionado pelo avançado; virar jogo fechado pelo extremo; passe interior em risco (superioridade nossa - avançado e 2 médios centro); bola longa como opção mais provável e desejada.
Ao forçar jogo longo, garante-se vantagem numérica no meio-campo (4v2), aumentando a probabilidade de ganhar a segunda bola (7v5). O foco está na coordenação da pressão, fecho de linhas e indução do erro adversário. (${m} min)`,
      coachingPoints:
        "Coordenação do bloco: salto do extremo ao trigger lateral e deslize colectivo sem buracos entre linhas. 10 e 8 a fechar eixo e trinco; avançado a escolher pressão ao GR vs central conforme a linha de passe. Aceitar curto para forçar devolução ao lado fraco; celebrar recuperação na 2ª bola com superioridade no meio.",
      setup:
        "Meio-campo adversário ou ~55×45 m; equipa em 4-4-2 vs saída (4+2 ou 3+2 simulados); coletes; bolas extra nas linhas laterais para repor rápido.",
      groupSplit:
        "Alternar o lado da pressão a cada 6–8 repetições; rolar funções (10, 8, extremos e avançado) para todos lerem o gatilho lateral.",
      diagramHint:
        "4-4-2; seta de pressão ao lateral; deslize da equipa; devolução ao central; 10+8 no eixo; 2ª bola 4v2 no meio.",
      videoUrl: PRESSING_EXERCISE_VIDEO_URL,
    }),
  },
];

ensureExerciseAgeDefaults(MAIN_DRILLS.map((d) => d.title));

function scoreDrill(themes: TrainingThemeId[], def: MainDrillDef): number {
  let s = 0;
  for (const t of def.themes) if (themes.includes(t)) s += 2;
  if (def.themes.includes("balanced") && themes.includes("balanced")) s += 1;
  return s;
}

function filterDrillsByAgeGroup(
  drills: MainDrillDef[],
  ageGroup: TrainingAgeGroupId | undefined,
  exerciseAgeMap: TrainingExerciseAgeMap | undefined
): MainDrillDef[] {
  if (!ageGroup) return drills;
  return drills.filter((d) => resolveExerciseAgeGroupsForTitle(d.title, exerciseAgeMap).includes(ageGroup));
}

function pickMainDrills(
  themes: TrainingThemeId[],
  count: number,
  seed: number,
  excludeTitles?: ReadonlySet<string>,
  ageGroup?: TrainingAgeGroupId,
  exerciseAgeMap?: TrainingExerciseAgeMap,
): MainDrillDef[] {
  const basePool =
    excludeTitles && excludeTitles.size > 0
      ? MAIN_DRILLS.filter((d) => !excludeTitles.has(d.title))
      : MAIN_DRILLS;
  const pool = filterDrillsByAgeGroup(basePool, ageGroup, exerciseAgeMap);
  if (pool.length === 0) return [];
  const scored = pool
    .map((d, i) => ({ d, s: scoreDrill(themes, d) + ((seed + i * 13) % 3) * 0.1 }))
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
  while (out.length < count && i < pool.length) {
    const d = pool[i++]!;
    if (!used.has(d.title)) {
      used.add(d.title);
      out.push(d);
    }
  }
  return out;
}

/** Procura títulos de exercícios escritos no objetivo (case/acento insensitive), preservando a ordem no texto. */
function extractExplicitDrillDefsFromObjective(objective: string): MainDrillDef[] {
  const found = MAIN_DRILLS.map((d) => ({
    d,
    ...scoreDrillTitleMatchInObjective(objective, d.title),
  }))
    .filter((x) => x.score > 0 && x.idx >= 0)
    .sort((a, b) => (a.idx - b.idx) || (b.score - a.score));

  const out: MainDrillDef[] = [];
  const seen = new Set<string>();
  for (const row of found) {
    if (seen.has(row.d.title)) continue;
    seen.add(row.d.title);
    out.push(row.d);
  }
  return out;
}

function splitMinutes(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const rest = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rest ? 1 : 0));
}

function clampDuration(base: number): { min: number; max: number } {
  return { min: Math.max(5, base - 5), max: base + 5 };
}

function adjustDurationsToTarget(baseDurations: number[], targetTotal: number): number[] {
  const durations = [...baseDurations];
  const bounds = baseDurations.map(clampDuration);
  let current = durations.reduce((a, b) => a + b, 0);

  if (current < targetTotal) {
    for (;;) {
      let changed = false;
      for (let i = 0; i < durations.length && current < targetTotal; i++) {
        if (durations[i]! < bounds[i]!.max) {
          durations[i]! += 1;
          current += 1;
          changed = true;
        }
      }
      if (!changed || current >= targetTotal) break;
    }
  } else if (current > targetTotal) {
    for (;;) {
      let changed = false;
      for (let i = durations.length - 1; i >= 0 && current > targetTotal; i--) {
        if (durations[i]! > bounds[i]!.min) {
          durations[i]! -= 1;
          current -= 1;
          changed = true;
        }
      }
      if (!changed || current <= targetTotal) break;
    }
  }
  return durations;
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
  ageGroup?: TrainingAgeGroupId;
  exerciseAgeMap?: TrainingExerciseAgeMap;
}): AiFullTrainingSession {
  const { durationMin, objective, players, ageGroup, exerciseAgeMap } = params;
  const themes = detectTrainingThemes(objective);
  const explicitDefs = filterDrillsByAgeGroup(
    extractExplicitDrillDefsFromObjective(objective),
    ageGroup,
    exerciseAgeMap
  );

  if (ageGroup && explicitDefs.length === 0 && extractExplicitDrillDefsFromObjective(objective).length > 0) {
    throw new Error("explicit_drills_not_in_age_group");
  }

  if (explicitDefs.length > 0) {
    const selectedDefs: MainDrillDef[] = [];
    let explicitTotal = 0;
    let i = 0;
    while (explicitTotal < durationMin - 2 && i < 80) {
      const def = explicitDefs[i % explicitDefs.length]!;
      selectedDefs.push(def);
      explicitTotal += singleDrillDurationForTitle(def.title, objective.length);
      i += 1;
    }
    if (selectedDefs.length === 0) selectedDefs.push(explicitDefs[0]!);
    const baseDurations = selectedDefs.map((d) => singleDrillDurationForTitle(d.title, objective.length));
    const adjusted = adjustDurationsToTarget(baseDurations, durationMin);
    const blocks: AiTrainingBlock[] = selectedDefs.map((def, idx) => {
      const mins = adjusted[idx]!;
      const body = def.describe(players, mins);
      return { title: def.title, ...body, durationMin: mins, phase: "main" };
    });

    const listed = explicitDefs.map((d) => d.title).join(" · ");
    return {
      sessionTitle: `Treino orientado por exercícios escolhidos · ${durationMin} min`,
      summary: `Plano montado com base nos exercícios que escreveste no objetivo de hoje (${listed}).`,
      blocks,
      closingNotes:
        "Os exercícios foram forçados pelos nomes indicados no objetivo. Ajusta tempo e carga conforme disponibilidade do plantel.",
    };
  }

  const seed = hashSeed(objective, durationMin);

  const summary = `Plano gerado localmente com base no teu objetivo (${themes.filter((t) => t !== "balanced").join(", ") || "equilíbrio"}) e ${players.length} jogadores seleccionados. Ajusta tempos e espaços ao teu relvado.`;

  const recalc: AiTrainingBlock[] = [];
  const warmBase = singleDrillDurationForTitle("Aquecimento com Bola", objective.length);
  const coolBase = 10;
  const targetMainTotal = Math.max(5, durationMin - warmBase - coolBase);
  const allowedMain = filterDrillsByAgeGroup(
    MAIN_DRILLS.filter((d) => d.title !== "Aquecimento com Bola"),
    ageGroup,
    exerciseAgeMap
  );
  if (ageGroup && allowedMain.length === 0) {
    throw new Error("no_drills_for_age_group");
  }
  const rankedDefs = pickMainDrills(
    themes,
    Math.max(allowedMain.length, 1),
    seed,
    new Set<string>(["Aquecimento com Bola"]),
    ageGroup,
    exerciseAgeMap
  );
  if (rankedDefs.length === 0) throw new Error("no_drills_for_age_group");
  const defs2: MainDrillDef[] = [];
  let selectedMainTotal = 0;
  let idx = 0;
  while (selectedMainTotal < targetMainTotal - 2 && idx < 160) {
    const def = rankedDefs[idx % rankedDefs.length]!;
    defs2.push(def);
    selectedMainTotal += singleDrillDurationForTitle(def.title, objective.length);
    idx += 1;
  }
  if (defs2.length === 0) defs2.push(rankedDefs[0]!);
  const warmUpAllowed =
    !ageGroup || resolveExerciseAgeGroupsForTitle("Aquecimento com Bola", exerciseAgeMap).includes(ageGroup);
  if (!warmUpAllowed) {
    throw new Error("warmup_not_in_age_group");
  }

  const mainBaseDurations = defs2.map((def) => singleDrillDurationForTitle(def.title, objective.length));
  const adjustedMainDurations = adjustDurationsToTarget(mainBaseDurations, targetMainTotal);
  const allAdjusted = adjustDurationsToTarget([warmBase, ...adjustedMainDurations, coolBase], durationMin);
  const warmD = allAdjusted[0]!;
  const coolD = allAdjusted[allAdjusted.length - 1]!;

  recalc.push({
    title: "Aquecimento com Bola",
    durationMin: warmD,
    phase: "warmup",
    description: `Os jogadores conduzem a bola, passam por 2 cones em drible e, após realizar o passe para um colega, saem imediatamente em sprint para o espaço livre. O exercício decorre de forma contínua, focando a coordenação, controlo de bola e aceleração após passe. (${warmD} min). ${players.length} jogadores.`,
    coachingPoints:
      "Condução com toques próximos e cabeça levantada nos cones; passe firme e jogável ao colega; arranque explosivo no instante após o passe, atacando espaço livre.",
    setup: "Rectângulo ou corredor ~20×15 m (ajustável); 2 cones por repetição + bolas suficientes para fluidez; filas ou rotação em pares.",
    diagramHint: "Condução → slalom 2 cones → passe ao colega → sprint imediato ao espaço; rotação contínua.",
    videoUrl: WARM_UP_WITH_BALL_VIDEO_URL,
  });

  defs2.forEach((def, i) => {
    const mins = allAdjusted[i + 1] ?? adjustedMainDurations[i] ?? singleDrillDurationForTitle(def.title, objective.length);
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
  "Passe Entre Linhas e Ataque",
  "Jogo de 9v9 + 2",
  "Transição com Finalização",
  "Recuperação de Bola no Rondo para Finalização",
  "4v4 + Apoios Laterais",
  "3 Cenários 5v5",
  "Ataque após sucessão de passes",
  "Superioridade nos Setores",
]);
/** Valor médio quando o treinador indica ~15–20 min (ex.: bloco final). */
const SINGLE_DRILL_18_MIN_TITLES = new Set<string>(["Duplo Exercício de Finalização"]);
const SINGLE_DRILL_15_MIN_TITLES = new Set<string>([
  "Transição Rápida 3v2",
  "Ataque com 5 Equipas 3v3",
  "Rondo com Organização Fixa Posicional",
  "Passe Entre Linhas 7v3",
  "Recuperação Defensiva no Contra Ataque",
  "Canto Curto Estudado",
  "Reação e Finalização",
  "Posse de Bola com Transição",
  "Combinações e Passe de Rotura",
  "Combinações sob Pressão",
  "Movimentação dentro de Área em Cruzamentos",
  "Variação de Cruzamentos",
  "Variações para Cruzamento",
  "Circuito de Construção para Quebrar Linhas",
  "Saída de Jogo com Finalização Rápida",
  "Rondo com Variação do Jogo",
]);
const SINGLE_DRILL_10_MIN_TITLES = new Set<string>([
  "Ativação dos Passes",
  "Rotação de 4 Defesas a Pressionar",
  "Transição Defensiva Compacta",
  "Cruzamento e Finalização fora da Área",
  "4 Finishing Drills",
  "Pontapé de Baliza 1",
  "Pontapé de Baliza 2",
  "Corrida do Meio Campo nas Costas da Defesa",
  "Rondo 5v3",
  "Constante abertura de Rondo",
  "De Construção para Contra Ataque ",
  "Rondo para Contra Ataque",
  "Overlap do Lateral: Extremo",
  "Overlap do Lateral: Avançado ",
  "Exercício de Pressão",
  "Exercício de Finalização 3v2",
  "Transição (2+1)v1",
  "Livre Direto Estudado ",
  "Livre Direto Estudado: Movimentação do Extremo",
  "Situações de 1v1",
  "Passe e Movimentação",
  "Drible Rápido e Passe",
  "Sair a Jogar da Defesa com Pressão",
  "Jogo do Galo",
  "Variação de Posse de Bola com base na Pressão",
]);
const SINGLE_DRILL_8_MIN_TITLES = new Set<string>(["Passe Duplo e Movimentação"]);
const SINGLE_DRILL_5_MIN_TITLES = new Set<string>([
  "Aquecimento com Bola - Movimentação",
  "Canto Curto: Empoli",
  "Canto Curto: Newcastle",
  "Rondo 9v3",
  "Aquecimento com Bola",
]);

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
  if (title === "Circuito de Construção para Quebrar Linhas") {
    return {
      progression:
        "Reduz a largura dos corredores de overlap para exigir passe em profundidade mais preciso; ou acrescenta um jogador que fecha o espaço ao 10 numa série; ou limite de 2 toques na zona média para acelerar decisões.",
      variations:
        "Espelhar obrigatoriamente pelo lado esquerdo na 2.ª série; ou exige passe entre linhas ao 10 sempre com o pé interior; ou após overlap só conta se houver terceiro homem na zona final.",
    };
  }

  if (title === "Saída de Jogo com Finalização Rápida") {
    return {
      progression:
        "Adversário com linha mais alta no lado da atração para forçar timing do passe ao avançado; ou máximo 8 s desde o pontapé até ao cruzamento; ou após finalização obrigar recuperação da 2.ª bola em ≤6 s com bloco compacto.",
      variations:
        "Espelhar toda a sequência pelo lado esquerdo; ou cruzamento obrigatoriamente em passe rasteiro (sem elevação) numa série; ou extremo rápido só pode finalizar de primeira; ou médio do lado oposto com 2 toques máx. antes de ligar o avançado.",
    };
  }

  if (title === "Rondo com Variação do Jogo") {
    return {
      progression:
        "Variação obrigatória só com passe rasteiro entre linhas (como na progressão descrita); ou sobe a meta para 10 passes antes da viragem; ou após recuperação a equipa que roubou tem máximo 6 s para ligar o outro quadrado.",
      variations:
        "Viragem só pelo extremo da direita durante 2 minutos e depois só pela esquerda; ou 2 toques máx. no quadrado ativo após a receção no 2.º quadrado; ou golo/ponto extra se a viragem vier em ≤3 passes após os 7 obrigatórios.",
    };
  }

  const isOffensiveBetweenLines = title === "Passe Entre Linhas e Ataque";
  const isBetweenTheLines = title === "Passe Entre Linhas 7v3";
  const isDefensiveRecoveryOnCounterAttack = title === "Recuperação Defensiva no Contra Ataque";
  const isBackFourShifting = title === "Rotação de 4 Defesas a Pressionar";
  const isCompactDefendingTransition = title === "Transição Defensiva Compacta";
  const isFinishingTransition = title === "Transição com Finalização";
  const isCrossAndStrike = title === "Cruzamento e Finalização fora da Área";
  const isFourFinishingDrills = title === "4 Finishing Drills";
  const isDoubleFinishing = title === "Duplo Exercício de Finalização";
  const is9v9Plus2Game = title === "Jogo de 9v9 + 2";
  const isRondo9v3 = title === "Rondo 9v3";
  const isRondo5v3 = title === "Rondo 5v3";
  const isBreakoutRondo = title === "Constante abertura de Rondo";
  const is2Plus1V1Transition = title === "Transição (2+1)v1";
  const isShortCornerRoutine = title === "Canto Curto Estudado";
  const isShortCornerByNewcastle = title === "Canto Curto: Newcastle";
  const isShortCornerByEmpoli = title === "Canto Curto: Empoli";
  const isFreeKickRoutine = title === "Livre Direto Estudado ";
  const isShortFreeKickWingerMovement = title === "Livre Direto Estudado: Movimentação do Extremo";
  const isBuildUpIntoCounterAttack = title === "De Construção para Contra Ataque ";
  const isRondoToCounterAttack = title === "Rondo para Contra Ataque";
  const isFitnessRondoIntoFinishing = title === "Recuperação de Bola no Rondo para Finalização";
  const isGoalKick1 = title === "Pontapé de Baliza 1";
  const isGoalKick2 = title === "Pontapé de Baliza 2";
  const isMidfielderRunBehindDefense = title === "Corrida do Meio Campo nas Costas da Defesa";
  const isFullBackOverlapWinger = title === "Overlap do Lateral: Extremo";
  const isFullBackOverlapStriker = title === "Overlap do Lateral: Avançado ";
  const is3v2FastBreak = title === "Transição Rápida 3v2";
  const is3v2FinishingDrill = title === "Exercício de Finalização 3v2";
  const is5Teams3v3Attacking = title === "Ataque com 5 Equipas 3v3";
  const isFixedPositionRondo = title === "Rondo com Organização Fixa Posicional";
  const isWarmUpWithMovement = title === "Aquecimento com Bola - Movimentação";
  const isWarmUpWithBall = title === "Aquecimento com Bola";
  const isPassingActivation = title === "Ativação dos Passes";
  const isDualPassing = title === "Passe Duplo e Movimentação";
  const isPressingExercise = title === "Exercício de Pressão";

  if (title === "Movimentação dentro de Área em Cruzamentos") {
    return {
      progression:
        "Reduz a largura útil na área para exigir cruzamentos mais precisos; ou o lateral só cruza após comando verbal do médio; ou acrescenta segundo defensor a fechar o primeiro poste (sombra).",
      variations:
        "Séries alternadas de cruzamento rasteiro e pendulado; ou dois remates de primeira obrigatórios antes de rodar papéis; ou médio e lateral a trocar de função a cada 4 entradas.",
    };
  }

  if (title === "Variação de Cruzamentos") {
    return {
      progression:
        "Golo vale duplo se sair de cruzamento de primeira após devolução interior; ou limita a 1 toque antes do cruzamento em todas as variantes durante 3 minutos; ou acrescenta segundo defensor na área (sombra).",
      variations:
        "Ciclo obrigatório: 2 min em cada uma das 3 variações antes de libertar escolha livre; ou troca o servidor (coach por médio) no 1-2 da banda; ou cruzamento só com o pé não dominante numa ronda.",
    };
  }

  if (title === "Variações para Cruzamento") {
    return {
      progression:
        "Só 1.ª variação durante 6 min e depois só 2.ª; ou lateral/extremo trocam de banda a cada 4 séries; ou cruzamento obrigatório ao segundo poste durante um bloco.",
      variations:
        "Adiciona defensor activo no underlap; ou médio só pode finalizar de primeira; ou extremo e lateral invertem papéis fixos por 3 minutos antes de libertar escolha.",
    };
  }

  if (title === "4v4 + Apoios Laterais") {
    return {
      progression:
        "Apoios exteriores com máximo 2 toques num bloco de 3 min antes de voltar a 1 toque; ou campo mais estreito para forçar verticalidade; ou golo de cabeça vale duplo.",
      variations:
        "Rotação dos apoios laterais com os da linha de baliza a cada 5 minutos; ou equipa que marca mantém o campo e escolhe qual adversário entra; ou limite de 8 s para remate após recuperação no 4v4.",
    };
  }

  if (title === "3 Cenários 5v5") {
    return {
      progression:
        "Meta de 2 golos em vez de 3 para acelerar rotações; ou na 1.ª regra exige 4 jogadores (não todos) à frente da linha para o duplo; ou na 3.ª regra permite 1 passe para trás por posse antes de progressão.",
      variations:
        "Ciclo fixo das 3 regras por ordem (1→2→3) em vez de mudar só após golo; ou equipa de fora entra sem trabalho físico num bloco; ou golo de cabeça vale +1 em qualquer regra.",
    };
  }

  if (title === "Ataque após sucessão de passes") {
    return {
      progression:
        "Sobe a meta para 8–10 passes no retângulo antes de ligar; ou o passador que entra no 2.º setor só pode tocar uma vez antes de finalizar; ou defesa que recupera tem máximo 6 s para marcar numa mini-baliza.",
      variations:
        "Ligação obrigatória pelo extremo da direita durante 3 min; ou 2 toques máx. no 2.º setor após entrada do 5.º homem; ou no retângulo só 1 toque nas laterais para acelerar circulação.",
    };
  }

  if (title === "Superioridade nos Setores") {
    return {
      progression:
        "Reduzir o tempo no setor central (ex.: ≤8 s para ligar corredor); ou condicionar corredor a 2 toques no portador para acelerar o 3v2; ou defesa que recupera deve finalizar em ≤6 s numa mini-baliza.",
      variations:
        "Alternar lado de progressão obrigatório por blocos de 2 min; ou trocar o jogador de apoio que entra no corredor a cada repetição; ou no setor ofensivo só conta golo após passe extra para obrigar leitura do 4v3.",
    };
  }

  if (title === "Variação de Posse de Bola com base na Pressão") {
    return {
      progression:
        "Aumenta a exigência dos pressores (contacto leve permitido) ou reduz o espaço entre cones; ou obriga decisão interior/exterior em ≤2 s após a receção do jogador aberto.",
      variations:
        "Alternar regra de toques (2 toques só na fase inicial, depois só 1.º); ou trocar o número de pressores (2 vs 4) por blocos de 90 s; ou impor que a condução final termine sempre numa mini-baliza ou linha de fim.",
    };
  }

  if (title === "Combinações e Passe de Rotura") {
    return {
      progression:
        "Encurta distâncias para acelerar o pensamento e o passe de rotura; ou acrescenta defensor leve a seguir o extremo na rotura (sombra); ou exige que o passe ao outro lado seja sempre com o pé não dominante numa série.",
      variations:
        "Espelhar pelo lado canhoto; ou trocar o arranque (começar pelo lateral); ou após a profundidade obrigar 1-2 com o CM antes do passe ao outro lado; ou meta de X combinações limpas em 2 minutos por grupo.",
    };
  }

  if (title === "Combinações sob Pressão") {
    return {
      progression:
        "Reduz o espaço entre cones para forçar decisão ainda mais rápida; ou acrescenta segundo treinador a pressionar o portador após o 2.º passe; ou alterna 2 toques com uma série de só 1 toque na zona final.",
      variations:
        "Comando verbal a cada 20 s (obrigatório jogar só pela banda ou só pelo eixo); ou passe longo obrigatório após cada triangulação fechada; ou pontuação interna por combinações limpas em 60 s.",
    };
  }

  if (title === "Sair a Jogar da Defesa com Pressão") {
    return {
      progression:
        "Reduz espaço no setor de saída e limita a equipa em posse a 2 toques para acelerar decisão; ou aumenta o trigger de pressão (2 pressionantes saltam ao mesmo tempo após 3.º passe).",
      variations:
        "Após recuperação, obrigar finalização em ≤6 segundos no 3v2; ou trocar alvo de transição (baliza esquerda/direita obrigatória por comando); ou limitar o trinco a 1 toque em blocos curtos para estimular apoios rápidos.",
    };
  }

  if (title === "Jogo do Galo") {
    return {
      progression:
        "Aumenta distância entre linha de partida e tabuleiro para exigir mais velocidade; ou obriga decisão em ≤2 segundos após sinal para acelerar leitura do jogo.",
      variations:
        "Trocar para modo ofensivo/defensivo por comando (numa ronda só podes bloquear, noutra só podes completar linha); ou jogar com 2 bolas por ação (uma por equipa) para aumentar caos controlado e reação.",
    };
  }

  if (title === "Posse de Bola com Transição") {
    return {
      progression:
        "Reduz o tempo máximo na posse (ex.: 8–10 s) para forçar viragem; ou após viragem bem-sucedida exige 2 toques máx. no setor de chegada; ou os 2 que saltam à pressão só podem recuperar com desarme limpo (sem empurrão).",
      variations:
        "Trocar 5v3 por 5v2+1 neutro que só pode defender 1 toque; ou contar ponto duplo se a viragem vier em ≤4 passes; ou obrigar viragem obrigatoriamente pela baliza lateral 'fraca' durante 2 minutos.",
    };
  }

  const progression = isPressingExercise
    ? "Aumenta a exigência no último terço rival (menos tempo para sair); ou reduz o espaço para a 2ª bola; ou força viragem obrigatória sempre ao lado do central identificado como mais fraco."
    : isBetweenTheLines
      ? "Encurta o rectângulo para forçar decisão mais rápida; ou obriga 3 toques máx. à equipa de 7; ou os 3 defensores só podem recuperar com 2 toques; ou neutro só pode jogar em 1 toque."
      : isDefensiveRecoveryOnCounterAttack
        ? "Encurta distância até à baliza; ou atacantes com máximo 3 toques no 2v1; ou recuperador parte 0,5–1 s mais tarde para premiar rapidez ofensiva; ou obriga remate só com o pé interior na primeira série."
        : isOffensiveBetweenLines
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
                            : isBreakoutRondo
                              ? "Sobe a meta para 8 passes no interior; ou após recuperação da equipa branca exige remate em ≤4 toques; ou interior só com 1 toque até à saída para o exterior."
                              : is2Plus1V1Transition
                                ? "Encurta cada zona para forçar decisão mais rápida; ou o neutro só pode jogar em 1 toque ao entrar na zona; ou após recuperação, remate obrigatório numa mini-baliza em ≤4 s."
                                : isShortCornerRoutine
                                  ? "Limita o canto curto a 2 toques até ao passe de retorno; ou obriga remate de 1.ª na frontal em ≤4 s; ou alterna bloqueio no eixo e meio-espaço para variar referência defensiva."
                                  : isShortCornerByNewcastle
                                    ? "Encurta tempo entre receção curta e decisão final; ou obriga o batedor a decidir em no máximo 2 toques; ou alterna bloqueio no 1.º e 2.º defensor para variar o corredor livre."
                                    : isShortCornerByEmpoli
                                      ? "Aumenta a velocidade da sequência (apoio curto + cruzamento em ≤4 s); ou força corrida ao 2.º poste apenas após gesto de chamada do batedor; ou obriga reposicionamento imediato dos 2 jogadores de segurança após cada repetição."
                                    : isFreeKickRoutine
                                      ? "Encurta o tempo entre o toque curto e o passe à entrada da área (ex.: ≤2 s); ou obriga o jogador da esquina a jogar obrigatoriamente com o pé interior na 1.ª série; ou acrescenta defesa móvel na frontal para forçar leitura entre remate e cruzamento."
                                    : isShortFreeKickWingerMovement
                                      ? "Exige altura mínima no pique (por cima da linha da barreira simulada); ou o extremo só arranca no toque do executante (sem movimento ilegal); ou acrescenta lateral a percorrer com o extremo na corrida às costas."
                                : isBuildUpIntoCounterAttack
                                ? "Reduz o tempo de ligação entre setores (ex.: 6 s); ou limita a saída a 2 toques por jogador; ou no 3v2 ofensivo obriga remate em ≤5 s após receção."
                                : isRondoToCounterAttack
                                  ? "Sobe a meta para 12 passes antes da equipa em posse poder finalizar; ou limita a saída do 4v2 a 6 s; ou obriga a equipa que recupera a jogar de primeira no primeiro passe do contra-ataque."
                                  : isFitnessRondoIntoFinishing
                                    ? "Reduz o espaço em cada setor; ou limita a equipa em posse a 2 toques; ou no 2v1 final obriga remate em ≤4 s para contar o bónus de tempo."
                                    : isGoalKick1
                                      ? "Adversário com linha mais alta para forçar timing do overlap; ou máximo 8 s desde a reposição até ao passe em profundidade; ou lateral obrigado a cruzar com o pé interior na primeira série."
                                      : isGoalKick2
                                        ? "Avançado adversário com pressão dobrada (salto + sombra ao GR); ou GR com máximo 5 s para jogar; ou extremo obrigado a iniciar o movimento de pressão antes do passe ao lateral."
                                        : isMidfielderRunBehindDefense
                                          ? "Linha defensiva mais alta e viva; ou máximo 2 toques na combinação médio–extremo–avançado; ou cruzamento obrigatório com o pé interior na primeira série."
                                          : isFullBackOverlapWinger
                                            ? "Força variação de corredor em 2 passes (central-trinco-central) e obriga o extremo de apoio a jogar de primeira no corredor interior; limita a última ação na área a 2 toques."
                                            : isFullBackOverlapStriker
                                              ? "Aumenta a pressão no primeiro central para acelerar a circulação; ou obriga o avançado a jogar sempre de primeira; ou limita os médios a 2 toques para forçar decisão rápida no lado a atacar."
                                              : is3v2FinishingDrill
                                                ? "Reduz a largura do terço para forçar decisão mais rápida; ou obriga finalização em ≤5 toques após a saída dos centrais; ou um defesa pode pressionar o portador após o primeiro passe (contacto leve)."
                                                : is5Teams3v3Attacking
                                                  ? "Encurta os dois campos para forçar mais ritmo; ou obriga remate no máximo em 4 toques após recuperação; ou só entra a equipa de espera quando o treinador dá sinal (para trabalhar tempo morto); ou um jogador por equipa só pode finalizar de primeira num bloco de 4 minutos."
                                                  : isFixedPositionRondo
                                                    ? "Aperta as zonas para exigir passes ainda mais curtos; ou equipa em posse com máximo 2 toques; ou permite apenas deslocamento horizontal numa série e só vertical na seguinte; ou aumenta para 3 pressores numa zona durante 60 s (alerta de risco)."
                                                    : isWarmUpWithMovement
                                                      ? "Reduz o espaço entre cones para forçar decisões mais rápidas; ou alterna pé dominante/não dominante a cada 90 s; ou obriga o passe de primeira em uma série curta para aumentar velocidade de circulação."
                                                    : is3v2FastBreak
                                                      ? "Encurta o eixo a ~24 m para decisões ainda mais rápidas; ou extremo com máximo 2 toques antes do cruzamento na 1.ª fase; ou defesa pode sair ao cruzamento com contacto leve."
                                                      : isWarmUpWithBall
                                                        ? "Acrescenta um 3.º cone no slalom; ou exige passe com o pé interior; ou sprint com mudança de direcção obrigatória ao desmarcar."
                                                        : isPassingActivation
                                                          ? "Encurta distâncias entre estações para subir frequência; ou acrescenta segunda passagem na escada em sentido inverso; ou na zona final exige arranque após meio vaivém (parada–explosão)."
                                                          : isDualPassing
                                                            ? "Encolhe o hexágono para forçar primeiro toque ainda mais limpo; ou acrescenta um defensor ligeiro no centro por 45 s; ou exige só combinações com o pé não dominante."
                                                            : "Aumenta espaço (mais difícil defender) ou reduz toques permitidos no rondo. Alterna pé fraco em passes fixos.";

  if (isDualPassing) return { progression };

  const variations = isPressingExercise
    ? "Jogo condicionado: recuperação na faixa lateral vale ponto extra; ou adversário com máximo 3 toques na saída; ou acrescenta 2º avançado a simular pressão ao GR em alternância."
    : isBetweenTheLines
      ? "Mini-balizas mais largas ou mais estreitas; ou golo de primeiro toque na zona de finalização vale duplo; ou rotação do bloco de 7 a cada 2 golos marcados."
      : isDefensiveRecoveryOnCounterAttack
        ? "Quem serve na linha de fundo alterna entre central e lateral; ou golo vale duplo se o remate sair em ≤4 s após o passe inicial; ou recuperador só pode interceptar (sem duelo de corpo) numa série."
        : isOffensiveBetweenLines
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
                          : isBreakoutRondo
                            ? "Anel exterior mais estreito para decisão mais rápida; ou golo após roubo branco vale duplo se vier em ≤3 passes; ou neutro no interior que só pode orientar com 1 toque."
                            : is2Plus1V1Transition
                              ? "Só 3 mini-balizas activas por blocos de 2 min; ou após recuperação o defensor deve tocar noutra zona antes de rematar; ou equipa em posse deve ligar obrigatoriamente a 2 zonas diferentes em ≤8 passes."
                              : isShortCornerRoutine
                                ? "No lado esquerdo, sequência obrigatória com batedor destro e apoio canhoto (e inverso no lado direito); ou o bloqueador troca posição com finalizador a cada repetição; ou só conta golo se o remate sair de 1.ª na frontal."
                                : isShortCornerByNewcastle
                                  ? "Definir duas chamadas (A/B): A para passe tenso na zona de penálti e B para cruzamento ao 2.º poste; ou variar o jogador que arranca do 2.º poste para a marca; ou condicionar 4v4 no 2.º poste com marcação mista."
                                  : isShortCornerByEmpoli
                                    ? "Criar chamada de engano para reforçar atração no 1.º poste antes da bola entrar curta; ou alternar atacante do 2.º poste entre lateral/extremo para variar perfil de finalização; ou condicionar finalização em 1 toque no 2.º poste."
                              : isFreeKickRoutine
                                ? "Espelhar a mesma estrutura do outro lado do campo; ou definir chamadas (A/B/C) para remate direto, cruzamento ao 2.º poste e combinação junto à barreira; ou golo só conta se a jogada tiver começado com toque curto obrigatório."
                              : isShortFreeKickWingerMovement
                                ? "Espelhar com extremo canhoto no lado direito e destro no esquerdo; ou variar o pique rasteiro vs pendulado para o mesmo corredor; ou jogador na entrada da área com remate obrigatório de 1.ª numa série e passe de interior na seguinte."
                              : isBuildUpIntoCounterAttack
                              ? "Aumenta pressão para 3+1 no setor de saída por blocos curtos; ou no setor ofensivo troca para 3v3 com golo a valer apenas após passe extra; ou equipa que recupera deve finalizar em ≤4 s para contar."
                              : isRondoToCounterAttack
                                ? "Troca o 4v2 por 4v3 com recuperação defensiva atrasada; ou golo após 10 passes vale duplo para a equipa em posse; ou só conta o contra-ataque se houver remate em ≤5 s após o roubo."
                                : isFitnessRondoIntoFinishing
                                  ? "Troca o 2v1 final por 2v2 com perseguição atrasada; ou cada perda da equipa em posse soma penalização de +5 s; ou obriga a dupla a recuperar em todos os 3 setores antes de poder finalizar."
                                  : isGoalKick1
                                    ? "Espelhar toda a sequência pelo lado esquerdo; ou falso 9 a descair antes do passe ao trinco; ou profundidade obrigatoriamente em passe rasteiro (sem elevação)."
                                    : isGoalKick2
                                      ? "Espelhar padrão no lado esquerdo; ou trinco com 1 toque obrigatório nas duas primeiras saídas; ou lateral adversário com 'permissão' de contacto leve no duelo com o extremo."
                                      : isMidfielderRunBehindDefense
                                        ? "Espelhar sequência completa pelo lado esquerdo; ou defensor vivo a acompanhar uma das corridas nas costas; ou golo vale duplo se a finalização for de cabeça no 2.º poste."
                                        : isFullBackOverlapWinger
                                          ? "Define gatilho: passe no extremo em apoio obriga leitura imediata do trinco para soltar lateral nas costas. Alterna repetições em que o médio-centro ataca primeiro poste vs zona de penalty."
                                          : isFullBackOverlapStriker
                                            ? "Definir gatilhos de decisão: apoio no médio do lado da bola = obrigatório overlap; apoio no médio oposto = obrigatória rotura do extremo. Alternar corredor inicial dos centrais a cada série."
                                            : is3v2FinishingDrill
                                              ? "Após golo ou saída, nova bola imediata pelos centrais; ou centrais obrigados a 1 toque na saída; ou zona mínima de remate (ex.: só dentro da meia-lua) numa série."
                                              : is5Teams3v3Attacking
                                                ? "Dois tempos com troca da equipa de espera entre o corredor central dos dois campos; ou golo sofrido obriga saída em sprint até à zona neutra; ou mini-torneio por pontos entre as cinco equipas; ou golo marcado em ≤8 s após entrada vale duplo."
                                                : isFixedPositionRondo
                                                  ? "Rotação completa das funções após X passes consecutivos; ou meta de 12 passes sem perda antes de trocar pressores; ou neutro no meio que só pode jogar de primeira; ou disputar por quadrantes: equipa que recupera na zona X sai e entra outro quinteto."
                                              : isWarmUpWithMovement
                                                ? "Cronometrar blocos curtos (45–60 s) e pontuar execução técnica limpa sem perder ritmo; ou inserir mudança de direção obrigatória no sprint ao cone vazio; ou variar formato do circuito (quadrado/hexágono) mantendo 2 toques máximos."
                                                  : is3v2FastBreak
                                                    ? "1.ª fase só cruzamento rasteiro; ou médio/treinador serve a 2.ª bola em profundidade para o extremo entrar ao eixo; ou GR activo nas duas fases com saída ao primeiro passe."
                                                    : isWarmUpWithBall
                                                      ? "Duas filas opostas a cruzar sem colidir; ou volteio extra entre cones; ou após o sprint, regressar a pé ao fim da fila com ball mastery leve."
                                                      : isPassingActivation
                                                        ? "Trocar ordem das estações (ex.: slalom antes da escada); ou séries cronometradas (45–60 s) com mudança de pé na escada; ou saltos laterais na barreira numa ronda e só à frente na seguinte."
                                                        : "Reduz jogadores no meio; ou acrescenta neutro exterior; ou pontua por X passes seguidos.";

  return { progression, variations };
}

export function buildLocalSingleDrill(
  brief: string,
  players: Player[],
  ageGroup?: TrainingAgeGroupId,
  exerciseAgeMap?: TrainingExerciseAgeMap
): AiSingleDrill {
  const explicit = extractExplicitDrillDefsFromObjective(brief);
  const explicitAllowed = filterDrillsByAgeGroup(explicit, ageGroup, exerciseAgeMap);
  if (explicit.length > 0 && explicitAllowed.length === 0) {
    throw new Error("explicit_drills_not_in_age_group");
  }

  const themes = detectTrainingThemes(brief);
  const seed = hashSeed(brief, 0);
  const defs =
    explicitAllowed.length > 0
      ? [explicitAllowed[0]!]
      : pickMainDrills(themes, 1, seed, undefined, ageGroup, exerciseAgeMap);
  if (defs.length === 0) throw new Error("no_drills_for_age_group");
  const def = defs[0]!;
  const mins = singleDrillDurationForTitle(def.title, brief.length);
  const body = def.describe(players, mins);
  const { progression, variations } = singleDrillProgressionVariationsForTitle(def.title);
  const isDualPassing = def.title === "Passe Duplo e Movimentação";

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
    "setPiece",
    "stretching",
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
  /** Exercício criado pelo treinador no quadro tático. */
  isCoachSketchExercise?: boolean;
  /** Imagem composta dos frames (data URL) para impressão. */
  printImageDataUrl?: string;
  coachSavedExerciseId?: string;
};

/**
 * Catálogo completo do motor local: aquecimento fixo, todos os exercícios principais (com ou sem vídeo), volta à calma.
 */
export function getTrainingCatalogItems(players: Player[]): TrainingCatalogItem[] {
  const n = Math.max(1, players.length);
  const warmDuration = 5;
  const coolDuration = 10;
  const warmPv = singleDrillProgressionVariationsForTitle("Aquecimento com Bola");

  const warmup: TrainingCatalogItem = {
    catalogId: "template:warmup",
    title: "Aquecimento com Bola",
    phase: "warmup",
    durationMin: warmDuration,
    brief: `Aquecimento com bola: drible por 2 cones, passe ao colega e sprint ao espaço livre. Foco em coordenação, controlo e aceleração após passe. ${n} jogadores.`,
    description: `Os jogadores conduzem a bola, passam por 2 cones em drible e, após realizar o passe para um colega, saem imediatamente em sprint para o espaço livre. O exercício decorre de forma contínua durante 5 minutos, focando a coordenação, controlo de bola e aceleração após passe. ${n} jogadores.`,
    coachingPoints:
      "Condução com toques próximos e cabeça levantada nos cones; passe firme e jogável ao colega; arranque explosivo no instante após o passe, atacando espaço livre.",
    setup: "Rectângulo ou corredor ~20×15 m (ajustável); 2 cones por repetição + bolas suficientes para fluidez; filas ou rotação em pares.",
    groupSplit:
      n >= 10
        ? "Dois corredores paralelos com filas alternadas; rotação de papéis condução / recepção / sprint."
        : n >= 6
          ? "Um corredor; pares a alternar quem conduz e quem oferece o alvo de passe."
          : "Espaço menor; coach como parede de passe ou neutro se faltarem jogadores.",
    diagramHint: "Condução → slalom 2 cones → passe ao colega → sprint imediato ao espaço; rotação contínua.",
    videoUrl: WARM_UP_WITH_BALL_VIDEO_URL,
    progression: warmPv.progression,
    ...(warmPv.variations !== undefined ? { variations: warmPv.variations } : {}),
    filterCategories: ["warmup"],
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
    filterCategories: ["stretching"],
    defaultSaveCategory: "stretching",
  };

  /** Mapeamento explícito dos filtros da aba "Todos os exercícios", conforme pedido do treinador. */
  const explicitFilterCategoriesByTitle: Partial<Record<string, readonly SavedExerciseCategory[]>> = {
    // Aquecimento / activação
    "Aquecimento com Bola": ["warmup"],
    "Ativação dos Passes": ["warmup"],
    "Passe Duplo e Movimentação": ["warmup"],
    "Aquecimento com Bola - Movimentação": ["warmup"],
    "Situações de 1v1": ["warmup", "transition", "physical"],
    "Passe e Movimentação": ["warmup", "possession"],
    "Variação de Posse de Bola com base na Pressão": ["warmup", "possession"],
    "Combinações e Passe de Rotura": ["warmup", "possession", "transition"],
    "Circuito de Construção para Quebrar Linhas": ["warmup", "possession", "transition"],
    "Saída de Jogo com Finalização Rápida": ["transition", "finishing", "setPiece", "goalKick"],
    "Rondo com Variação do Jogo": ["warmup", "possession", "transition", "pressing"],
    "Combinações sob Pressão": ["warmup", "possession"],
    "Drible Rápido e Passe": ["possession"],
    "Reação e Finalização": ["possession", "finishing"],
    "Posse de Bola com Transição": ["possession", "transition", "pressing", "physical"],
    "Sair a Jogar da Defesa com Pressão": ["possession", "transition", "pressing", "goalKick", "finishing"],
    "Jogo do Galo": ["warmup", "physical"],

    // Posse de bola
    "Passe Entre Linhas e Ataque": ["possession", "transition"],
    "Passe Entre Linhas 7v3": ["possession", "pressing"],
    "Rondo 9v3": ["possession", "pressing", "transition", "physical"],
    "Rondo 5v3": ["possession", "pressing", "transition", "physical"],
    "Constante abertura de Rondo": ["possession", "pressing", "transition", "physical"],
    "Transição (2+1)v1": ["possession", "transition", "physical"],
    "Rondo para Contra Ataque": ["possession", "pressing", "transition"],
    "Pontapé de Baliza 1": ["possession", "goalKick", "setPiece"],
    "Pontapé de Baliza 2": ["possession", "goalKick", "setPiece"],
    "Rondo com Organização Fixa Posicional": ["possession", "pressing"],

    // Finalização
    "Recuperação Defensiva no Contra Ataque": ["finishing", "defensive", "transition"],
    "Jogo de 9v9 + 2": ["finishing"],
    "Duplo Exercício de Finalização": ["finishing"],
    "Transição com Finalização": ["finishing", "transition", "physical"],
    "Cruzamento e Finalização fora da Área": ["finishing"],
    "4 Finishing Drills": ["finishing", "physical"],
    "Canto Curto Estudado": ["finishing", "setPiece"],
    "Canto Curto: Newcastle": ["finishing", "setPiece"],
    "Canto Curto: Empoli": ["finishing", "setPiece"],
    "Livre Direto Estudado ": ["finishing", "setPiece"],
    "Livre Direto Estudado: Movimentação do Extremo": ["finishing", "setPiece"],
    "De Construção para Contra Ataque ": ["finishing", "transition"],
    "Recuperação de Bola no Rondo para Finalização": ["finishing", "pressing", "physical"],
    "Corrida do Meio Campo nas Costas da Defesa": ["finishing"],
    "Movimentação dentro de Área em Cruzamentos": ["finishing", "transition"],
    "Variação de Cruzamentos": ["finishing", "transition"],
    "Variações para Cruzamento": ["possession", "transition", "finishing"],
    "Overlap do Lateral: Extremo": ["finishing"],
    "Overlap do Lateral: Avançado ": ["finishing"],
    "Transição Rápida 3v2": ["finishing", "defensive", "transition", "physical"],
    "Exercício de Finalização 3v2": ["finishing", "defensive"],
    "Ataque com 5 Equipas 3v3": ["finishing", "transition", "physical"],
    "4v4 + Apoios Laterais": ["finishing", "transition", "physical"],
    "3 Cenários 5v5": ["possession", "transition", "finishing", "physical"],
    "Ataque após sucessão de passes": ["possession", "transition", "finishing"],
    "Superioridade nos Setores": ["finishing", "transition", "physical"],

    // Organização defensiva
    "Rotação de 4 Defesas a Pressionar": ["defensive", "pressing"],
    "Transição Defensiva Compacta": ["defensive", "pressing", "transition"],
    "Exercício de Pressão": ["defensive", "pressing"],
  };

  const mains: TrainingCatalogItem[] = MAIN_DRILLS.filter((def) => def.title !== "Aquecimento com Bola").map((def) => {
    const mins = singleDrillDurationForTitle(def.title, 40);
    const body = def.describe(players, mins);
    const { progression, variations } = singleDrillProgressionVariationsForTitle(def.title);
    const brief = body.description.replace(/\s*\(\d+\s*min\)\s*\.?$/iu, "").trim();
    const explicit = explicitFilterCategoriesByTitle[def.title];
    const fc = explicit ? [...new Set<SavedExerciseCategory>(explicit)] : [];
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

/**
 * Total de entradas no catálogo local (Planos de treino → «Todos os exercícios»):
 * aquecimento em template + todos os exercícios principais + volta à calma.
 * Igual a `getTrainingCatalogItems(players).length` para qualquer plantel.
 */
export function getTrainingCatalogExerciseCount(): number {
  return MAIN_DRILLS.length + 1;
}
