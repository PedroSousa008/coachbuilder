import { COACH_DISTRICT_ASSOCIATIONS } from "@/lib/coach-district-associations";
import type {
  CoachCareerSeason,
  CoachDistrictAssociationId,
  CoachProfileState,
  CoachSeasonAchievements,
} from "@/types";

type LegacyAchievements = CoachSeasonAchievements & { champion?: boolean };

const DISTRICT_ID_SET = new Set<string>(COACH_DISTRICT_ASSOCIATIONS.map((a) => a.id));

function isDistrictId(v: unknown): v is CoachDistrictAssociationId {
  return typeof v === "string" && DISTRICT_ID_SET.has(v);
}

/** Garante estrutura actual e migra `champion` legado → nacional. */
export function normalizeSeasonAchievements(raw: Partial<LegacyAchievements> | undefined): CoachSeasonAchievements {
  const a = raw ?? {};
  const hasNewShape = "championNational" in a || "championDistrictAfId" in a;
  let championNational = Boolean(a.championNational);
  let championDistrictAfId: CoachDistrictAssociationId | null =
    a.championDistrictAfId && isDistrictId(a.championDistrictAfId) ? a.championDistrictAfId : null;

  if (!hasNewShape && a.champion === true) {
    championNational = true;
    championDistrictAfId = null;
  }

  return {
    championNational,
    championDistrictAfId,
    cupsWon: typeof a.cupsWon === "string" ? a.cupsWon : "",
    promotion: Boolean(a.promotion),
    maintenance: Boolean(a.maintenance),
    qualifiedFinals: Boolean(a.qualifiedFinals),
    recordsNotes: typeof a.recordsNotes === "string" ? a.recordsNotes : "",
    distinctions: typeof a.distinctions === "string" ? a.distinctions : "",
  };
}

function achievementsMatch(a: CoachSeasonAchievements, b: CoachSeasonAchievements): boolean {
  return (
    a.championNational === b.championNational &&
    a.championDistrictAfId === b.championDistrictAfId &&
    a.cupsWon === b.cupsWon &&
    a.promotion === b.promotion &&
    a.maintenance === b.maintenance &&
    a.qualifiedFinals === b.qualifiedFinals &&
    (a.recordsNotes ?? "") === (b.recordsNotes ?? "") &&
    (a.distinctions ?? "") === (b.distinctions ?? "")
  );
}

export function normalizeCareerSeason(season: CoachCareerSeason): CoachCareerSeason {
  const achievements = normalizeSeasonAchievements(season.achievements as Partial<LegacyAchievements>);
  if (achievementsMatch(achievements, season.achievements)) return season;
  return { ...season, achievements };
}

export function normalizeCareerSeasonsList(seasons: CoachCareerSeason[] | undefined): CoachCareerSeason[] | undefined {
  if (!seasons?.length) return seasons;
  let changed = false;
  const out = seasons.map((s) => {
    const n = normalizeCareerSeason(s);
    if (n !== s) changed = true;
    return n;
  });
  return changed ? out : seasons;
}

export function withNormalizedCareerSeasonsInProfile(profile: CoachProfileState): CoachProfileState {
  const next = normalizeCareerSeasonsList(profile.careerSeasons);
  if (next === profile.careerSeasons) return profile;
  return { ...profile, careerSeasons: next };
}
