import type { CoachCareerRoleId, CoachEmploymentStatus, CoachHonorCategory } from "@/types";

/**
 * Troféu por defeito para **campeonato distrital** (ex.: AF Porto / “Boca”).
 * Coloca o ficheiro em `public/images/trophies/campeao-campeonato.png`.
 */
export const DISTRICT_CHAMPIONSHIP_TROPHY_IMAGE_PATH = "/images/trophies/campeao-campeonato.png";

/**
 * Troféu por defeito para **campeonato nacional**. Coloca `campeao-nacional.png` na mesma pasta;
 * se o ficheiro não existir, a UI mostra o ícone de troféu após erro de carregamento.
 */
export const NATIONAL_CHAMPIONSHIP_TROPHY_IMAGE_PATH = "/images/trophies/campeao-nacional.png";

/** @deprecated Usa `DISTRICT_CHAMPIONSHIP_TROPHY_IMAGE_PATH`. */
export const CHAMPIONSHIP_TROPHY_IMAGE_PATH = DISTRICT_CHAMPIONSHIP_TROPHY_IMAGE_PATH;

export function defaultHonorTrophyImagePath(category: CoachHonorCategory): string | null {
  switch (category) {
    case "league_district":
    case "league":
      return DISTRICT_CHAMPIONSHIP_TROPHY_IMAGE_PATH;
    case "league_national":
      return NATIONAL_CHAMPIONSHIP_TROPHY_IMAGE_PATH;
    default:
      return null;
  }
}

/** Categorias com imagem de troféu de campeão por defeito (nacional ou distrital). */
export function honorCategoryUsesLeagueDefaultTrophy(category: CoachHonorCategory): boolean {
  return category === "league_national" || category === "league_district" || category === "league";
}

/** Fundo decorativo do armário de troféus (vitrine 5×5). */
export const TROPHY_CABINET_BG_PATH = "/images/trophies/trophy-cabinet-bg.png";

export const TROPHY_CABINET_ROWS = 5;
export const TROPHY_CABINET_COLS = 5;
export const TROPHY_CABINET_SLOTS = TROPHY_CABINET_ROWS * TROPHY_CABINET_COLS;

export const CAREER_ROLE_OPTIONS: { id: CoachCareerRoleId; label: string }[] = [
  { id: "head", label: "Treinador Principal" },
  { id: "assistant", label: "Treinador Adjunto" },
  { id: "analyst", label: "Analista" },
  { id: "gk", label: "Treinador de GR" },
  { id: "fitness", label: "Preparador Físico" },
  { id: "coordinator", label: "Coordenador" },
];

export const EMPLOYMENT_STATUS_OPTIONS: { id: CoachEmploymentStatus; label: string }[] = [
  { id: "active", label: "Activo" },
  { id: "unattached", label: "Sem clube" },
  { id: "break", label: "Em pausa" },
];

export const HONOR_CATEGORY_OPTIONS: { id: CoachHonorCategory; label: string }[] = [
  { id: "league_national", label: "Campeonato Nacional" },
  { id: "league_district", label: "Campeonato Distrital" },
  { id: "cup", label: "Taças" },
  { id: "supercup", label: "Supertaças" },
  { id: "tournament", label: "Torneios" },
  { id: "individual", label: "Distinções individuais" },
  { id: "special", label: "Conquistas especiais" },
];

export function careerRoleLabel(id: CoachCareerRoleId): string {
  return CAREER_ROLE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function employmentStatusLabel(id: CoachEmploymentStatus): string {
  return EMPLOYMENT_STATUS_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

const HONOR_CATEGORY_LABEL_FALLBACK: Partial<Record<CoachHonorCategory, string>> = {
  league: "Campeonatos (legado)",
};

export function honorCategoryLabel(id: CoachHonorCategory): string {
  return (
    HONOR_CATEGORY_OPTIONS.find((o) => o.id === id)?.label ?? HONOR_CATEGORY_LABEL_FALLBACK[id] ?? id
  );
}
