import type { CoachProfileState, TacticMatch } from "@/types";
import type { WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import { emptyWorkspaceSnapshot, parseWorkspacePayload } from "@/lib/workspace-snapshot";
import { winPctFromTacticMatches } from "@/lib/president-linked-roster";
import { coachBuilderPerformanceScore } from "@/lib/president-recruitment-score";

const AVATAR_MAX_LEN = 100_000;

export type CoachDirectoryRow = {
  userId: string;
  email: string;
  name: string;
  coachingRole: string;
  subscriptionPlan: string;
  linkedToPresident: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  loginCount: number;
  avatarDataUrl?: string;
  age: number | null;
  profileName: string;
  role: string;
  club: string;
  location: string;
  bio: string;
  nationality: string;
  dateOfBirth: string;
  ageGroupCoached: string;
  teamHistory: string;
  lastClub: string;
  winPct: number;
  matchesWithResult: number;
  honorCount: number;
  careerSeasonsCount: number;
  employmentStatus: string;
  performanceScore: number;
  recruitmentStatusLabel: string;
  experienceLevelLabel: string;
  salaryExpectationNote: string;
};

function ageFromIsoDob(iso?: string): number | null {
  if (!iso || iso.length < 10) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

function ageGroupFromProfile(cp: CoachProfileState): string {
  const cur = cp.careerCurrent?.ageGroup?.trim();
  if (cur) return cur;
  const seasons = cp.careerSeasons;
  if (seasons?.length) {
    const last = seasons[seasons.length - 1];
    return (last?.ageGroup ?? "").trim();
  }
  return (cp.club ?? "").trim();
}

function teamHistorySummary(cp: CoachProfileState): string {
  const seasons = cp.careerSeasons;
  if (!seasons?.length) return "";
  return seasons
    .slice(-8)
    .map((s) => [s.club, s.ageGroup, s.seasonLabel].filter(Boolean).join(" · "))
    .filter(Boolean)
    .join(" | ");
}

function currentClubLabel(cp: CoachProfileState): string {
  const curClub = cp.careerCurrent?.club?.trim();
  if (curClub) return curClub;
  const profileClub = (cp.club ?? "").trim();
  if (profileClub) return profileClub;
  const seasons = cp.careerSeasons;
  if (seasons?.length) {
    for (let i = seasons.length - 1; i >= 0; i -= 1) {
      const c = seasons[i]?.club?.trim();
      if (c) return c;
    }
  }
  return "";
}

function lastClubLabel(cp: CoachProfileState): string {
  const seasons = cp.careerSeasons;
  if (seasons?.length) {
    for (let i = seasons.length - 1; i >= 0; i -= 1) {
      const c = seasons[i]?.club?.trim();
      if (c) return c;
    }
  }
  const profileClub = (cp.club ?? "").trim();
  if (profileClub) return profileClub;
  return cp.careerCurrent?.club?.trim() ?? "";
}

function recruitmentStatusLabelPt(args: {
  linkedToPresident: boolean;
  employmentStatus: string;
  clubField: string;
}): string {
  if (args.linkedToPresident) return "Ligado a clube (modo Presidente)";
  if (args.employmentStatus === "unattached") return "Disponível";
  if (args.employmentStatus === "break") return "Aberto a oportunidades";
  if (args.employmentStatus === "active") return "Em funções";
  if (!args.clubField.trim()) return "Disponível";
  return "Aberto a propostas";
}

function experienceLevelFromCounts(seasons: number, honors: number): string {
  const score = seasons * 2 + honors * 3;
  if (score >= 24) return "Muito experiente";
  if (score >= 12) return "Experiente";
  if (score >= 4) return "Intermédio";
  if (score >= 1) return "Em progressão";
  return "A iniciar carreira";
}

export function buildCoachDirectoryRow(args: {
  userId: string;
  email: string;
  name: string;
  coachingRole: string;
  subscriptionPlan: string;
  clubPresidentUserId: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  loginCount: number;
  workspacePayload: unknown;
}): CoachDirectoryRow {
  const snap: WorkspaceSnapshotV1 = parseWorkspacePayload(args.workspacePayload) ?? emptyWorkspaceSnapshot();
  const cp = snap.coachProfile ?? ({} as CoachProfileState);
  const matches = (snap.tacticMatches ?? []) as TacticMatch[];
  const winPct = winPctFromTacticMatches(matches);
  const honorCount = cp.honors?.length ?? 0;
  const careerSeasonsCount = cp.careerSeasons?.length ?? 0;
  const createdMs = args.createdAt.getTime();
  const ageDays = Math.max(0, Math.floor((Date.now() - createdMs) / (24 * 60 * 60 * 1000)));
  const performanceScore = coachBuilderPerformanceScore({
    winPct,
    honorCount,
    loginCount: args.loginCount,
    accountAgeDays: ageDays,
  });
  const av = cp.avatarDataUrl?.trim();
  const avatarDataUrl =
    av && av.length <= AVATAR_MAX_LEN && (av.startsWith("data:") || av.startsWith("http")) ? av : undefined;
  const dob = (cp.dateOfBirth ?? "").trim();
  const linkedToPresident = Boolean(args.clubPresidentUserId);
  const emp = (cp.careerCurrent?.status ?? "").trim() || "unattached";
  const clubField = currentClubLabel(cp);

  return {
    userId: args.userId,
    email: args.email.trim(),
    name: args.name.trim() || args.email.trim(),
    coachingRole: args.coachingRole,
    subscriptionPlan: args.subscriptionPlan,
    linkedToPresident,
    createdAt: args.createdAt.toISOString(),
    lastSeenAt: args.lastSeenAt ? args.lastSeenAt.toISOString() : null,
    loginCount: args.loginCount,
    avatarDataUrl,
    age: ageFromIsoDob(dob),
    profileName: (cp.name ?? "").trim() || args.name.trim(),
    role: (cp.role ?? "").trim(),
    club: clubField,
    location: (cp.location ?? "").trim(),
    bio: (cp.bio ?? "").trim().slice(0, 4000),
    nationality: (cp.nationality ?? "").trim(),
    dateOfBirth: dob,
    ageGroupCoached: ageGroupFromProfile(cp),
    teamHistory: teamHistorySummary(cp),
    lastClub: lastClubLabel(cp),
    winPct,
    matchesWithResult: matches.filter((m) => m.outcome === "win" || m.outcome === "draw" || m.outcome === "loss").length,
    honorCount,
    careerSeasonsCount,
    employmentStatus: emp,
    performanceScore,
    recruitmentStatusLabel: recruitmentStatusLabelPt({
      linkedToPresident,
      employmentStatus: emp,
      clubField,
    }),
    experienceLevelLabel: experienceLevelFromCounts(careerSeasonsCount, honorCount),
    salaryExpectationNote: "",
  };
}
