import type { CoachCareerRoleId, CoachEmploymentStatus, CoachHonorCategory } from "@/types";

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
