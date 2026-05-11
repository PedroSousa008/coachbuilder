import type {
  CoachProfileState,
  Conversation,
  LeagueSetup,
  LeagueImportedMatch,
  LeagueTableRow,
  MatchFixture,
  Message,
  PastClubResult,
  Player,
  SavedTrainingExercise,
  StaffMember,
  SketchAreaState,
  Tactic,
  TacticMatch,
  TacticPlayerAnalysisNote,
  TeamCallupState,
  TeamRoles,
  TrainingSession,
} from "@/types";
import { loadPersistedJson, savePersistedJson } from "@/lib/coachbuilder-persist";
import { getAllUserDataKeys } from "@/lib/user-storage-keys";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import { emptySketchAreaState } from "@/lib/sketch-area";
import { emptyTeamCallupState, mergeTeamCallup } from "@/lib/team-callup";

export const WORKSPACE_SNAPSHOT_VERSION = 1 as const;

export type LeaguePersistSnapshot = {
  url: string;
  rows: LeagueTableRow[];
  matches: LeagueImportedMatch[];
  competitionName: string | null;
  lastFetched: string | null;
  lastError: string | null;
  setup?: LeagueSetup | null;
  pastClubResults?: PastClubResult[];
};

/** Payload guardado na BD e enviado pela API (versão explícita para migrações futuras). */
export type WorkspaceSnapshotV1 = {
  version: typeof WORKSPACE_SNAPSHOT_VERSION;
  players: Player[];
  staff: StaffMember[];
  teamRoles: TeamRoles;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  trainingSessions: TrainingSession[];
  trainingPlayers: Record<string, string[]>;
  fixtures: MatchFixture[];
  league: LeaguePersistSnapshot;
  coachProfile: CoachProfileState;
  tactics: Tactic[];
  tacticMatches: TacticMatch[];
  tacticPlayerNotes: Record<string, TacticPlayerAnalysisNote>;
  savedTrainingExercises: SavedTrainingExercise[];
  sketchArea: SketchAreaState;
  teamCallup: TeamCallupState;
};

/**
 * Evita perder `avatarDataUrl` quando um lado do merge não traz o campo ou vem vazio por omissão.
 * `""` em `preferred` significa remoção explícita (resultado `undefined`).
 */
export function pickFirstNonEmptyAvatarUrl(
  preferred: string | undefined,
  fallback: string | undefined
): string | undefined {
  if (preferred === "") return undefined;
  const p = preferred?.trim();
  if (p) return preferred;
  if (fallback === "") return undefined;
  const f = fallback?.trim();
  if (f) return fallback;
  return undefined;
}

export function emptyWorkspaceSnapshot(): WorkspaceSnapshotV1 {
  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    players: [],
    staff: [],
    teamRoles: {
      captain: null,
      viceCaptain: null,
      thirdCaptain: null,
      fourthCaptain: null,
      penalties: [],
      freeKickRight: [],
      freeKickLeft: [],
      cornerRight: [],
      cornerLeft: [],
    },
    conversations: [],
    messages: {},
    trainingSessions: [],
    trainingPlayers: {},
    fixtures: [],
    league: {
      url: "",
      rows: [],
      matches: [],
      competitionName: null,
      lastFetched: null,
      lastError: null,
      setup: null,
      pastClubResults: [],
    },
    coachProfile: { name: "", club: "", role: "Head Coach", email: "" },
    tactics: [],
    tacticMatches: [],
    tacticPlayerNotes: {},
    savedTrainingExercises: [],
    sketchArea: emptySketchAreaState(),
    teamCallup: emptyTeamCallupState(),
  };
}

