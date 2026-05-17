import type { SketchBoardFrame } from "@/types";
import type { BoardRenderOptions } from "@/components/sketch/SketchBoardCanvas";
import type { SketchBoardPlaybackSpeed } from "@/lib/sketch-board";

const DB_NAME = "coachbuilder-coach-exercise-playback-v2";
const STORE = "playback";
const DB_VERSION = 1;

export type CoachExerciseVideoPlaybackRecord = {
  id: string;
  kind: "video";
  blob: Blob;
  mime: string;
  size: number;
  savedAt: string;
};

export type CoachExerciseFramesPlaybackRecord = {
  id: string;
  kind: "frames";
  frames: SketchBoardFrame[];
  renderOpts: BoardRenderOptions;
  speed: SketchBoardPlaybackSpeed;
  savedAt: string;
};

export type CoachExercisePlaybackRecord =
  | CoachExerciseVideoPlaybackRecord
  | CoachExerciseFramesPlaybackRecord;

/** @deprecated v1 store — só leitura para migração */
const LEGACY_DB = "coachbuilder-coach-exercise-videos-v1";
const LEGACY_STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb-open"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

function openLegacyDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open(LEGACY_DB, 1);
    req.onerror = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => resolve(null);
  });
}

async function readLegacyVideoBlob(exerciseId: string): Promise<Blob | null> {
  const db = await openLegacyDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(LEGACY_STORE, "readonly");
      const req = tx.objectStore(LEGACY_STORE).get(exerciseId);
      req.onsuccess = () => {
        const row = req.result as { blob?: Blob } | undefined;
        resolve(row?.blob && row.blob.size > 0 ? row.blob : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function putCoachExercisePlayback(record: CoachExercisePlaybackRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCoachExercisePlayback(
  exerciseId: string
): Promise<CoachExercisePlaybackRecord | null> {
  const db = await openDb();
  const row = await new Promise<CoachExercisePlaybackRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(exerciseId);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as CoachExercisePlaybackRecord | undefined);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });

  if (row?.kind === "video" && row.blob.size > 0) return row;
  if (row?.kind === "frames" && row.frames.length > 0) return row;

  const legacyBlob = await readLegacyVideoBlob(exerciseId);
  if (legacyBlob && legacyBlob.size > 0) {
    const migrated: CoachExerciseVideoPlaybackRecord = {
      id: exerciseId,
      kind: "video",
      blob: legacyBlob,
      mime: legacyBlob.type || "video/webm",
      size: legacyBlob.size,
      savedAt: new Date().toISOString(),
    };
    await putCoachExercisePlayback(migrated).catch(() => {});
    return migrated;
  }

  return null;
}

export async function deleteCoachExercisePlayback(exerciseId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(exerciseId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });

  const legacyDb = await openLegacyDb();
  if (legacyDb?.objectStoreNames.contains(LEGACY_STORE)) {
    await new Promise<void>((resolve) => {
      const tx = legacyDb.transaction(LEGACY_STORE, "readwrite");
      tx.objectStore(LEGACY_STORE).delete(exerciseId);
      tx.oncomplete = () => {
        legacyDb.close();
        resolve();
      };
      tx.onerror = () => {
        legacyDb.close();
        resolve();
      };
    });
  }
}
