import type { SketchBoardDraft, SavedExerciseCategory } from "@/types";
import type { BoardRenderOptions } from "@/components/sketch/SketchBoardCanvas";
import type { SketchBoardPlaybackSpeed } from "@/lib/sketch-board";
import { boardUid, normalizeBoardDraft } from "@/lib/sketch-board";
import { boardFramesCompositeDataUrl } from "@/lib/sketch-board-export";
import { saveBoardExercisePlayback } from "@/lib/save-board-playback";
import { storeCoachExercisePrintImage } from "@/lib/coach-exercise-print-image";
import { coachExerciseVideoUrl, inlineVideoDataUrlIfFits } from "@/lib/training-exercise-media";
import { getCoachExercisePlayback } from "@/lib/coach-exercise-playback-store";
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
  if (printImageDataUrl) {
    await storeCoachExercisePrintImage(exerciseId, printImageDataUrl);
  }
  const playbackKind = await saveBoardExercisePlayback(exerciseId, frames, boardRenderOpts, playSpeed);

  let videoDataUrlStored = "";
  if (playbackKind === "video") {
    const record = await getCoachExercisePlayback(exerciseId);
    if (record?.kind === "video") {
      videoDataUrlStored = await inlineVideoDataUrlIfFits(record.blob);
    }
  }

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
    videoDataUrl: videoDataUrlStored || undefined,
    fromSketchBoard: true,
    printImageDataUrl: printImageDataUrl || undefined,
    sketchBoardDraftId: normalized.id,
  };
}
