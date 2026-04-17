import { startOfLocalDay } from "@/lib/coaching-professionals-calendar";

const STORAGE_V = 1 as const;
const XP_PER_LESSON = 10;
const XP_PER_LEVEL = 100;

export type CoachingChallengeState = {
  version: typeof STORAGE_V;
  completedDayKeys: string[];
  xpInLevel: number;
  level: number;
  longestStreak: number;
};

function storageKey(userId: string): string {
  return `coachbuilder-coaching-challenge-v${STORAGE_V}-${userId}`;
}

export function dayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDayKeyLocal(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return startOfLocalDay(new Date());
  return startOfLocalDay(new Date(y, m - 1, d));
}

export function maxDayKey(keys: string[]): string | null {
  if (keys.length === 0) return null;
  return [...keys].sort().at(-1) ?? null;
}

/** Dias consecutivos com conclusão, terminando na data mais recente completada. */
export function streakEndingAt(completedKeys: Set<string>, endKey: string | null): number {
  if (!endKey || !completedKeys.has(endKey)) return 0;
  let d = parseDayKeyLocal(endKey);
  let n = 0;
  while (completedKeys.has(dayKeyLocal(d))) {
    n += 1;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }
  return n;
}

export function getCurrentStreak(state: CoachingChallengeState): number {
  const last = maxDayKey(state.completedDayKeys);
  return streakEndingAt(new Set(state.completedDayKeys), last);
}

export function loadCoachingChallenge(userId: string): CoachingChallengeState {
  if (typeof window === "undefined") {
    return emptyState();
  }
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyState();
    const o = JSON.parse(raw) as Partial<CoachingChallengeState>;
    if (o.version !== STORAGE_V || !Array.isArray(o.completedDayKeys)) {
      return emptyState();
    }
    return {
      version: STORAGE_V,
      completedDayKeys: [...new Set(o.completedDayKeys.filter((x) => typeof x === "string"))],
      xpInLevel: typeof o.xpInLevel === "number" && o.xpInLevel >= 0 ? o.xpInLevel % XP_PER_LEVEL : 0,
      level: typeof o.level === "number" && o.level >= 1 ? o.level : 1,
      longestStreak: typeof o.longestStreak === "number" && o.longestStreak >= 0 ? o.longestStreak : 0,
    };
  } catch {
    return emptyState();
  }
}

function emptyState(): CoachingChallengeState {
  return {
    version: STORAGE_V,
    completedDayKeys: [],
    xpInLevel: 0,
    level: 1,
    longestStreak: 0,
  };
}

export function saveCoachingChallenge(userId: string, state: CoachingChallengeState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Marca o dia como visto (uma vez). Devolve o novo estado ou null se já estava completo. */
export function markLessonWatched(userId: string, day: Date): CoachingChallengeState | null {
  const prev = loadCoachingChallenge(userId);
  const key = dayKeyLocal(startOfLocalDay(day));
  if (prev.completedDayKeys.includes(key)) {
    return null;
  }

  const completedDayKeys = [...prev.completedDayKeys, key].sort();
  const set = new Set(completedDayKeys);
  const lastKey = maxDayKey(completedDayKeys);
  const currentStreak = streakEndingAt(set, lastKey);
  const longestStreak = Math.max(prev.longestStreak, currentStreak);

  let xpInLevel = prev.xpInLevel + XP_PER_LESSON;
  let level = prev.level;
  while (xpInLevel >= XP_PER_LEVEL) {
    xpInLevel -= XP_PER_LEVEL;
    level += 1;
  }

  const next: CoachingChallengeState = {
    version: STORAGE_V,
    completedDayKeys,
    xpInLevel,
    level,
    longestStreak,
  };
  saveCoachingChallenge(userId, next);
  return next;
}

export function isDayCompleted(userId: string, day: Date): boolean {
  const key = dayKeyLocal(startOfLocalDay(day));
  return loadCoachingChallenge(userId).completedDayKeys.includes(key);
}

export function getProgressPercentInLevel(state: CoachingChallengeState): number {
  return Math.min(100, Math.round((state.xpInLevel / XP_PER_LEVEL) * 100));
}

export { XP_PER_LESSON, XP_PER_LEVEL };
