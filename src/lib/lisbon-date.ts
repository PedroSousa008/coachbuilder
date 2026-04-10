/** YYYY-MM-DD in Europe/Lisbon for a given instant or ISO kick-off string. */
export function calendarDayLisbon(isoOrMs: string | number): string {
  const d = typeof isoOrMs === "string" ? new Date(isoOrMs) : new Date(isoOrMs);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

/**
 * Convert a wall-clock instant in Europe/Lisbon (season schedule as shown on FPF) to UTC ISO.
 * Used server-side when parsing “11 abr 20:00” so Vercel UTC does not shift kick-offs.
 */
export function wallClockLisbonToUtcIso(
  year: number,
  month1: number,
  day: number,
  hour: number,
  minute: number
): string | null {
  if (
    month1 < 1 ||
    month1 > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const readWall = (ms: number) => {
    const parts = fmt.formatToParts(new Date(ms));
    const o: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") o[p.type] = p.value;
    }
    return {
      y: parseInt(o.year ?? "", 10),
      m: parseInt(o.month ?? "", 10),
      d: parseInt(o.day ?? "", 10),
      h: parseInt(o.hour ?? "", 10),
      mi: parseInt(o.minute ?? "", 10),
    };
  };

  const cmp = (
    a: { y: number; m: number; d: number; h: number; mi: number },
    b: { y: number; m: number; d: number; h: number; mi: number }
  ) => {
    if (a.y !== b.y) return a.y - b.y;
    if (a.m !== b.m) return a.m - b.m;
    if (a.d !== b.d) return a.d - b.d;
    if (a.h !== b.h) return a.h - b.h;
    return a.mi - b.mi;
  };

  const target = { y: year, m: month1, d: day, h: hour, mi: minute };

  const anchor = Date.UTC(year, month1 - 1, day, 12, 0, 0);
  let lo = anchor - 3 * 24 * 60 * 60 * 1000;
  let hi = anchor + 3 * 24 * 60 * 60 * 1000;

  for (let iter = 0; iter < 64; iter++) {
    const mid = Math.floor((lo + hi) / 2);
    const w = readWall(mid);
    const c = cmp(w, target);
    if (c === 0) return new Date(mid).toISOString();
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
    if (lo > hi) break;
  }

  return null;
}

/**
 * True if kick-off is still in the future for the user’s clock (`Date.now()` on client).
 * Imported FPF times are stored as UTC ISO from Lisbon wall time; compare instants only.
 */
export function isKickoffInFuture(iso: string, nowMs: number): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return t > nowMs;
}
