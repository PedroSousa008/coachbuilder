import { newCoachEntityId } from "@/lib/coach-entity-id";
import type { CoachCareerSeason, CoachHonorEntry } from "@/types";

export function honorDedupeKey(h: Pick<CoachHonorEntry, "category" | "title" | "seasonLabel" | "club">): string {
  return `${h.category}|${h.seasonLabel}|${h.club}|${h.title}`;
}

/**
 * Gera entradas de palmarés a partir dos campos de conquistas de uma época.
 */
export function honorsDerivedFromSeason(season: CoachCareerSeason): CoachHonorEntry[] {
  const out: CoachHonorEntry[] = [];
  const { achievements: a, seasonLabel, club, ageGroup, id: seasonId } = season;

  if (a.champion) {
    out.push({
      id: newCoachEntityId("hon"),
      category: "league",
      title: "Campeão nacional / competição principal",
      seasonLabel,
      club,
      ageGroup,
      sourceSeasonId: seasonId,
      origin: "career",
    });
  }

  if (a.cupsWon.trim()) {
    const lines = a.cupsWon
      .split(/\n|;|,/)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const line of lines) {
      out.push({
        id: newCoachEntityId("hon"),
        category: "cup",
        title: line,
        seasonLabel,
        club,
        ageGroup,
        sourceSeasonId: seasonId,
        origin: "career",
      });
    }
  }

  if (a.promotion) {
    out.push({
      id: newCoachEntityId("hon"),
      category: "special",
      title: "Subida de divisão",
      seasonLabel,
      club,
      ageGroup,
      sourceSeasonId: seasonId,
      origin: "career",
    });
  }

  if (a.maintenance) {
    out.push({
      id: newCoachEntityId("hon"),
      category: "special",
      title: "Manutenção na divisão",
      seasonLabel,
      club,
      ageGroup,
      sourceSeasonId: seasonId,
      origin: "career",
    });
  }

  if (a.qualifiedFinals) {
    out.push({
      id: newCoachEntityId("hon"),
      category: "tournament",
      title: "Qualificação para fases finais",
      seasonLabel,
      club,
      ageGroup,
      sourceSeasonId: seasonId,
      origin: "career",
    });
  }

  if (a.distinctions?.trim()) {
    out.push({
      id: newCoachEntityId("hon"),
      category: "individual",
      title: a.distinctions.trim(),
      seasonLabel,
      club,
      ageGroup,
      sourceSeasonId: seasonId,
      origin: "career",
    });
  }

  return out;
}

export function buildCareerOriginatedHonors(seasons: CoachCareerSeason[]): CoachHonorEntry[] {
  const list: CoachHonorEntry[] = [];
  for (const s of seasons) {
    list.push(...honorsDerivedFromSeason(s));
  }
  return list;
}

/**
 * Junta palmarés: mantém entradas manuais; substitui todas as de origem `career` pelas derivadas das épocas.
 */
export function mergeHonorsWithCareer(
  existing: CoachHonorEntry[] | undefined,
  seasons: CoachCareerSeason[] | undefined
): CoachHonorEntry[] {
  const manual = (existing ?? []).filter((h) => h.origin === "manual");
  const careerHonors = buildCareerOriginatedHonors(seasons ?? []);
  return [...manual, ...careerHonors];
}

export type HonorConflict = {
  existing: CoachHonorEntry;
  incoming: CoachHonorEntry;
};

/**
 * Detecta possível duplicado manual vs gerado (mesmo título época clube categoria).
 */
export function findHonorConflicts(manual: CoachHonorEntry[], generated: CoachHonorEntry[]): HonorConflict[] {
  const conflicts: HonorConflict[] = [];
  for (const g of generated) {
    const gk = honorDedupeKey(g);
    for (const m of manual) {
      if (honorDedupeKey(m) === gk) {
        conflicts.push({ existing: m, incoming: g });
        break;
      }
    }
  }
  return conflicts;
}

/** Remove manuais que colidem com entradas geradas (mesma chave). */
export function filterManualRemovingConflictsWithGenerated(
  manual: CoachHonorEntry[],
  generated: CoachHonorEntry[]
): CoachHonorEntry[] {
  const gk = new Set(generated.map(honorDedupeKey));
  return manual.filter((m) => !gk.has(honorDedupeKey(m)));
}

export function minimalSeasonFromHonor(h: CoachHonorEntry): CoachCareerSeason {
  return {
    id: newCoachEntityId("sea"),
    seasonLabel: h.seasonLabel,
    club: h.club,
    ageGroup: h.ageGroup,
    role: "head",
    stats: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
    achievements: {
      champion: h.category === "league",
      cupsWon: h.category === "cup" ? h.title : "",
      promotion: h.category === "special" && h.title.toLowerCase().includes("subida"),
      maintenance: h.category === "special" && h.title.toLowerCase().includes("manutenção"),
      qualifiedFinals: h.category === "tournament",
      distinctions: h.category === "individual" ? h.title : "",
    },
  };
}
