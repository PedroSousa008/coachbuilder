import type { UefaLicenseId } from "@/types";

/** PDFs oficiais do regulamento por nível (FPF / AF Braga). */
export const UEFA_REGULATION_PDF_URL: Record<UefaLicenseId, string> = {
  uefa_c: "https://afbraga.fpf.pt/Portals/4/Regulamento%20UEFA%20C%202024seg_Futebol.pdf",
  uefa_b: "https://afbraga.fpf.pt/Portals/4/Regulamento%20UEFA%20B%202024seg_Futebol.pdf",
  uefa_a: "https://www.fpf.pt/Portals/0/Regulamento%20UEFA%20A%202024.pdf",
  uefa_pro: "https://www.fpf.pt/Portals/0/Regulamento%20UEFA%20PRO%202025.pdf",
};

/**
 * Formulário / inscrição. UEFA A: PDF oficial.
 * C, B, Pro: página geral FPF formação de treinadores até haver URL específica por nível.
 */
export const UEFA_ENROLLMENT_FORM_URL: Record<UefaLicenseId, string> = {
  uefa_c: "https://www.fpf.pt/pt/Formacao/Formacao-de-treinadores",
  uefa_b: "https://www.fpf.pt/pt/Formacao/Formacao-de-treinadores",
  uefa_a: "https://www.fpf.pt/Portals/0/CO_00582_CursoTreinFutUEFA-A.pdf",
  uefa_pro: "https://www.fpf.pt/pt/Formacao/Formacao-de-treinadores",
};
