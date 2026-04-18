import { parseDayKeyLocal } from "./coaching-challenge-storage";
import { dayNumberFromAnchor } from "./coaching-professionals-calendar";

/** Number of on-disk lesson slots under `public/coaching-daily-videos/day-NNN/`. */
export const COACHING_PROGRAM_DAY_COUNT = 365;

/**
 * Stable id for the Nth lesson since account creation (day 1 = anchor / signup day).
 * Matches folder names: `public/coaching-daily-videos/day-001/`, …
 */
export function programLessonCatalogId(programDay: number): string {
  if (programDay < 1 || programDay > 999) return "day-000";
  return `day-${String(programDay).padStart(3, "0")}`;
}

/** 1-based program day for a calendar `dayKey` (`YYYY-MM-DD`) given the account anchor. */
export function dayKeyToProgramDay(dayKey: string, anchor: Date): number | null {
  const day = parseDayKeyLocal(dayKey);
  const n = dayNumberFromAnchor(anchor, day);
  if (n < 1) return null;
  return n;
}

/**
 * Maps stored challenge completions (calendar keys) to program lesson ids for the skill catalogue.
 */
export function completedDayKeysToProgramLessonIds(
  completedDayKeys: readonly string[],
  anchor: Date
): string[] {
  const ids: string[] = [];
  for (const key of completedDayKeys) {
    const n = dayKeyToProgramDay(key, anchor);
    if (n == null) continue;
    ids.push(programLessonCatalogId(n));
  }
  return ids;
}
