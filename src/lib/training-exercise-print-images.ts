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
  "Goal Kick 1": "goal-kick-1.png",
  "Goal Kick 2": "goal-kick-2.png",
  "Midfielder Run Behind Defense": "midfielder-run-behind-defense.png",
  "3v2 Fast Break": "3v2-fast-break.png",
};

export const TRAINING_EXERCISE_PRINT_IMAGE_FOLDER = "/images/training-exercises";

export function trainingExercisePrintImageForTitle(title: string): string | null {
  const fileName = TRAINING_EXERCISE_PRINT_IMAGE_BY_TITLE[title];
  if (!fileName) return null;
  return `${TRAINING_EXERCISE_PRINT_IMAGE_FOLDER}/${fileName}`;
}
