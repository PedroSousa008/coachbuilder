import type { SketchBoardDraft, SavedExerciseCategory } from "@/types";
import type { BoardRenderOptions } from "@/components/sketch/SketchBoardCanvas";
import type { SketchBoardPlaybackSpeed } from "@/lib/sketch-board";
import { boardUid, normalizeBoardDraft } from "@/lib/sketch-board";
import {
  boardFramesCompositeDataUrl,
  exportBoardVideoForFrames,
} from "@/lib/sketch-board-export";
import {
  COACH_EXERCISE_INLINE_VIDEO_MAX_CHARS,
  coachExerciseVideoUrl,
  storeCoachExerciseVideo,
} from "@/lib/training-exercise-media";
import type { NewSavedTrainingExerciseInput } from "@/types";

export type SaveBoardTrainingFormInput = {
  title: string;
  themes: SavedExerciseCategory[];
  explanation: string;
  durationMin: number;
};

export async function buildSavedExerciseFromBoardDraft(
  draft: SketchBoardDraft,
  form: SaveBoardTrainingFormInput,
  boardRenderOpts: BoardRenderOptions,
  playSpeed: SketchBoardPlaybackSpeed
): Promise<NewSavedTrainingExerciseInput & { id: string }> {
  const normalized = normalizeBoardDraft(draft);
  const frames = normalized.frames ?? [];
  if (frames.length === 0) {
    throw new Error("O quadro não tem frames para guardar.");
  }

  const themes = form.themes.length > 0 ? form.themes : (["mixed"] as SavedExerciseCategory[]);
  const primaryCategory = themes.length === 1 ? themes[0]! : themes.includes("mixed") ? "mixed" : themes[0]!;
  const exerciseId = boardUid("svtex");

  const printImageDataUrl = boardFramesCompositeDataUrl(frames, boardRenderOpts);
  const videoBlob = await exportBoardVideoForFrames(frames, boardRenderOpts, playSpeed);
  const videoDataUrlStored = await storeCoachExerciseVideo(exerciseId, videoBlob);

  const explanation = form.explanation.trim();

  return {
    id: exerciseId,
    title: form.title.trim(),
    category: primaryCategory,
    themes,
    durationMin: Math.max(1, Math.min(180, Math.round(form.durationMin))),
    description: explanation || form.title.trim(),
    coachingPoints: explanation
      ? "Ver explicação do exercício no quadro tático e no vídeo de demonstração."
      : "Exercício criado no quadro tático da Sketch Area.",
    videoUrl: coachExerciseVideoUrl(exerciseId),
    videoDataUrl:
      videoDataUrlStored.length <= COACH_EXERCISE_INLINE_VIDEO_MAX_CHARS
        ? videoDataUrlStored
        : undefined,
    fromSketchBoard: true,
    printImageDataUrl: printImageDataUrl || undefined,
    sketchBoardDraftId: normalized.id,
  };
}
