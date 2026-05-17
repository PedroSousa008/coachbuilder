import type { SavedTrainingExercise } from "@/types";
import { isCoachExerciseVideoUrl } from "@/lib/training-exercise-media";

function pickRicherDataUrl(a?: string, b?: string): string | undefined {
  const score = (s?: string) => (s && s.startsWith("data:") ? s.length : 0);
  const sa = score(a);
  const sb = score(b);
  if (sa >= sb && sa > 0) return a;
  if (sb > 0) return b;
  return a ?? b;
}

function mergeExercisePair(
  local: SavedTrainingExercise,
  cloud: SavedTrainingExercise
): SavedTrainingExercise {
  const localTs = new Date(local.updatedAt).getTime();
  const cloudTs = new Date(cloud.updatedAt).getTime();
  const newer = cloudTs >= localTs ? cloud : local;
  const older = cloudTs >= localTs ? local : cloud;

  const videoDataUrl = pickRicherDataUrl(newer.videoDataUrl, older.videoDataUrl);
  const printImageDataUrl = newer.printImageDataUrl ?? older.printImageDataUrl;

  let videoUrl = newer.videoUrl ?? older.videoUrl;
  if (isCoachExerciseVideoUrl(older.videoUrl ?? "") && !isCoachExerciseVideoUrl(newer.videoUrl ?? "")) {
    videoUrl = older.videoUrl;
  }

  return {
    ...older,
    ...newer,
    videoUrl,
    videoDataUrl,
    printImageDataUrl,
    coachNotes: newer.coachNotes?.trim() ? newer.coachNotes : older.coachNotes,
    fromSketchBoard: newer.fromSketchBoard ?? older.fromSketchBoard,
    sketchBoardDraftId: newer.sketchBoardDraftId ?? older.sketchBoardDraftId,
    themes: (newer.themes?.length ? newer.themes : older.themes) ?? newer.themes,
  };
}

/** Preserva vídeo/imagem local quando a cloud traz o mesmo exercício sem media inline. */
export function mergeSavedTrainingExercises(
  local: SavedTrainingExercise[],
  cloud: SavedTrainingExercise[]
): SavedTrainingExercise[] {
  const m = new Map<string, SavedTrainingExercise>();
  for (const x of local) {
    if (x?.id) m.set(x.id, x);
  }
  for (const x of cloud) {
    if (!x?.id) continue;
    const existing = m.get(x.id);
    m.set(x.id, existing ? mergeExercisePair(existing, x) : x);
  }
  return Array.from(m.values());
}
