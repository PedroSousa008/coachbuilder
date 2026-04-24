import type { LeagueTableRow, StaffMember } from "@/types";
import type { WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { aggregatePlayerGlobal, computeCoachPerformance, formLastN } from "@/lib/tactics-match-stats";
import { formatPlayerPositions } from "@/lib/player-positions";

function normalizeClub(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Melhor esforço: posição na tabela importada pelo clube do treinador. */
export function tablePositionForClub(rows: LeagueTableRow[], club: string): number | null {
  const c = normalizeClub(club);
  if (!c || !rows.length) return null;
  let best: LeagueTableRow | null = null;
  for (const r of rows) {
    const t = normalizeClub(r.team);
    if (!t) continue;
    if (t === c || t.includes(c) || c.includes(t)) {
      if (!best || r.position < best.position) best = r;
    }
  }
  return best?.position ?? null;
}

export type PresidentLinkedCoachBrief = {
  coachUserId: string;
  coachEmail: string;
  club: string;
  coachName: string;
  tablePosition: number | null;
  formLast5: ("W" | "D" | "L")[];
  winPct: number;
  leagueUrl: string;
  headCoach: { name: string; role: string; email: string };
  staffRows: { id: string; name: string; role: string }[];
  playerRows: {
    id: string;
    name: string;
    position: string;
    games: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  }[];
};

function staffSortedWithHeadFirst(profile: WorkspaceSnapshotV1["coachProfile"], staff: StaffMember[]) {
  const head = {
    id: "__head_coach__",
    name: (profile.name ?? "").trim() || "Treinador",
    role: (profile.role ?? "").trim() || "Treinador principal",
  };
  const headKey = head.name.trim().toLowerCase();
  const rest = staff
    .filter((s) => (headKey ? s.name.trim().toLowerCase() !== headKey : true))
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role || "—",
    }));
  return [head, ...rest];
}

export function buildPresidentLinkedCoachBrief(
  coachUserId: string,
  coachEmail: string,
  snap: WorkspaceSnapshotV1
): PresidentLinkedCoachBrief {
  const club = (snap.coachProfile.club ?? "").trim();
  const perf = computeCoachPerformance(snap.tactics ?? [], snap.tacticMatches ?? [], snap.players ?? []);
  const formLast5 = formLastN(snap.tacticMatches ?? [], 5);
  const tablePosition = tablePositionForClub(snap.league?.rows ?? [], club);
  const staffRows = staffSortedWithHeadFirst(snap.coachProfile, snap.staff ?? []);
  const playerRows = (snap.players ?? []).map((p) => {
    const agg = aggregatePlayerGlobal(snap.tacticMatches ?? [], p.id);
    return {
      id: p.id,
      name: p.name,
      position: formatPlayerPositions(p),
      games: agg.games,
      goals: agg.goals,
      assists: agg.assists,
      yellowCards: agg.yellowCards,
      redCards: agg.redCards,
    };
  });
  return {
    coachUserId,
    coachEmail,
    club,
    coachName: (snap.coachProfile.name ?? "").trim() || coachEmail,
    tablePosition,
    formLast5,
    winPct: perf.winRate,
    leagueUrl: snap.league?.url ?? "",
    headCoach: {
      name: (snap.coachProfile.name ?? "").trim() || "—",
      role: (snap.coachProfile.role ?? "").trim() || "—",
      email: (snap.coachProfile.email ?? coachEmail).trim() || coachEmail,
    },
    staffRows,
    playerRows,
  };
}
