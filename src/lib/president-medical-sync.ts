import { presidentUid } from "@/lib/president-club-dashboard";
import type { PresidentInjury, PresidentInjurySeverity, PresidentInjuryStatus, PresidentPlayer } from "@/types/president-club";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function coachInjuryFromStatus(status: string): { severity: PresidentInjurySeverity; clinical: PresidentInjuryStatus; pct: number } {
  const s = status.trim();
  if (s === "Dúvida") return { severity: "leve", clinical: "em_avaliacao", pct: 72 };
  if (s === "Indisponível") return { severity: "moderada", clinical: "em_recuperacao", pct: 45 };
  return { severity: "leve", clinical: "em_avaliacao", pct: 80 };
}

/** Constrói ou actualiza uma linha de lesão a partir do plantel agregado do treinador. */
export function buildSyncedInjuryFromPlayer(player: PresidentPlayer, prev?: PresidentInjury | null): PresidentInjury {
  const meta = coachInjuryFromStatus(player.injuryStatus);
  const start = (prev?.startDate && prev.startDate.length >= 10 ? prev.startDate : todayIso()) ?? todayIso();
  const expected = (prev?.expectedReturn && prev.expectedReturn.length >= 10 ? prev.expectedReturn : "") ?? "";
  const daysOut = daysBetween(start, todayIso());
  const injuryType =
    prev?.injuryType && prev.injuryType.trim().length > 0
      ? prev.injuryType
      : player.injuryStatus === "Dúvida"
        ? "Dúvida / avaliação (Equipa)"
        : "Indisponível (Equipa)";
  return {
    id: prev?.id && prev.syncedFromCoach ? prev.id : presidentUid(),
    sourcePlayerId: player.id,
    syncedFromCoach: true,
    playerName: player.name,
    team: player.team,
    position: player.position,
    injuryType,
    bodyArea: prev?.bodyArea?.trim() ? prev.bodyArea : "—",
    severity: prev?.severity ?? meta.severity,
    startDate: start.slice(0, 10),
    expectedReturn: expected.slice(0, 10),
    daysOut,
    status: prev?.status ?? meta.clinical,
    assignedStaff: prev?.assignedStaff ?? "",
    note: prev?.note ?? "Sincronizado automaticamente a partir do estado do jogador na equipa do treinador.",
    recoveryProgress: prev?.recoveryProgress ?? "",
    medicalNotes: prev?.medicalNotes ?? "",
    availabilityPct: prev?.availabilityPct && prev.availabilityPct > 0 ? prev.availabilityPct : meta.pct,
    rehabSessionsDone: prev?.rehabSessionsDone,
    nextMilestone: prev?.nextMilestone,
    workloadNotes: prev?.workloadNotes,
    recurrenceWarning: prev?.recurrenceWarning,
    medicalCostEUR: prev?.medicalCostEUR,
  };
}

/**
 * Injuries com `syncedFromCoach` vêm do plantel; o resto são registos manuais do Presidente.
 * Quando o treinador marca o jogador como disponível, a linha sincronizada deixa de ser gerada.
 */
export function mergeLinkedPlayersIntoInjuries(injuries: PresidentInjury[], players: PresidentPlayer[]): PresidentInjury[] {
  const manual = injuries.filter((i) => !i.syncedFromCoach);
  const prevSynced = new Map(
    injuries.filter((i) => i.syncedFromCoach && i.sourcePlayerId).map((i) => [i.sourcePlayerId as string, i])
  );
  const linked = players.filter((p) => {
    const s = (p.injuryStatus ?? "").trim();
    return s === "Dúvida" || s === "Indisponível";
  });
  const auto = linked.map((p) => buildSyncedInjuryFromPlayer(p, prevSynced.get(p.id) ?? null));
  return [...auto, ...manual];
}
