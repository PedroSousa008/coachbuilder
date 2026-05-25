/**
 * Imagens usadas APENAS no PDF (print HTML), nunca na UI normal.
 * Ficheiros em `public/images/training-exercises/`.
 *
 * Chaves = títulos exactos do catálogo (`training-session-local.ts`, português).
 */

export const TRAINING_EXERCISE_PRINT_IMAGE_FOLDER = "/images/training-exercises";

/** Título do exercício (app) → nome do ficheiro PNG na pasta public. */
const TRAINING_EXERCISE_PRINT_IMAGE_BY_TITLE: Record<string, string> = {
  "Aquecimento com Bola": "aquecimento.png",
  "Ativação dos Passes": "passing-activity.png",
  "Situações de 1v1": "1v1-situations.png",
  "Passe e Movimentação": "pass-move.png",
  "Reação e Finalização": "reaction-finishing.png",
  "Drible Rápido e Passe": "dribbling-passing.png",
  "Posse de Bola com Transição": "possession-transfer.png",
  "Sair a Jogar da Defesa com Pressão": "sair-jogar.png",
  "Jogo do Galo": "jogo-galo.png",
  "Passe Duplo e Movimentação": "dual-passing.png",
  "Aquecimento com Bola - Movimentação": "aquecimento-com-movimentação.png",
  "Variação de Posse de Bola com base na Pressão": "variacao-jogo.png",
  "Combinações e Passe de Rotura": "passe-rotura.png",
  "Combinações sob Pressão": "combinacoes-pressao.png",
  "Jogo 4+4 vs 4+4 com transição imediata": "jogo-4x4-transicao-imediata.png",
  "Rotação de 4 Defesas a Pressionar": "back-four-shifting.png",
  "Transição Defensiva Compacta": "compact-defending-transition.png",
  "Recuperação Defensiva no Contra Ataque": "defensive-recovery.png",
  "Passe Entre Linhas e Ataque": "offensive-between-lines.png",
  "Passe Entre Linhas 7v3": "between-the-lines.png",
  "Jogo de 9v9 + 2": "9v9-2-game.png",
  "Duplo Exercício de Finalização": "double-finishing-drill.png",
  "Transição com Finalização": "finishing-transition.png",
  "Cruzamento e Finalização fora da Área": "cross-and-strike.png",
  "Movimentação dentro de Área em Cruzamentos": "movimentação-cruzamento.png",
  "Variação de Cruzamentos": "variação-cruzamentos.png",
  "Variações para Cruzamento": "crossing-drill.png",
  "3 Cenários 5v5": "3-cenarios.png",
  "4v4 + Apoios Laterais": "4v4-4-teams.png",
  "Superioridade nos Setores": "superioridade-setores.png",
  "4 Exercícios de Finalização": "4-finishing-drills.png",
  "Rondo 9v3": "rondo-9v3.png",
  "Rondo 5v3": "rondo-5v3.png",
  "Constante abertura de Rondo": "breakout-rondo.png",
  "Transição (2+1)v1": "2+1v1-transition.png",
  "Canto Curto Estudado": "short-corner.png",
  "Canto Curto: Newcastle": "short-corner-newcastle.png",
  "Canto Curto: Empoli": "short-corner-empoli.png",
  "Livre Direto Estudado": "free-kick-routine.png",
  "Livre Direto Estudado: Movimentação do Extremo": "short-free-kick.png",
  "De Construção para Contra Ataque": "build-up-into-counter-attack.png",
  "Recuperação de Bola no Rondo para Finalização": "fitness-rondo-finishing.png",
  "Rondo para Contra Ataque": "rondo-to-counter.png",
  "Pontapé de Baliza 1": "goal-kick-1.png",
  "Pontapé de Baliza 2": "goal-kick-2.png",
  "Corrida do Meio Campo nas Costas da Defesa": "midfielder-run-behind-defense.png",
  "Overlap do Lateral: Extremo": "full-back-overlap-winger.png",
  "Overlap do Lateral: Avançado": "full-back-overlap-striker.png",
  "Transição Rápida 3v2": "3v2-fast-break.png",
  "Exercício de Finalização 3v2": "3v2-finishing-drill.png",
  "Ataque com 5 Equipas 3v3": "3v3-5-teams.png",
  "Rondo com Organização Fixa Posicional": "fixed-position-rondo.png",
  "Circuito de Construção para Quebrar Linhas": "circuito.png",
  "Saída de Jogo com Finalização Rápida": "kick-off.png",
  "Rondo com Variação do Jogo": "virar-jogo-rondo.png",
  "Exercício de Pressão": "pressing-exercise.png",

  // Aliases em inglês (sessões antigas / export)
  "Warm Up with Ball": "aquecimento.png",
  "Passing Activation": "passing-activity.png",
  "1v1 Situations": "1v1-situations.png",
  "Dual Passing": "dual-passing.png",
  "Rondo com pressão condicionada": "rondo-pressao-condicionada.png",
  "Pressão alta coordenada 5v5+1": "pressao-alta-coordenada-5v5-1.png",
  "Finalização em velocidade a partir de cruzamento": "finalizacao-velocidade-cruzamento.png",
  "Back Four Shifting": "back-four-shifting.png",
  "Compact Defending Transition": "compact-defending-transition.png",
  "Possessão 8v8+2 neutros": "possessao-8v8-2-neutros.png",
  "Offensive Between Lines": "offensive-between-lines.png",
  "Between the Lines": "between-the-lines.png",
  "9v9 + 2 Game": "9v9-2-game.png",
  "Double Finishing Drill": "double-finishing-drill.png",
  "Finishing Transition": "finishing-transition.png",
  "Cross and Strike": "cross-and-strike.png",
  "4v4 mais apoios laterais": "4v4-4-teams.png",
  "4 Finishing Drills": "4-finishing-drills.png",
  "Breakout Rondo": "breakout-rondo.png",
  "Build up into Counter Attack": "build-up-into-counter-attack.png",
  "Fitness Rondo into Finishing": "fitness-rondo-finishing.png",
  "Rondo to Counter Attack": "rondo-to-counter.png",
  "Goal Kick 1": "goal-kick-1.png",
  "Goal Kick 2": "goal-kick-2.png",
  "Midfielder Run Behind Defense": "midfielder-run-behind-defense.png",
  "Full Back Overlap - Winger": "full-back-overlap-winger.png",
  "Full Back Overlap - Striker": "full-back-overlap-striker.png",
  "Pressing Exercise": "pressing-exercise.png",
  "3v2 Fast Break": "3v2-fast-break.png",
  "3v2 Finishing Drill": "3v2-finishing-drill.png",
  "5 Teams 3v3 Attacking": "3v3-5-teams.png",
  "Fixed Position Rondo": "fixed-position-rondo.png",
  "(2+1)v1 Transition": "2+1v1-transition.png",
  "Short Corner Routine": "short-corner.png",
  "Short Corner by Newcastle": "short-corner-newcastle.png",
  "Short Corner by Empoli": "short-corner-empoli.png",
  "Free Kick Routine": "free-kick-routine.png",
  "Short Free Kick - Winger Movement": "short-free-kick.png",
  "Defensive Recovery on Counter Attack": "defensive-recovery.png",
};

