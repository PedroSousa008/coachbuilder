import {
  loadPersistedJson,
  PERSIST_IDB_OVERFLOW_SUFFIX,
  savePersistedJson,
} from "@/lib/coachbuilder-persist";
import { idbKvDelete } from "@/lib/coachbuilder-idb-kv";

export const COACH_EXERCISE_VIDEO_SCHEME = "coach-exercise-video:";

const VIDEO_PERSIST_PREFIX = "coachbuilder-coach-exercise-video-";

/** Tamanho máximo do vídeo embutido no workspace (caracteres data URL). */
export const COACH_EXERCISE_INLINE_VIDEO_MAX_CHARS = 4_000_000;

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

function videoPersistKey(exerciseId: string): string {
  return `${VIDEO_PERSIST_PREFIX}${exerciseId}`;
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

/**
 * Guarda o vídeo do exercício (mesma persistência que o resto da app: localStorage + IDB se necessário).
 * Devolve o data URL para cópia de segurança opcional no registo do exercício.
 */
export async function storeCoachExerciseVideo(exerciseId: string, blob: Blob): Promise<string> {
  if (blob.size < 1024) {
    throw new Error("A gravação do vídeo falhou (ficheiro vazio). Tenta Chrome ou Edge.");
  }
  const dataUrl = await blobToDataUrl(blob);
  const key = videoPersistKey(exerciseId);
  const result = await savePersistedJson(key, dataUrl);
  if (!result.ok) {
    throw new Error("Não foi possível guardar o vídeo — armazenamento local cheio.");
  }
  const check = await loadPersistedJson<string | null>(key, null);
  if (!check || check.length < 200) {
    throw new Error("O vídeo não ficou guardado correctamente neste dispositivo.");
  }
  return dataUrl;
}

export async function getCoachExerciseVideoDataUrl(exerciseId: string): Promise<string | null> {
  return loadPersistedJson<string | null>(videoPersistKey(exerciseId), null);
}

export async function deleteCoachExerciseVideo(exerciseId: string): Promise<void> {
  const key = videoPersistKey(exerciseId);
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(key + PERSIST_IDB_OVERFLOW_SUFFIX);
    } catch {
      /* ignore */
    }
  }
  await idbKvDelete(key).catch(() => {});
}
