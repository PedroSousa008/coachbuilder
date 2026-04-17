/** Helpers for Coaching by Professionals — calendar days in local timezone. */

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Difference in calendar days (a - b). Same day → 0. */
export function diffCalendarDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ua - ub) / 86400000);
}

/** 1-based day number (day 1 = account creation day). */
export function dayNumberFromAnchor(anchor: Date, day: Date): number {
  return diffCalendarDays(day, anchor) + 1;
}

export function parseAccountAnchor(iso?: string | null): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return startOfLocalDay(d);
}

export type DayCellState = "before_account" | "locked_future" | "available";

export function getDayCellState(day: Date, anchor: Date, today: Date): DayCellState {
  const d = startOfLocalDay(day).getTime();
  const a = anchor.getTime();
  const t = today.getTime();
  if (d < a) return "before_account";
  if (d > t) return "locked_future";
  return "available";
}

/** Monday = 0 … Sunday = 6 */
export function dayOfWeekMonday(d: Date): number {
  const sun = d.getDay();
  return sun === 0 ? 6 : sun - 1;
}

export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const pad = dayOfWeekMonday(first);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return diffCalendarDays(a, b) === 0;
}
