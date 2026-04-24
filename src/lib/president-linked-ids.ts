/** `linked:<coachUserId>` — linha de treinador agregado. */
export function parseLinkedCoachRowId(rowId: string): string | null {
  const m = /^linked:([^:]+)$/.exec(rowId);
  return m ? m[1]! : null;
}

/** `linked:<coachUserId>:<playerId>` — linha de jogador agregado. */
export function parseLinkedPlayerRowId(rowId: string): { coachUserId: string; playerId: string } | null {
  const m = /^linked:([^:]+):(.+)$/.exec(rowId);
  if (!m) return null;
  const coachUserId = m[1]!;
  const playerId = m[2]!;
  if (!coachUserId || !playerId) return null;
  return { coachUserId, playerId };
}
