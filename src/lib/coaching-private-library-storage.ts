import { dayKeyLocal } from "@/lib/coaching-challenge-storage";
import { startOfLocalDay } from "@/lib/coaching-professionals-calendar";

const STORAGE_V = 1 as const;

export type PrivateLibraryEntry = {
  dayKey: string;
  notes: string;
  savedAt: string;
  lastDownloadAt?: string;
};

export type PrivateLibraryState = {
  version: typeof STORAGE_V;
  entries: Record<string, PrivateLibraryEntry>;
};

function storageKey(userId: string): string {
  return `coachbuilder-coaching-library-v${STORAGE_V}-${userId}`;
}

function emptyState(): PrivateLibraryState {
  return { version: STORAGE_V, entries: {} };
}

export function loadPrivateLibrary(userId: string): PrivateLibraryState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyState();
    const o = JSON.parse(raw) as Partial<PrivateLibraryState>;
    if (o.version !== STORAGE_V || !o.entries || typeof o.entries !== "object") {
      return emptyState();
    }
    const entries: Record<string, PrivateLibraryEntry> = {};
    for (const [k, v] of Object.entries(o.entries)) {
      if (!v || typeof v !== "object") continue;
      const e = v as Partial<PrivateLibraryEntry>;
      if (typeof e.dayKey === "string" && typeof e.notes === "string" && typeof e.savedAt === "string") {
        entries[k] = {
          dayKey: e.dayKey,
          notes: e.notes,
          savedAt: e.savedAt,
          ...(typeof e.lastDownloadAt === "string" ? { lastDownloadAt: e.lastDownloadAt } : {}),
        };
      }
    }
    return { version: STORAGE_V, entries };
  } catch {
    return emptyState();
  }
}

export function savePrivateLibrary(userId: string, state: PrivateLibraryState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function getLibraryEntry(userId: string, dayKey: string): PrivateLibraryEntry | null {
  return loadPrivateLibrary(userId).entries[dayKey] ?? null;
}

export function isDaySavedToLibrary(userId: string, d: Date): boolean {
  const key = dayKeyLocal(startOfLocalDay(d));
  return Boolean(loadPrivateLibrary(userId).entries[key]);
}

/** Guarda ou actualiza notas na biblioteca privada (marca o dia como guardado no calendário). */
export function saveToPrivateLibrary(userId: string, day: Date, notes: string): PrivateLibraryState {
  const key = dayKeyLocal(startOfLocalDay(day));
  const prev = loadPrivateLibrary(userId);
  const now = new Date().toISOString();
  const existing = prev.entries[key];
  const nextEntry: PrivateLibraryEntry = {
    dayKey: key,
    notes: notes.trim(),
    savedAt: existing?.savedAt ?? now,
    ...(existing?.lastDownloadAt ? { lastDownloadAt: existing.lastDownloadAt } : {}),
  };
  const next: PrivateLibraryState = {
    version: STORAGE_V,
    entries: { ...prev.entries, [key]: nextEntry },
  };
  savePrivateLibrary(userId, next);
  return next;
}

export function touchLibraryDownload(userId: string, dayKey: string): PrivateLibraryState {
  const prev = loadPrivateLibrary(userId);
  const ent = prev.entries[dayKey];
  if (!ent) return prev;
  const next: PrivateLibraryState = {
    version: STORAGE_V,
    entries: {
      ...prev.entries,
      [dayKey]: { ...ent, lastDownloadAt: new Date().toISOString() },
    },
  };
  savePrivateLibrary(userId, next);
  return next;
}

export function triggerBrowserDownload(filename: string, content: string, mime: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
