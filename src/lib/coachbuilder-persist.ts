/**
 * Contrato de persistência CoachBuilder
 * -----------------------------
 * Todos os dados da conta (jogadores, táticas, mensagens, jogos registados, etc.)
 * são guardados automaticamente no `localStorage` deste navegador, por utilizador.
 *
 * - Atualizações do site / novos deploys na Vercel **não apagam** estes dados.
 * - Os dados mantêm-se enquanto não limpares dados do site, não mudares de navegador
 *   sem exportar, ou não usares modo privado como único sítio de uso.
 *
 * Ao alterar chaves ou formato no código, **incrementa** `CURRENT_STORAGE_SCHEMA_VERSION`
 * e acrescenta uma migração em `runCoachbuilderStorageMigrations` para nunca perder
 * contas antigas.
 */

export const CURRENT_STORAGE_SCHEMA_VERSION = 1;

const SCHEMA_VERSION_KEY = "coachbuilder-storage-schema-version";

/** Contas e sessão — não mudar sem migração e bump de versão de auth se necessário. */
export const AUTH_STORAGE_KEYS = {
  users: "coachbuilder-auth-users-v1",
  session: "coachbuilder-auth-session-v1",
} as const;

export type SaveResult = { ok: true } | { ok: false; reason: "quota" | "unknown" };

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
    const name = e instanceof Error ? e.name : "";
    const domName = typeof DOMException !== "undefined" && e instanceof DOMException ? e.name : "";
    if (name === "QuotaExceededError" || domName === "QuotaExceededError") {
      console.error("[CoachBuilder] localStorage cheio — não foi possível guardar.", key);
      return { ok: false, reason: "quota" };
    }
    console.error("[CoachBuilder] Falha ao guardar.", key, e);
    return { ok: false, reason: "unknown" };
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
