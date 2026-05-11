const DB_NAME = "coachbuilder-persist-kv-v1";
const STORE = "entries";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb-open"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
  });
}

export async function idbKvGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const q = tx.objectStore(STORE).get(key);
    q.onerror = () => reject(q.error);
    q.onsuccess = () => {
      const v = q.result;
      resolve(typeof v === "string" ? v : null);
    };
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbKvSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbKvDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbKvGetMany(keys: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const out = new Map<string, string | null>();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    for (const key of unique) {
      const req = store.get(key);
      req.onsuccess = () => {
        const v = req.result;
        out.set(key, typeof v === "string" ? v : null);
      };
      req.onerror = () => reject(req.error);
    }
    tx.oncomplete = () => {
      db.close();
      resolve(out);
    };
    tx.onerror = () => reject(tx.error);
  });
}
