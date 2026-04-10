/** YYYY-MM-DD in Europe/Lisbon for a given instant or ISO kick-off string. */
export function calendarDayLisbon(isoOrMs: string | number): string {
  const d = typeof isoOrMs === "string" ? new Date(isoOrMs) : new Date(isoOrMs);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

/**
 * True if the match is still to be played: strictly after `nowMs`, and the calendar day in Lisbon
 * is not before “today” in Lisbon (avoids edge cases with bad years in the parser).
 */
export function isKickoffStillUpcomingLisbon(iso: string, nowMs: number): boolean {
  const t = new Date(iso).getTime();
  if (t <= nowMs) return false;
  return calendarDayLisbon(iso) >= calendarDayLisbon(nowMs);
}