export function snapshotHasMeaningfulData(s: WorkspaceSnapshotV1 | null | undefined): boolean {
  if (!s) return false;
  if (s.players.length > 0) return true;
  if (s.staff.length > 0) return true;
  if (s.teamRoles.captain || s.teamRoles.viceCaptain || s.teamRoles.penalties.length > 0) return true;
  if (s.tactics.length > 0) return true;
  if (s.tacticMatches.length > 0) return true;
  if (s.trainingSessions.length > 0) return true;
  if (s.fixtures.length > 0) return true;
  if (s.conversations.length > 1) return true;
  if (Object.keys(s.messages).length > 1) return true;
  if (s.league.matches.length > 0 || s.league.rows.length > 0) return true;
  if (s.coachProfile.name.trim() !== "" || s.coachProfile.club.trim() !== "") return true;
  if ((s.coachProfile.careerSeasons?.length ?? 0) > 0) return true;
  if ((s.coachProfile.honors?.length ?? 0) > 0) return true;
  if (s.coachProfile.avatarDataUrl) return true;
  if (Object.keys(s.tacticPlayerNotes).length > 0) return true;
  if (s.savedTrainingExercises.length > 0) return true;
  const sk = s.sketchArea;
  if (
    sk &&
    (sk.calendarEvents.length > 0 ||
      sk.notes.length > 0 ||
      sk.tasks.length > 0 ||
      sk.files.length > 0 ||
      sk.boardDrafts.length > 0 ||
      sk.watchlist.length > 0)
  )
    return true;
  const tc = s.teamCallup;
  if (tc && (tc.clubLogoDataUrl || tc.selectedPlayerIds.length > 0)) return true;
  if (tc && Object.values(tc.form).some((v) => String(v).trim() !== "")) return true;
  return false;
}

/** Grava o snapshot no browser (localStorage e, se necessário, IndexedDB por chave). */
export async function writeWorkspaceSnapshotToLocalStorage(
  userId: string,
  s: WorkspaceSnapshotV1
): Promise<void> {
  if (typeof window === "undefined") return;
  const ks = getAllUserDataKeys(userId);
  await Promise.all([
    savePersistedJson(ks.players, s.players),
    savePersistedJson(ks.staff, s.staff),
    savePersistedJson(ks.teamRoles, s.teamRoles),
    savePersistedJson(ks.conversations, s.conversations),
    savePersistedJson(ks.messages, s.messages),
    savePersistedJson(ks.sessions, s.trainingSessions),
    savePersistedJson(ks.trainingPlayers, s.trainingPlayers),
    savePersistedJson(ks.fixtures, s.fixtures),
    savePersistedJson(ks.league, s.league),
    savePersistedJson(ks.coachProfile, s.coachProfile),
    savePersistedJson(ks.tactics, s.tactics),
    savePersistedJson(ks.tacticMatches, s.tacticMatches),
    savePersistedJson(ks.tacticPlayerNotes, s.tacticPlayerNotes),
    savePersistedJson(ks.savedTrainingExercises, s.savedTrainingExercises),
    savePersistedJson(ks.sketchArea, s.sketchArea),
    savePersistedJson(ks.teamCallup, s.teamCallup),
  ]);
}

