/**
 * Contrato de persistência CoachBuilder
 * -----------------------------
 * Todos os dados da conta (jogadores, táticas, mensagens, jogos registados, etc.)
 * são guardados no `localStorage` deste navegador, por utilizador; se uma chave
 * exceder a quota (~5 MB), o JSON completo dessa chave passa para **IndexedDB**
 * (ver `savePersistedJson` / `loadPersistedJson`).
 *
 * - Atualizações do site / novos deploys na Vercel **não apagam** estes dados.
 * - Os dados mantêm-se enquanto não limpares dados do site, não mudares de navegador
 *   sem exportar, ou não usares modo privado como único sítio de uso.
 *
 * Ao alterar chaves ou formato no código, **incrementa** `CURRENT_STORAGE_SCHEMA_VERSION`
 * e acrescenta uma migração em `runCoachbuilderStorageMigrations` para nunca perder
 * contas antigas.
 *
 * Opcional: com `NEXT_PUBLIC_ENABLE_CLOUD_SYNC=true` e PostgreSQL na Vercel, a conta e o
 * workspace são também persistidos no servidor (ver `/api/cloud/*` e Prisma).
 */

import { idbKvDelete, idbKvGet, idbKvSet } from "@/lib/coachbuilder-idb-kv";

export const CURRENT_STORAGE_SCHEMA_VERSION = 1;

const SCHEMA_VERSION_KEY = "coachbuilder-storage-schema-version";

/** Contas e sessão — não mudar sem migração e bump de versão de auth se necessário. */
export const AUTH_STORAGE_KEYS = {
  users: "coachbuilder-auth-users-v1",
  session: "coachbuilder-auth-session-v1",
} as const;

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "unknown" };

/** Sufixo na mesma origem: valor em `localStorage` indica que o JSON completo está no IndexedDB. */
export const PERSIST_IDB_OVERFLOW_SUFFIX = ":cb-idb-v1";

function isQuotaError(e: unknown): boolean {
  const name = e instanceof Error ? e.name : "";
  const domName = typeof DOMException !== "undefined" && e instanceof DOMException ? e.name : "";
  return name === "QuotaExceededError" || domName === "QuotaExceededError";
}

export function safeLoadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeSaveJSON(key: string, value: unknown): SaveResult {
  if (typeof window === "undefined") return { ok: true };
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (e) {
    if (isQuotaError(e)) {
      console.error("[CoachBuilder] localStorage cheio — não foi possível guardar.", key);
      return { ok: false, reason: "quota" };
    }
    console.error("[CoachBuilder] Falha ao guardar.", key, e);
    return { ok: false, reason: "unknown" };
  }
}

/**
 * Lê JSON: `localStorage` ou, se existir marcador de overflow, o blob no IndexedDB.
 */
export async function loadPersistedJson<T>(key: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;
  try {
    if (localStorage.getItem(key + PERSIST_IDB_OVERFLOW_SUFFIX) === "1") {
      const raw = await idbKvGet(key);
      if (raw) {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      }
      return fallback;
    }
    return safeLoadJSON(key, fallback);
  } catch {
    return fallback;
  }
}

/**
 * Grava JSON: tenta `localStorage`; se estourar quota, grava no IndexedDB e marca overflow (liberta a chave principal).
 */
export async function savePersistedJson(key: string, value: unknown): Promise<SaveResult> {
  if (typeof window === "undefined") return { ok: true };
  const raw = JSON.stringify(value);
  try {
    localStorage.setItem(key, raw);
    try {
      localStorage.removeItem(key + PERSIST_IDB_OVERFLOW_SUFFIX);
    } catch {
      /* ignore */
    }
    void idbKvDelete(key).catch(() => {});
    return { ok: true };
  } catch (e) {
    if (!isQuotaError(e)) {
      console.error("[CoachBuilder] Falha ao guardar.", key, e);
      return { ok: false, reason: "unknown" };
    }
    try {
      await idbKvSet(key, raw);
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      localStorage.setItem(key + PERSIST_IDB_OVERFLOW_SUFFIX, "1");
      return { ok: true };
    } catch (e2) {
      console.error("[CoachBuilder] localStorage cheio e IndexedDB falhou — não foi possível guardar.", key, e2);
      return { ok: false, reason: "quota" };
    }
  }
}

/**
 * Migrações globais (uma vez por browser). Não substitui `migrateLegacyDataIfNeeded` por utilizador.
 */
export function runCoachbuilderStorageMigrations(): void {
  if (typeof window === "undefined") return;
  try {
    let v = parseInt(localStorage.getItem(SCHEMA_VERSION_KEY) || "0", 10);
    if (Number.isNaN(v) || v < 0) v = 0;

    while (v < CURRENT_STORAGE_SCHEMA_VERSION) {
      const next = v + 1;
      if (next === 1) {
        // v1: linha de base (dados legados por utilizador em migrateLegacyDataIfNeeded).
      }
      // if (next === 2) { /* migrar chaves / formato */ }
      v = next;
      localStorage.setItem(SCHEMA_VERSION_KEY, String(v));
    }
  } catch {
    /* ignore */
  }
}
