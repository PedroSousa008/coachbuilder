import type { UefaLicenseId } from "@/types";

/** PDFs oficiais do regulamento por nível (FPF / AF Braga). */
export const UEFA_REGULATION_PDF_URL: Record<UefaLicenseId, string> = {
  uefa_c: "https://afbraga.fpf.pt/Portals/4/Regulamento%20UEFA%20C%202024seg_Futebol.pdf",
  uefa_b: "https://afbraga.fpf.pt/Portals/4/Regulamento%20UEFA%20B%202024seg_Futebol.pdf",
  uefa_a: "https://www.fpf.pt/Portals/0/Regulamento%20UEFA%20A%202024.pdf",
  uefa_pro: "https://www.fpf.pt/Portals/0/Regulamento%20UEFA%20PRO%202025.pdf",
};

/**
 * Formulário / inscrição por nível (PDF ou página do curso).
 */
export const UEFA_ENROLLMENT_FORM_URL: Record<UefaLicenseId, string> = {
  uefa_c:
    "https://afleiria.fpf.pt/Portals/2/Documentos/Comunicados/Abertura%20CT%20FUTEBOL%20UEFA%20C_2025.pdf",
  uefa_b:
    "https://afporto.pt/wp-content/uploads/2023/10/Ficha-de-inscricao-Curso-de-Treinadores-de-Futebol-UEFA-B-GRAU-II.pdf",
  uefa_a: "https://www.fpf.pt/Portals/0/CO_00582_CursoTreinFutUEFA-A.pdf",
  uefa_pro: "https://fpfacademy.fpf.pt/courses/details/273",
};
