import {
  loadPersistedJson,
  PERSIST_IDB_OVERFLOW_SUFFIX,
  savePersistedJson,
} from "@/lib/coachbuilder-persist";
import { idbKvDelete } from "@/lib/coachbuilder-idb-kv";
import {
  deleteCoachExercisePlayback,
  getCoachExercisePlayback,
  type CoachExerciseFramesPlaybackRecord,
  type CoachExerciseVideoPlaybackRecord,
} from "@/lib/coach-exercise-playback-store";
import { canPlayVideoMime } from "@/lib/sketch-board-playback-detect";

export const COACH_EXERCISE_VIDEO_SCHEME = "coach-exercise-video:";

/** Máximo de caracteres da data URL inline no workspace (fallback). */
export const COACH_EXERCISE_INLINE_VIDEO_MAX_CHARS = 3_500_000;

const LEGACY_VIDEO_PERSIST_PREFIX = "coachbuilder-coach-exercise-video-";

const playbackUrlCache = new Map<string, string>();

export type CoachExerciseResolvedPlayback =
  | { kind: "video"; src: string; mime?: string }
  | { kind: "frames"; record: CoachExerciseFramesPlaybackRecord };

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

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
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

async function loadLegacyDataUrl(exerciseId: string): Promise<string | null> {
  return loadPersistedJson<string | null>(legacyPersistKey(exerciseId), null);
}

function videoSrcFromRecord(record: CoachExerciseVideoPlaybackRecord): string | null {
  const mime = record.mime || record.blob.type || "video/mp4";
  if (!canPlayVideoMime(mime) && !canPlayVideoMime(record.blob.type)) {
    return null;
  }
  const cached = playbackUrlCache.get(record.id);
  if (cached) return cached;
  const url = URL.createObjectURL(record.blob);
  playbackUrlCache.set(record.id, url);
  return url;
}

export async function resolveCoachExercisePlayback(
  exerciseId: string,
  fallbackVideoDataUrl?: string
): Promise<CoachExerciseResolvedPlayback | null> {
  const stored = await getCoachExercisePlayback(exerciseId);
  if (stored?.kind === "frames") {
    return { kind: "frames", record: stored };
  }
  if (stored?.kind === "video") {
    const src = videoSrcFromRecord(stored);
    if (src) {
      return { kind: "video", src, mime: stored.mime };
    }
  }

  if (fallbackVideoDataUrl?.startsWith("data:")) {
    const blob = await dataUrlToBlob(fallbackVideoDataUrl);
    if (blob && blob.size > 512) {
      const mime = blob.type || "video/webm";
      if (canPlayVideoMime(mime)) {
        const url = URL.createObjectURL(blob);
        playbackUrlCache.set(exerciseId, url);
        return { kind: "video", src: url, mime };
      }
    }
    if (canPlayVideoMime("video/webm") || fallbackVideoDataUrl.startsWith("data:video/mp4")) {
      return { kind: "video", src: fallbackVideoDataUrl, mime: mimeFromDataUrl(fallbackVideoDataUrl) };
    }
  }

  const legacy = await loadLegacyDataUrl(exerciseId);
  if (legacy?.startsWith("data:") && legacy !== fallbackVideoDataUrl) {
    return resolveCoachExercisePlayback(exerciseId, legacy);
  }

  return null;
}

function mimeFromDataUrl(dataUrl: string): string | undefined {
  const m = /^data:([^;,]+)/.exec(dataUrl);
  return m?.[1];
}

export async function inlineVideoDataUrlIfFits(blob: Blob): Promise<string> {
  try {
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl.length <= COACH_EXERCISE_INLINE_VIDEO_MAX_CHARS ? dataUrl : "";
  } catch {
    return "";
  }
}

/** @deprecated Usar saveBoardExercisePlayback */
export async function storeCoachExerciseVideo(exerciseId: string, blob: Blob): Promise<string> {
  const { putCoachExercisePlayback } = await import("@/lib/coach-exercise-playback-store");
  const record: CoachExerciseVideoPlaybackRecord = {
    id: exerciseId,
    kind: "video",
    blob,
    mime: blob.type || "video/mp4",
    size: blob.size,
    savedAt: new Date().toISOString(),
  };
  await putCoachExercisePlayback(record);
  revokeCachedUrl(exerciseId);
  playbackUrlCache.set(exerciseId, URL.createObjectURL(blob));

  const dataUrl = await blobToDataUrl(blob);
  if (dataUrl.length <= 3_500_000) {
    void savePersistedJson(legacyPersistKey(exerciseId), dataUrl);
  }
  return dataUrl;
}

export async function ensureCoachExerciseVideoPlaybackUrl(
  exerciseId: string,
  fallbackVideoDataUrl?: string
): Promise<string | null> {
  const resolved = await resolveCoachExercisePlayback(exerciseId, fallbackVideoDataUrl);
  if (resolved?.kind === "video") return resolved.src;
  return null;
}

export async function getCoachExerciseVideoPlaybackUrl(exerciseId: string): Promise<string | null> {
  return ensureCoachExerciseVideoPlaybackUrl(exerciseId);
}

export async function getCoachExerciseVideoDataUrl(exerciseId: string): Promise<string | null> {
  return getCoachExerciseVideoPlaybackUrl(exerciseId);
}

export function revokeCoachExerciseVideoPlaybackUrl(exerciseId: string) {
  revokeCachedUrl(exerciseId);
}

export async function deleteCoachExerciseVideo(exerciseId: string): Promise<void> {
  revokeCachedUrl(exerciseId);
  await deleteCoachExercisePlayback(exerciseId).catch(() => {});
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
