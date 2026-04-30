import type { CoachHonorEntry, CoachProfileState, Player, TacticMatch, TrainingSession } from "@/types";
import type { PresidentCoach, PresidentLinkedStaff, PresidentPlayer } from "@/types/president-club";
import type { WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { formatPlayerPositions } from "@/lib/player-positions";

export function winPctFromTacticMatches(matches: TacticMatch[]): number {
  if (!matches.length) return 0;
  let wins = 0;
  for (const m of matches) {
    if (m.outcome === "win") wins += 1;
  }
  return Math.round((wins / matches.length) * 100);
}

function honorsToTrophies(honors: CoachHonorEntry[] | undefined): string {
  if (!honors?.length) return "";
  return honors
    .slice(0, 16)
    .map((h) => [h.title, h.seasonLabel].filter(Boolean).join(" "))
    .join(" · ");
}

function careerSummary(profile: CoachProfileState): string {
  const s = profile.careerSeasons;
  if (!s?.length) return "";
  return s
    .slice(0, 5)
    .map((c) => [c.club, c.ageGroup, c.seasonLabel].filter(Boolean).join(" · "))
    .join(" | ");
}

function availabilityToInjuryStatus(p: Player): string {
  if (p.availability === "doubt") return "Dúvida";
  if (p.availability === "out") return "Indisponível";
  return "";
}

/** Constrói a linha de treinador no modo Presidente a partir do workspace (perfil + estatísticas). */
export function mapWorkspaceToPresidentCoach(
  coachUserId: string,
  coachEmail: string,
  snapshot: WorkspaceSnapshotV1
): PresidentCoach {
  const p = snapshot.coachProfile;
  const sessions = snapshot.trainingSessions ?? [];
  const matches = snapshot.tacticMatches ?? [];
  const winPct = winPctFromTacticMatches(matches);
  return {
    id: `linked:${coachUserId}`,
    coachUserId,
    coachEmail,
    name: (p.name ?? "").trim() || coachEmail,
    birthDate: (p.dateOfBirth ?? "").trim(),
    role: (p.role ?? "").trim(),
    team: (p.club ?? "").trim(),
    winPct,
    sessionsCreated: sessions.length,
    activityLevel: "Média",
    parentRating: 0,
    internalRank: 0,
    contractStatus: "",
    statsHistory: matches.length
      ? `${matches.length} jogos registados · ${winPct}% vitórias (jogos com tática)`
      : "",
    careerPath: careerSummary(p),
    trophies: honorsToTrophies(p.honors),
    methodology: (p.bio ?? "").trim().slice(0, 2000),
    strengths: (p.profession ?? "").trim(),
    notes: "Sincronizado automaticamente a partir do perfil e workspace desta conta de treinador.",
  };
}

/** Constrói linhas de jogadores para o modo Presidente a partir do plantel do treinador. */
export function mapWorkspaceToPresidentPlayers(
  coachUserId: string,
  coachEmail: string,
  snapshot: WorkspaceSnapshotV1
): PresidentPlayer[] {
  const club = (snapshot.coachProfile.club ?? "").trim();
  return (snapshot.players ?? []).map((pl) => ({
    id: `linked:${coachUserId}:${pl.id}`,
    coachUserId,
    coachEmail,
    name: pl.name,
    age: String(pl.age ?? ""),
    team: club,
    position: formatPlayerPositions(pl),
    attendance: "",
    potentialRating: "",
    injuryStatus: availabilityToInjuryStatus(pl),
    notes: "Dados do plantel do treinador (sincronizados).",
    // "Jogador de topo" no modo presidente segue automaticamente o estado de forma do plantel do treinador.
    isTopTalent: pl.performance === "up",
    technicalEvolution: "",
    physicalNotes: "",
    coachFeedback: "",
    paymentsNote: "",
    injuriesNote: "",
    familyContacts: "",
  }));
}

/** Constrói linhas de staff para sincronização em despesas (pagamentos a sair). */
export function mapWorkspaceToPresidentLinkedStaff(
  coachUserId: string,
  coachEmail: string,
  snapshot: WorkspaceSnapshotV1
): PresidentLinkedStaff[] {
  const team = (snapshot.coachProfile.club ?? "").trim();
  const headName = (snapshot.coachProfile.name ?? "").trim() || coachEmail;
  const headRole = (snapshot.coachProfile.role ?? "").trim() || "Treinador principal";
  const head: PresidentLinkedStaff = {
    id: `linkedstaff:${coachUserId}:head`,
    sourceStaffKey: `linkedstaff:${coachUserId}:head`,
    coachUserId,
    coachEmail,
    name: headName,
    role: headRole,
    team,
  };
  const rest: PresidentLinkedStaff[] = (snapshot.staff ?? []).map((s) => ({
    id: `linkedstaff:${coachUserId}:${s.id}`,
    sourceStaffKey: `linkedstaff:${coachUserId}:${s.id}`,
    coachUserId,
    coachEmail,
    name: s.name.trim(),
    role: (s.role ?? "").trim(),
    team,
  }));
  return [head, ...rest].filter((x) => x.name);
}
