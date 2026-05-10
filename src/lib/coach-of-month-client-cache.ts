/** Cache do Treinador do Mês no cliente — leitura síncrona para primeiro paint instantâneo; revalidação em rede depois. */

const STORAGE_KEY = "cb.coachOfMonth.payload.v1";

export type CoachOfMonthClientCacheEntry = {
  payload: unknown;
  updatedAt: string | null;
};

let memory: CoachOfMonthClientCacheEntry | null = null;

function readSession(): CoachOfMonthClientCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { payload?: unknown; updatedAt?: string | null };
    if (o == null || typeof o !== "object" || !("payload" in o)) return null;
    return { payload: o.payload, updatedAt: o.updatedAt ?? null };
  } catch {
    return null;
  }
}

/** Último payload conhecido (memória ou sessionStorage). Síncrono. */
export function readCoachOfMonthClientCache(): CoachOfMonthClientCacheEntry | null {
  if (memory) return memory;
  const s = readSession();
  if (s) memory = s;
  return s;
}

export function writeCoachOfMonthClientCache(payload: unknown, updatedAt: string | null): void {
  memory = { payload, updatedAt };
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ payload, updatedAt }));
  } catch {
    /* quota ou modo privado — memória ainda serve na sessão */
  }
}

export function clearCoachOfMonthClientCache(): void {
  memory = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