/** Agrega o que está persistido no browser para este `userId` (localStorage + overflow no IndexedDB). */
export async function collectWorkspaceFromLocalStorage(userId: string): Promise<WorkspaceSnapshotV1> {
  if (typeof window === "undefined") return emptyWorkspaceSnapshot();
  const e = emptyWorkspaceSnapshot();
  const ks = getAllUserDataKeys(userId);
  const [
    players,
    staff,
    teamRoles,
    conversations,
    messages,
    trainingSessions,
    trainingPlayers,
    fixtures,
    league,
    coachPartial,
    tactics,
    tacticMatches,
    tacticPlayerNotes,
    savedTrainingExercises,
    sketchRaw,
    teamCallupRaw,
  ] = await Promise.all([
    loadPersistedJson<Player[]>(ks.players, []),
    loadPersistedJson<StaffMember[]>(ks.staff, []),
    loadPersistedJson<TeamRoles>(ks.teamRoles, e.teamRoles),
    loadPersistedJson<Conversation[]>(ks.conversations, []),
    loadPersistedJson<Record<string, Message[]>>(ks.messages, {}),
    loadPersistedJson<TrainingSession[]>(ks.sessions, []),
    loadPersistedJson<Record<string, string[]>>(ks.trainingPlayers, {}),
    loadPersistedJson<MatchFixture[]>(ks.fixtures, []),
    loadPersistedJson<Partial<LeaguePersistSnapshot>>(ks.league, {}),
    loadPersistedJson<Partial<CoachProfileState>>(ks.coachProfile, {}),
    loadPersistedJson<Tactic[]>(ks.tactics, []),
    loadPersistedJson<TacticMatch[]>(ks.tacticMatches, []),
    loadPersistedJson<Record<string, TacticPlayerAnalysisNote>>(ks.tacticPlayerNotes, {}),
    loadPersistedJson<SavedTrainingExercise[]>(ks.savedTrainingExercises, []),
    loadPersistedJson<unknown>(ks.sketchArea, null),
    loadPersistedJson<unknown>(ks.teamCallup, null),
  ]);
  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    players,
    staff,
    teamRoles,
    conversations,
    messages,
    trainingSessions,
    trainingPlayers,
    fixtures,
    league: {
      url: league.url ?? "",
      rows: league.rows ?? [],
      matches: dedupeMatches(league.matches ?? []),
      competitionName: league.competitionName ?? null,
      lastFetched: league.lastFetched ?? null,
      lastError: league.lastError ?? null,
      setup: (league.setup as LeagueSetup | null | undefined) ?? null,
      pastClubResults: Array.isArray(league.pastClubResults) ? (league.pastClubResults as PastClubResult[]) : [],
    },
    coachProfile: {
      name: "",
      club: "",
      role: "Head Coach",
      email: "",
      ...coachPartial,
    } satisfies CoachProfileState,
    tactics,
    tacticMatches,
    tacticPlayerNotes,
    savedTrainingExercises,
    sketchArea: mergeSketchArea(sketchRaw, emptySketchAreaState()),
    teamCallup: mergeTeamCallup(teamCallupRaw, emptyTeamCallupState()),
  };
}

