/**
 * Imagens usadas APENAS no PDF (print HTML), nunca na UI normal.
 * Coloca os ficheiros em `public/images/training-exercises/`.
 */
const TRAINING_EXERCISE_PRINT_IMAGE_BY_TITLE: Record<string, string> = {
  "Warm Up with Ball": "warm-up.png",
  "Passing Activation": "passing-activation.png",
  "Dual Passing": "dual-passing.png",
  "Rondo com pressão condicionada": "rondo-pressao-condicionada.png",
  "Jogo 4+4 vs 4+4 com transição imediata": "jogo-4x4-transicao-imediata.png",
  "Pressão alta coordenada 5v5+1": "pressao-alta-coordenada-5v5-1.png",
  "Finalização em velocidade a partir de cruzamento": "finalizacao-velocidade-cruzamento.png",
  "Back Four Shifting": "back-four-shifting.png",
  "Compact Defending Transition": "compact-defending-transition.png",
  "Possessão 8v8+2 neutros": "possessao-8v8-2-neutros.png",
  "Offensive Between Lines": "offensive-between-lines.png",
  "9v9 + 2 Game": "9v9-2-game.png",
  "Double Finishing Drill": "double-finishing-drill.png",
  "Finishing Transition": "finishing-transition.png",
  "Cross and Strike": "cross-and-strike.png",
  "4 Finishing Drills": "4-finishing-drills.png",
  "Rondo 9v3": "rondo-9v3.png",
  "Rondo 5v3": "rondo-5v3.png",
  "Breakout Rondo": "breakout-rondo.png",
  "Build up into Counter Attack": "build-up-into-counter-attack.png",
  "Fitness Rondo into Finishing": "fitness-rondo-finishing.png",
  "Goal Kick 1": "goal-kick-1.png",
  "Goal Kick 2": "goal-kick-2.png",
  "Midfielder Run Behind Defense": "midfielder-run-behind-defense.png",
  "Full Back Overlap - Winger": "full-back-overlap-winger.png",
  "Full Back Overlap - Striker": "full-back-overlap-striker.png",
  "Pressing Exercise": "pressing-exercise.png",
  "3v2 Fast Break": "3v2-fast-break.png",
};

export const TRAINING_EXERCISE_PRINT_IMAGE_FOLDER = "/images/training-exercises";

function normalizeExerciseTitle(title: string): string {
  return title
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

/** Alias úteis para títulos com pequenas variações (hífens, espaços, etc.). */
const TITLE_ALIASES_TO_IMAGE: Record<string, string> = {
  "full back overlap winger": "full-back-overlap-winger.png",
  "full back overlap striker": "full-back-overlap-striker.png",
};

export function trainingExercisePrintImageForTitle(title: string): string | null {
  const exact = TRAINING_EXERCISE_PRINT_IMAGE_BY_TITLE[title];
  if (exact) return `${TRAINING_EXERCISE_PRINT_IMAGE_FOLDER}/${exact}`;

  const normalized = normalizeExerciseTitle(title);
  const fileName =
    NORMALIZED_TITLE_TO_IMAGE[normalized] ??
    TITLE_ALIASES_TO_IMAGE[normalized] ??
    (normalized.includes("full back overlap") && normalized.includes("winger")
      ? "full-back-overlap-winger.png"
      : normalized.includes("full back overlap") && normalized.includes("striker")
        ? "full-back-overlap-striker.png"
        : undefined);
  if (!fileName) return null;
  return `${TRAINING_EXERCISE_PRINT_IMAGE_FOLDER}/${fileName}`;
}