/** Quando o basename do vídeo ≠ nome do PNG no disco. */
const VIDEO_BASENAME_TO_PRINT_IMAGE: Record<string, string> = {
  "warm-up.mp4": "aquecimento.png",
  "passing-activity.mp4": "passing-activity.png",
  "finishing-drill.mp4": "double-finishing-drill.png",
  "transition-finishing.mp4": "finishing-transition.png",
  "9v9+2.mp4": "9v9-2-game.png",
  "behind-defense.mp4": "midfielder-run-behind-defense.png",
  "full-back-overlap-1.mp4": "full-back-overlap-winger.png",
  "full-back-overlap-2.mp4": "full-back-overlap-striker.png",
  "3x2-fast-breaks.mp4": "3v2-fast-break.png",
  "jogo-galo.mp4": "jogo-galo.png",
  "crossing-drill.mp4": "crossing-drill.png",
};

function normalizeExerciseTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NORMALIZED_TITLE_TO_IMAGE: Record<string, string> = Object.fromEntries(
  Object.entries(TRAINING_EXERCISE_PRINT_IMAGE_BY_TITLE).map(([title, image]) => [
    normalizeExerciseTitle(title),
    image,
  ])
);

function imagePathForFileName(fileName: string): string {
  const clean = fileName.trim();
  return `${TRAINING_EXERCISE_PRINT_IMAGE_FOLDER}/${clean}`;
}

function lookupFromVideoUrl(videoUrl?: string): string | null {
  if (!videoUrl?.trim()) return null;
  const base = videoUrl.split("/").pop()?.trim().toLowerCase();
  if (!base) return null;
  const mapped = VIDEO_BASENAME_TO_PRINT_IMAGE[base];
  if (mapped) return imagePathForFileName(mapped);
  if (base.endsWith(".mp4")) {
    return imagePathForFileName(base.replace(/\.mp4$/i, ".png"));
  }
  return null;
}

/**
 * Caminho público da imagem de impressão (`/images/training-exercises/...`).
 * Usa título do catálogo; fallback pelo URL do vídeo do exercício.
 */
export function trainingExercisePrintImageForTitle(
  title: string,
  videoUrl?: string
): string | null {
  const trimmed = title.trim();
  if (!trimmed) return lookupFromVideoUrl(videoUrl);

  const exact = TRAINING_EXERCISE_PRINT_IMAGE_BY_TITLE[trimmed];
  if (exact) return imagePathForFileName(exact);

  const normalized = normalizeExerciseTitle(trimmed);
  const fromNorm = NORMALIZED_TITLE_TO_IMAGE[normalized];
  if (fromNorm) return imagePathForFileName(fromNorm);

  if (normalized.includes("full back overlap") && normalized.includes("winger")) {
    return imagePathForFileName("full-back-overlap-winger.png");
  }
  if (normalized.includes("full back overlap") && normalized.includes("striker")) {
    return imagePathForFileName("full-back-overlap-striker.png");
  }
  if (
    normalized.includes("aquecimento") &&
    normalized.includes("bola") &&
    !normalized.includes("movimentacao")
  ) {
    return imagePathForFileName("aquecimento.png");
  }

  return lookupFromVideoUrl(videoUrl);
}
