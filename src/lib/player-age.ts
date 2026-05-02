export function computeAgeFromDateOfBirth(dateOfBirth: string, now: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();

  let age = nowYear - year;
  if (nowMonth < month || (nowMonth === month && nowDay < day)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

/** Formação a séniores — não limitar a escalões de adultos. */
export const PLAYER_AGE_MIN = 4;
export const PLAYER_AGE_MAX = 99;

export function clampPlayerAge(n: number): number {
  if (!Number.isFinite(n)) return PLAYER_AGE_MIN;
  return Math.min(PLAYER_AGE_MAX, Math.max(PLAYER_AGE_MIN, Math.round(n)));
}

export function resolveTrackedPlayerAge(currentAge: number, dateOfBirth?: string): number {
  const computed = dateOfBirth ? computeAgeFromDateOfBirth(dateOfBirth) : null;
  const base = computed ?? currentAge;
  return clampPlayerAge(base);
}
