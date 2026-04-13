/**
 * Associações de futebol distritais (Portugal) — troféu e título por AF.
 */

import type { CoachDistrictAssociationId } from "@/types";

export type CoachDistrictAssociation = {
  id: CoachDistrictAssociationId;
  /** Rótulo curto na UI (ex.: AF Porto) */
  label: string;
  /** Ficheiro em public/images/trophies/ */
  imageFile: string;
};

export const COACH_DISTRICT_ASSOCIATIONS: readonly CoachDistrictAssociation[] = [
  { id: "algarve", label: "AF Algarve", imageFile: "afalgarve.png" },
  { id: "aveiro", label: "AF Aveiro", imageFile: "afaveiro.png" },
  { id: "acores", label: "AF Açores", imageFile: "afacores.png" },
  { id: "beja", label: "AF Beja", imageFile: "afbeja.png" },
  { id: "braga", label: "AF Braga", imageFile: "afbraga.png" },
  { id: "braganca", label: "AF Bragança", imageFile: "afbraganca.png" },
  { id: "castelo_branco", label: "AF Castelo Branco", imageFile: "afcastelobranco.png" },
  { id: "coimbra", label: "AF Coimbra", imageFile: "afcoimbra.png" },
  { id: "evora", label: "AF Évora", imageFile: "afevora.png" },
  { id: "guarda", label: "AF Guarda", imageFile: "afguarda.png" },
  { id: "leiria", label: "AF Leiria", imageFile: "afleiria.png" },
  { id: "lisboa", label: "AF Lisboa", imageFile: "aflisboa.png" },
  { id: "madeira", label: "AF Madeira", imageFile: "afmadeira.png" },
  { id: "portalegre", label: "AF Portalegre", imageFile: "afportalegre.png" },
  { id: "porto", label: "AF Porto", imageFile: "afporto.png" },
  { id: "santarem", label: "AF Santarém", imageFile: "afsantarem.png" },
  { id: "setubal", label: "AF Setúbal", imageFile: "afsetubal.png" },
  { id: "viana_do_castelo", label: "AF Viana do Castelo", imageFile: "afvianadocastelo.png" },
  { id: "vila_real", label: "AF Vila Real", imageFile: "afvilareal.png" },
  { id: "viseu", label: "AF Viseu", imageFile: "afviseu.png" },
] as const;

const byId = new Map(COACH_DISTRICT_ASSOCIATIONS.map((a) => [a.id, a]));

export function districtAssociationById(id: CoachDistrictAssociationId): CoachDistrictAssociation | undefined {
  return byId.get(id);
}

/** Título no palmarés gerado a partir da carreira. */
export function districtChampionHonorTitle(id: CoachDistrictAssociationId): string {
  return `Campeão distrital — ${districtAssociationById(id)?.label ?? id}`;
}

export function districtTrophyPublicPath(imageFile: string): string {
  return `/images/trophies/${imageFile}`;
}

export function districtTrophyPathForId(id: CoachDistrictAssociationId): string | null {
  const a = districtAssociationById(id);
  return a ? districtTrophyPublicPath(a.imageFile) : null;
}

/** Recupera a AF a partir do título (palmarés antigo ou texto livre). */
export function parseDistrictAssociationIdFromHonorTitle(title: string): CoachDistrictAssociationId | null {
  const t = title.trim();
  for (const a of COACH_DISTRICT_ASSOCIATIONS) {
    if (t.includes(a.label)) return a.id;
  }
  return null;
}
