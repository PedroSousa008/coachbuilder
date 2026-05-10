import type { Player } from "@/types";

/**
 * Funde dois registos do mesmo jogador: campos do `overlay` ganham, mas **foto / docs / testes**
 * não são apagados se o `overlay` vier sem esses campos (payload parcial da API ou da BD).
 */
export function mergePlayerPair(base: Player, overlay: Player): Player {
  const out: Player = { ...base, ...overlay };

  const photoOverlay = overlay.photoUrl?.trim();
  const photoBase = base.photoUrl?.trim();
  out.photoUrl = (photoOverlay || photoBase) || undefined;
  if (out.photoUrl) {
    out.photoFrame = photoOverlay
      ? overlay.photoFrame ?? base.photoFrame
      : base.photoFrame ?? overlay.photoFrame;
  } else {
    out.photoFrame = undefined;
  }

  out.documents = overlay.documents ?? base.documents;
  out.evaluationTests = overlay.evaluationTests ?? base.evaluationTests;
  out.qualities = { ...base.qualities, ...overlay.qualities };

  out.nationality = (overlay.nationality?.trim() || base.nationality?.trim()) || undefined;
  out.marketValueNote = (overlay.marketValueNote?.trim() || base.marketValueNote?.trim()) || undefined;
  out.scoutedFromClub = (overlay.scoutedFromClub?.trim() || base.scoutedFromClub?.trim()) || undefined;
  out.linkedNametag = (overlay.linkedNametag?.trim() || base.linkedNametag?.trim()) || undefined;
  out.scoutingHighlights =
    overlay.scoutingHighlights?.length ? overlay.scoutingHighlights : base.scoutingHighlights;

  return out;
}

/**
 * União por `id` com fusão “rica” por jogador (evita perder foto ao cruzar local + cloud).
 * Ordem: entradas de `base` primeiro; `overlay` atualiza ou junta o mesmo `id`.
 */
export function mergePlayerRosterById(base: Player[], overlay: Player[]): Player[] {
  const m = new Map<string, Player>();
  for (const p of base) {
    if (p?.id) m.set(p.id, p);
  }
  for (const incoming of overlay) {
    if (!incoming?.id) continue;
    const prev = m.get(incoming.id);
    m.set(incoming.id, prev ? mergePlayerPair(prev, incoming) : incoming);
  }
  return Array.from(m.values());
}
