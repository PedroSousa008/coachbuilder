/**
 * Armazenamento binário de vídeos de exercícios do quadro tático (IndexedDB).
 * Evita data URLs gigantes em JSON e garante o mesmo ficheiro na gravação e na reprodução.
 */

const DB_NAME = "coachbuilder-coach-exercise-videos-v1";
const STORE = "videos";
const DB_VERSION = 1;

export type CoachExerciseVideoRecord = {
  id: string;
  blob: Blob;
  mime: string;
  size: number;
  savedAt: string;
};

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

export async function putCoachExerciseVideoBlob(exerciseId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const record: CoachExerciseVideoRecord = {
    id: exerciseId,
    blob,
    mime: blob.type || "video/webm",
    size: blob.size,
    savedAt: new Date().toISOString(),
  };
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

export async function getCoachExerciseVideoBlob(exerciseId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(exerciseId);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const row = req.result as CoachExerciseVideoRecord | undefined;
      resolve(row?.blob && row.blob.size > 0 ? row.blob : null);
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCoachExerciseVideoBlob(exerciseId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(exerciseId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
