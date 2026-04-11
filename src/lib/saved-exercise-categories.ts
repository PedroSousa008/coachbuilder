import type { SavedExerciseCategory } from "@/types";

export const SAVED_EXERCISE_CATEGORIES: readonly SavedExerciseCategory[] = [
  "warmup",
  "possession",
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
  pressing: "Pressão",
  finishing: "Finalização",
  defensive: "Organização defensiva",
  transition: "Transição",
  physical: "Físico / intensidade",
  mixed: "Misto / vários focos",
};