export function parseWorkspacePayload(raw: unknown): WorkspaceSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version != null && o.version !== WORKSPACE_SNAPSHOT_VERSION) return null;
  const e = emptyWorkspaceSnapshot();
  const L = o.league && typeof o.league === "object" ? (o.league as Record<string, unknown>) : {};
  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    players: Array.isArray(o.players) ? (o.players as Player[]) : e.players,
    staff: Array.isArray(o.staff) ? (o.staff as StaffMember[]) : e.staff,
    teamRoles:
      o.teamRoles && typeof o.teamRoles === "object"
        ? ({
            ...e.teamRoles,
            ...(o.teamRoles as Partial<TeamRoles>),
            penalties: Array.isArray((o.teamRoles as TeamRoles).penalties)
              ? ((o.teamRoles as TeamRoles).penalties as string[])
              : e.teamRoles.penalties,
            freeKickRight: Array.isArray((o.teamRoles as TeamRoles).freeKickRight)
              ? ((o.teamRoles as TeamRoles).freeKickRight as string[])
              : e.teamRoles.freeKickRight,
            freeKickLeft: Array.isArray((o.teamRoles as TeamRoles).freeKickLeft)
              ? ((o.teamRoles as TeamRoles).freeKickLeft as string[])
              : e.teamRoles.freeKickLeft,
            cornerRight: Array.isArray((o.teamRoles as TeamRoles).cornerRight)
              ? ((o.teamRoles as TeamRoles).cornerRight as string[])
              : e.teamRoles.cornerRight,
            cornerLeft: Array.isArray((o.teamRoles as TeamRoles).cornerLeft)
              ? ((o.teamRoles as TeamRoles).cornerLeft as string[])
              : e.teamRoles.cornerLeft,
          } satisfies TeamRoles)
        : e.teamRoles,
    conversations: Array.isArray(o.conversations) ? (o.conversations as Conversation[]) : e.conversations,
    messages:
      o.messages && typeof o.messages === "object" ? (o.messages as Record<string, Message[]>) : e.messages,
    trainingSessions: Array.isArray(o.trainingSessions)
      ? (o.trainingSessions as TrainingSession[])
      : e.trainingSessions,
    trainingPlayers:
      o.trainingPlayers && typeof o.trainingPlayers === "object"
        ? (o.trainingPlayers as Record<string, string[]>)
        : e.trainingPlayers,
    fixtures: Array.isArray(o.fixtures) ? (o.fixtures as MatchFixture[]) : e.fixtures,
    league: {
      url: typeof L.url === "string" ? L.url : e.league.url,
      rows: Array.isArray(L.rows) ? (L.rows as LeagueTableRow[]) : e.league.rows,
      matches: dedupeMatches(Array.isArray(L.matches) ? (L.matches as LeagueImportedMatch[]) : e.league.matches),
      competitionName: typeof L.competitionName === "string" ? L.competitionName : L.competitionName === null ? null : e.league.competitionName,
      lastFetched: typeof L.lastFetched === "string" ? L.lastFetched : L.lastFetched === null ? null : e.league.lastFetched,
      lastError: typeof L.lastError === "string" ? L.lastError : L.lastError === null ? null : e.league.lastError,
      setup:
        L.setup && typeof L.setup === "object"
          ? (L.setup as LeagueSetup)
          : L.setup === null
            ? null
            : e.league.setup,
      pastClubResults: Array.isArray(L.pastClubResults)
        ? (L.pastClubResults as PastClubResult[])
        : e.league.pastClubResults ?? [],
    },
    coachProfile:
      o.coachProfile && typeof o.coachProfile === "object"
        ? { ...e.coachProfile, ...(o.coachProfile as CoachProfileState) }
        : e.coachProfile,
    tactics: Array.isArray(o.tactics) ? (o.tactics as Tactic[]) : e.tactics,
    tacticMatches: Array.isArray(o.tacticMatches) ? (o.tacticMatches as TacticMatch[]) : e.tacticMatches,
    tacticPlayerNotes:
      o.tacticPlayerNotes && typeof o.tacticPlayerNotes === "object"
        ? (o.tacticPlayerNotes as Record<string, TacticPlayerAnalysisNote>)
        : e.tacticPlayerNotes,
    savedTrainingExercises: Array.isArray(o.savedTrainingExercises)
      ? (o.savedTrainingExercises as SavedTrainingExercise[])
      : e.savedTrainingExercises,
    sketchArea: mergeSketchArea(o.sketchArea, e.sketchArea),
    teamCallup: mergeTeamCallup(o.teamCallup, e.teamCallup),
  };
}

export function mergeSketchArea(raw: unknown, fallback: SketchAreaState): SketchAreaState {
  if (!raw || typeof raw !== "object") return fallback;
  const u = raw as Record<string, unknown>;
  const base = emptySketchAreaState();
  return {
    calendarEvents: Array.isArray(u.calendarEvents) ? (u.calendarEvents as SketchAreaState["calendarEvents"]) : base.calendarEvents,
    notes: Array.isArray(u.notes) ? (u.notes as SketchAreaState["notes"]) : base.notes,
    tasks: Array.isArray(u.tasks) ? (u.tasks as SketchAreaState["tasks"]) : base.tasks,
    files: Array.isArray(u.files) ? (u.files as SketchAreaState["files"]) : base.files,
    boardDrafts: Array.isArray(u.boardDrafts) ? (u.boardDrafts as SketchAreaState["boardDrafts"]) : base.boardDrafts,
    watchlist: Array.isArray(u.watchlist) ? (u.watchlist as SketchAreaState["watchlist"]) : base.watchlist,
  };
}
