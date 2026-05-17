import type { SavedExerciseCategory, SavedTrainingExercise } from "@/types";
import type { TrainingCatalogItem } from "@/lib/training-session-local";
import type { AiTrainingPhase } from "@/lib/training-ai-types";

function phaseForCategory(category: SavedExerciseCategory): AiTrainingPhase {
  if (category === "warmup") return "warmup";
  if (category === "stretching") return "cooldown";
  return "main";
}

/** Converte exercícios guardados do quadro tático para a aba «Todos os exercícios» (só deste treinador). */
export function coachSketchExercisesToCatalogItems(
  exercises: SavedTrainingExercise[]
): TrainingCatalogItem[] {
  return exercises
    .filter((e) => e.fromSketchBoard)
    .map((e) => {
      const themes = e.themes?.length ? e.themes : [e.category];
      const explanation = e.description.trim();
      return {
        catalogId: `coach-sketch:${e.id}`,
        coachSavedExerciseId: e.id,
        isCoachSketchExercise: true,
        title: e.title,
        phase: phaseForCategory(e.category),
        durationMin: e.durationMin,
        brief: explanation.slice(0, 280) || e.title,
        description: explanation || e.title,
        coachingPoints: e.coachingPoints || "Exercício criado no quadro tático.",
        videoUrl: e.videoUrl,
        printImageDataUrl: e.printImageDataUrl,
        filterCategories: themes,
        defaultSaveCategory: e.category,
      } satisfies TrainingCatalogItem;
    });
}
