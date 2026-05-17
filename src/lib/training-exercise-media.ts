import {
  loadPersistedJson,
  PERSIST_IDB_OVERFLOW_SUFFIX,
  savePersistedJson,
} from "@/lib/coachbuilder-persist";
import { idbKvDelete } from "@/lib/coachbuilder-idb-kv";
import {
  deleteCoachExerciseVideoBlob,
  getCoachExerciseVideoBlob,
  putCoachExerciseVideoBlob,
} from "@/lib/coach-exercise-video-store";

export const COACH_EXERCISE_VIDEO_SCHEME = "coach-exercise-video:";

/** Máximo de caracteres da data URL inline no workspace (fallback). */
export const COACH_EXERCISE_INLINE_VIDEO_MAX_CHARS = 3_500_000;

const LEGACY_VIDEO_PERSIST_PREFIX = "coachbuilder-coach-exercise-video-";

/** Cópia em memória (object URL) logo após guardar — reprodução imediata na mesma sessão. */
const playbackUrlCache = new Map<string, string>();

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

function legacyPersistKey(exerciseId: string): string {
  return `${LEGACY_VIDEO_PERSIST_PREFIX}${exerciseId}`;
}

function revokeCachedUrl(exerciseId: string) {
  const prev = playbackUrlCache.get(exerciseId);
  if (prev?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  playbackUrlCache.delete(exerciseId);
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

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

/** Confirma que o blob é um vídeo reproduzível antes de o considerar guardado. */
export async function verifyCoachExerciseVideoBlob(blob: Blob): Promise<void> {
  if (blob.size < 2048) {
    throw new Error("O vídeo gravado está vazio. Usa Chrome ou Edge no computador.");
  }
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      const done = (ok: boolean) => {
        v.removeAttribute("src");
        v.load();
        if (ok) resolve();
        else reject(new Error("O vídeo não é válido para reprodução."));
      };
      v.onloadedmetadata = () => {
        if (v.duration > 0.05 && v.videoWidth > 0) done(true);
        else done(false);
      };
      v.onerror = () => done(false);
      v.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Guarda o vídeo (blob binário em IDB) e devolve data URL só para cópia no workspace se couber.
 */
export async function storeCoachExerciseVideo(exerciseId: string, blob: Blob): Promise<string> {
  await verifyCoachExerciseVideoBlob(blob);
  await putCoachExerciseVideoBlob(exerciseId, blob);

  revokeCachedUrl(exerciseId);
  playbackUrlCache.set(exerciseId, URL.createObjectURL(blob));

  const readBack = await getCoachExerciseVideoBlob(exerciseId);
  if (!readBack || readBack.size < 2048) {
    throw new Error("O vídeo não ficou guardado neste dispositivo.");
  }

  const dataUrl = await blobToDataUrl(blob);
  const legacyKey = legacyPersistKey(exerciseId);
  if (dataUrl.length <= 3_500_000) {
    void savePersistedJson(legacyKey, dataUrl);
  }

  return dataUrl;
}

async function loadLegacyDataUrl(exerciseId: string): Promise<string | null> {
  return loadPersistedJson<string | null>(legacyPersistKey(exerciseId), null);
}

/**
 * URL para `<video src>` — mesmo ficheiro que foi gravado (blob → object URL).
 */
export async function getCoachExerciseVideoPlaybackUrl(exerciseId: string): Promise<string | null> {
  const cached = playbackUrlCache.get(exerciseId);
  if (cached) return cached;

  let blob = await getCoachExerciseVideoBlob(exerciseId);
  if (!blob) {
    const legacy = await loadLegacyDataUrl(exerciseId);
    if (legacy) {
      blob = await dataUrlToBlob(legacy);
      if (blob) {
        await putCoachExerciseVideoBlob(exerciseId, blob).catch(() => {});
      } else {
        return legacy.startsWith("data:") ? legacy : null;
      }
    }
  }

  if (!blob || blob.size < 512) return null;

  const url = URL.createObjectURL(blob);
  playbackUrlCache.set(exerciseId, url);
  return url;
}

/**
 * URL para reprodução — IDB primeiro; migra fallback data URL do exercício se existir.
 */
export async function ensureCoachExerciseVideoPlaybackUrl(
  exerciseId: string,
  fallbackDataUrl?: string
): Promise<string | null> {
  const fromStore = await getCoachExerciseVideoPlaybackUrl(exerciseId);
  if (fromStore) return fromStore;

  if (!fallbackDataUrl?.startsWith("data:")) return null;

  const blob = await dataUrlToBlob(fallbackDataUrl);
  if (blob && blob.size > 2048) {
    try {
      await putCoachExerciseVideoBlob(exerciseId, blob);
      return getCoachExerciseVideoPlaybackUrl(exerciseId);
    } catch {
      return fallbackDataUrl;
    }
  }
  return fallbackDataUrl;
}

/** @deprecated Usar ensureCoachExerciseVideoPlaybackUrl */
export async function getCoachExerciseVideoDataUrl(exerciseId: string): Promise<string | null> {
  return getCoachExerciseVideoPlaybackUrl(exerciseId);
}

export function revokeCoachExerciseVideoPlaybackUrl(exerciseId: string) {
  revokeCachedUrl(exerciseId);
}

export async function deleteCoachExerciseVideo(exerciseId: string): Promise<void> {
  revokeCachedUrl(exerciseId);
  await deleteCoachExerciseVideoBlob(exerciseId).catch(() => {});
  const key = legacyPersistKey(exerciseId);
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
