import type { CoachCareerRoleId, CoachEmploymentStatus, CoachHonorCategory } from "@/types";

/**
 * Imagem fixa do troféu de **campeão** (categoria Campeonatos / `league`).
 * Coloca o ficheiro em `public/images/trophies/campeao-campeonato.png`
 * (podes usar `.jpg` ou `.webp` — nesse caso altera também esta constante).
 * Aparece para todas as épocas e escalões quando não há foto personalizada.
 */
export const CHAMPIONSHIP_TROPHY_IMAGE_PATH = "/images/trophies/campeao-campeonato.png";

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
  { id: "league", label: "Campeonatos" },
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

export function honorCategoryLabel(id: CoachHonorCategory): string {
  return HONOR_CATEGORY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}
