import { idbKvDelete, idbKvGet, idbKvSet } from "@/lib/coachbuilder-idb-kv";

const VIDEO_KEY_PREFIX = "coach-exercise-video-v1:";
export const COACH_EXERCISE_VIDEO_SCHEME = "coach-exercise-video:";

export function coachExerciseVideoUrl(exerciseId: string): string {
  return `${COACH_EXERCISE_VIDEO_SCHEME}${exerciseId}`;
}

export function isCoachExerciseVideoUrl(url: string): boolean {
  return url.startsWith(COACH_EXERCISE_VIDEO_SCHEME);
}

export function parseCoachExerciseVideoId(url: string): string | null {
  if (!isCoachExerciseVideoUrl(url)) return null;
  const id = url.slice(COACH_EXERCISE_VIDEO_SCHEME.length).trim();
  return id || null;
}

function videoStorageKey(exerciseId: string): string {
  return `${VIDEO_KEY_PREFIX}${exerciseId}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:")) {
        reject(new Error("invalid-data-url"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read-failed"));
    reader.readAsDataURL(blob);
  });
}

/** Guarda o MP4/WebM do exercício na pasta local do browser (IndexedDB), como os MP4 em public/. */
export async function storeCoachExerciseVideo(exerciseId: string, blob: Blob): Promise<void> {
  const dataUrl = await blobToDataUrl(blob);
  await idbKvSet(videoStorageKey(exerciseId), dataUrl);
}

export async function getCoachExerciseVideoDataUrl(exerciseId: string): Promise<string | null> {
  return idbKvGet(videoStorageKey(exerciseId));
}

export async function deleteCoachExerciseVideo(exerciseId: string): Promise<void> {
  await idbKvDelete(videoStorageKey(exerciseId));
}
