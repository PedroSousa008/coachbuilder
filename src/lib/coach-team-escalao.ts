import type { Player } from "@/types";

/** Idade em anos completos na data de referência (UTC). */
export function playerAgeAt(player: Player, refMs: number): number | null {
  const dobRaw = player.dateOfBirth?.trim();
  if (dobRaw) {
    const dob = new Date(`${dobRaw}T12:00:00.000Z`);
    if (!Number.isFinite(dob.getTime())) return null;
    const ref = new Date(refMs);
    let y = ref.getUTCFullYear() - dob.getUTCFullYear();
    const m = ref.getUTCMonth() - dob.getUTCMonth();
    const d = ref.getUTCDate() - dob.getUTCDate();
    if (m < 0 || (m === 0 && d < 0)) y -= 1;
    return y >= 0 ? y : null;
  }
  const a = player.age;
  if (typeof a === "number" && Number.isFinite(a) && a >= 0) return Math.round(a);
  return null;
}

/**
 * Séniores: basta existir um jogador com idade > 20.
 * Caso contrário: média das idades (só jogadores com idade conhecida) e faixas pedidas pelo produto.
 */
export function inferTeamEscalaoFromPlayers(players: Player[], refMs = Date.now()): string {
  const ages = players.map((p) => playerAgeAt(p, refMs)).filter((a): a is number => a != null);
  if (ages.length === 0) return "—";

  if (ages.some((a) => a > 20)) return "Séniores";

  const avg = ages.reduce((s, a) => s + a, 0) / ages.length;
  const m = Math.round(avg);

  if (m < 10) return "—";
  if (m <= 12) return "Benjamim";
  if (m <= 14) return "Infantil";
  if (m <= 15) return "Iniciado";
  if (m <= 17) return "Juvenil";
  if (m <= 19) return "Júnior";
  return "Séniores";
}
