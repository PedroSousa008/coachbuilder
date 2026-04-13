import { parseDistrictAssociationIdFromHonorTitle } from "@/lib/coach-district-associations";
import type { CoachHonorCategory, CoachHonorEntry, CoachProfileState } from "@/types";

/** Converte `league` legado: títulos com "nacional" → nacional, resto → distrital. */
export function migrateHonorEntryCategory(h: CoachHonorEntry): CoachHonorEntry {
  if (h.category !== "league") return h;
  const t = h.title.toLowerCase();
  const next: CoachHonorCategory = t.includes("nacional") ? "league_national" : "league_district";
  return { ...h, category: next };
}

function enrichDistrictOnHonor(h: CoachHonorEntry): CoachHonorEntry {
  if (h.category !== "league_district" || h.districtAssociationId) return h;
  const id = parseDistrictAssociationIdFromHonorTitle(h.title);
  if (!id) return h;
  return { ...h, districtAssociationId: id };
}

export function migrateHonorsCategories(honors: CoachHonorEntry[]): CoachHonorEntry[] {
  let changed = false;
  const out = honors.map((h) => {
    const a = migrateHonorEntryCategory(h);
    const b = enrichDistrictOnHonor(a);
    if (b !== h) changed = true;
    return b;
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
