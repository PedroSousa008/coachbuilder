/**
 * Imagem de impressão (JPEG) dos exercícios criados no quadro tático — IndexedDB.
 * Evita data URLs gigantes no HTML do PDF (especialmente no iPhone).
 */

const DB_NAME = "coachbuilder-coach-exercise-print-images-v1";
const STORE = "images";
const DB_VERSION = 1;

export type CoachExercisePrintImageRecord = {
  id: string;
  blob: Blob;
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

export async function putCoachExercisePrintImageBlob(exerciseId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const record: CoachExercisePrintImageRecord = {
    id: exerciseId,
    blob,
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

export async function getCoachExercisePrintImageBlob(exerciseId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(exerciseId);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const row = req.result as CoachExercisePrintImageRecord | undefined;
      resolve(row?.blob && row.blob.size > 0 ? row.blob : null);
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCoachExercisePrintImageBlob(exerciseId: string): Promise<void> {
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
