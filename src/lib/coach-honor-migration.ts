import type { CoachHonorCategory, CoachHonorEntry, CoachProfileState } from "@/types";

/** Converte `league` legado: títulos com "nacional" → nacional, resto → distrital. */
export function migrateHonorEntryCategory(h: CoachHonorEntry): CoachHonorEntry {
  if (h.category !== "league") return h;
  const t = h.title.toLowerCase();
  const next: CoachHonorCategory = t.includes("nacional") ? "league_national" : "league_district";
  return { ...h, category: next };
}

export function migrateHonorsCategories(honors: CoachHonorEntry[]): CoachHonorEntry[] {
  let changed = false;
  const out = honors.map((h) => {
    const m = migrateHonorEntryCategory(h);
    if (m !== h) changed = true;
    return m;
  });
  return changed ? out : honors;
}

export function withNormalizedHonorCategories(profile: CoachProfileState): CoachProfileState {
  const honors = profile.honors;
  if (!honors?.length) return profile;
  const next = migrateHonorsCategories(honors);
  if (next === honors) return profile;
  return { ...profile, honors: next };
}
