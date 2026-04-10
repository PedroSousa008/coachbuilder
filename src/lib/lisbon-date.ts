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

  // Linear scan: wide window so DST / calendar mismatches still resolve.
  const dayStart = Date.UTC(year, month1 - 1, day, 0, 0, 0);
  const lo = dayStart - 14 * 24 * 60 * 60 * 1000;
  const hi = dayStart + 15 * 24 * 60 * 60 * 1000;
  for (let ms = lo; ms <= hi; ms += 60 * 1000) {
    const w = readWall(ms);
    if (cmp(w, target) === 0) return new Date(ms).toISOString();
  }

  // Fallback: do not drop the fixture — approximate as that calendar day at the given hour in UTC (FPF times are usually close).
  return new Date(Date.UTC(year, month1 - 1, day, hour, minute, 0)).toISOString();
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

/**
 * League import: a row is **finished** when both scores exist on the page.
 * Otherwise it is **upcoming** if the kick-off instant is in the future, or the date could not be parsed
 * (treat as still to play). Past kick-off without score → previous (played / postponed / lag).
 */
export function isImportedMatchUpcoming(m: { kickoff: string; homeScore?: number; awayScore?: number }, nowMs: number): boolean {
  const finished = typeof m.homeScore === "number" && typeof m.awayScore === "number";
  if (finished) return false;
  const t = new Date(m.kickoff).getTime();
  if (!Number.isFinite(t)) return true;
  return t > nowMs;
}
