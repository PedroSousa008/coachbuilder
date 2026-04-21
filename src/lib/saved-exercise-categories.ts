import type { SavedExerciseCategory } from "@/types";

/** Exercícios cujo título ou URL de vídeo identifica padrões de pontapé de baliza / goal kick. */
export function isGoalKickExercise(title: string, videoUrl?: string): boolean {
  if (/goal\s*kick/i.test(title.trim())) return true;
  const v = (videoUrl ?? "").toLowerCase();
  if (v.includes("goal-kick") || v.includes("goalkick")) return true;
  return false;
}

/** Sugestão de categoria ao guardar (modal); reconhece goal kick antes da fase do bloco. */
export function suggestSavedExerciseCategory(params: {
  title: string;
  videoUrl?: string;
  phase?: "warmup" | "main" | "cooldown";
}): SavedExerciseCategory {
  if (isGoalKickExercise(params.title, params.videoUrl)) return "goalKick";
  const ph = params.phase;
  if (ph === "warmup" || ph === "cooldown") return "warmup";
  return "mixed";
}

export const SAVED_EXERCISE_CATEGORIES: readonly SavedExerciseCategory[] = [
  "warmup",
  "possession",
  "goalKick",
  "setPiece",
  "pressing",
  "finishing",
  "defensive",
  "transition",
  "physical",
  "mixed",
];

export const SAVED_EXERCISE_CATEGORY_LABELS: Record<SavedExerciseCategory, string> = {
  warmup: "Aquecimento / activação",
  possession: "Posse de bola",
  goalKick: "Pontapé de baliza",
  setPiece: "Bola Parada",
  pressing: "Pressão",
  finishing: "Finalização",
  defensive: "Organização defensiva",
  transition: "Transição",
  physical: "Físico / intensidade",
  mixed: "Misto / vários focos",
};
