import type {
  CoachProfileState,
  Conversation,
  LeagueImportedMatch,
  LeagueTableRow,
  MatchFixture,
  Message,
  Player,
  SavedTrainingExercise,
  SketchAreaState,
  Tactic,
  TacticMatch,
  TacticPlayerAnalysisNote,
  TrainingSession,
} from "@/types";
import { safeLoadJSON, safeSaveJSON } from "@/lib/coachbuilder-persist";
import { getAllUserDataKeys } from "@/lib/user-storage-keys";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import { emptySketchAreaState } from "@/lib/sketch-area";

export const WORKSPACE_SNAPSHOT_VERSION = 1 as const;

export type LeaguePersistSnapshot = {
  url: string;
  rows: LeagueTableRow[];
  matches: LeagueImportedMatch[];
  competitionName: string | null;
  lastFetched: string | null;
  lastError: string | null;
};

/** Payload guardado na BD e enviado pela API (versão explícita para migrações futuras). */
export type WorkspaceSnapshotV1 = {
  version: typeof WORKSPACE_SNAPSHOT_VERSION;
  players: Player[];
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
};

export function emptyWorkspaceSnapshot(): WorkspaceSnapshotV1 {
  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    players: [],
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
    },
    coachProfile: { name: "", club: "", role: "Head Coach", email: "" },
    tactics: [],
    tacticMatches: [],
    tacticPlayerNotes: {},
    savedTrainingExercises: [],
    sketchArea: emptySketchAreaState(),
  };
}

export function snapshotHasMeaningfulData(s: WorkspaceSnapshotV1 | null | undefined): boolean {
  if (!s) return false;
  if (s.players.length > 0) return true;
  if (s.tactics.length > 0) return true;
  if (s.tacticMatches.length > 0) return true;
  if (s.trainingSessions.length > 0) return true;
  if (s.fixtures.length > 0) return true;
  if (s.conversations.length > 1) return true;
  if (Object.keys(s.messages).length > 1) return true;
  if (s.league.matches.length > 0 || s.league.rows.length > 0) return true;
  if (s.coachProfile.name.trim() !== "" || s.coachProfile.club.trim() !== "") return true;
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
  return false;
}

/** Agrega o que está no `localStorage` para este `userId` (só no cliente). */
export function writeWorkspaceSnapshotToLocalStorage(userId: string, s: WorkspaceSnapshotV1): void {
  if (typeof window === "undefined") return;
  const ks = getAllUserDataKeys(userId);
  safeSaveJSON(ks.players, s.players);
  safeSaveJSON(ks.conversations, s.conversations);
  safeSaveJSON(ks.messages, s.messages);
  safeSaveJSON(ks.sessions, s.trainingSessions);
  safeSaveJSON(ks.trainingPlayers, s.trainingPlayers);
  safeSaveJSON(ks.fixtures, s.fixtures);
  safeSaveJSON(ks.league, s.league);
  safeSaveJSON(ks.coachProfile, s.coachProfile);
  safeSaveJSON(ks.tactics, s.tactics);
  safeSaveJSON(ks.tacticMatches, s.tacticMatches);
  safeSaveJSON(ks.tacticPlayerNotes, s.tacticPlayerNotes);
  safeSaveJSON(ks.savedTrainingExercises, s.savedTrainingExercises);
  safeSaveJSON(ks.sketchArea, s.sketchArea);
}

export function collectWorkspaceFromLocalStorage(userId: string): WorkspaceSnapshotV1 {
  if (typeof window === "undefined") return emptyWorkspaceSnapshot();
  const ks = getAllUserDataKeys(userId);
  const league = safeLoadJSON<Partial<LeaguePersistSnapshot>>(ks.league, {});
  return {
    version: WORKSPACE_SNAPSHOT_VERSION,
    players: safeLoadJSON<Player[]>(ks.players, []),
    conversations: safeLoadJSON<Conversation[]>(ks.conversations, []),
    messages: safeLoadJSON<Record<string, Message[]>>(ks.messages, {}),
    trainingSessions: safeLoadJSON<TrainingSession[]>(ks.sessions, []),
    trainingPlayers: safeLoadJSON<Record<string, string[]>>(ks.trainingPlayers, {}),
    fixtures: safeLoadJSON<MatchFixture[]>(ks.fixtures, []),
    league: {
      url: league.url ?? "",
      rows: league.rows ?? [],
      matches: dedupeMatches(league.matches ?? []),
      competitionName: league.competitionName ?? null,
      lastFetched: league.lastFetched ?? null,
      lastError: league.lastError ?? null,
    },
    coachProfile: {
      name: "",
      club: "",
      role: "Head Coach",
      email: "",
      ...safeLoadJSON<Partial<CoachProfileState>>(ks.coachProfile, {}),
    } satisfies CoachProfileState,
    tactics: safeLoadJSON<Tactic[]>(ks.tactics, []),
    tacticMatches: safeLoadJSON<TacticMatch[]>(ks.tacticMatches, []),
    tacticPlayerNotes: safeLoadJSON<Record<string, TacticPlayerAnalysisNote>>(ks.tacticPlayerNotes, {}),
    savedTrainingExercises: safeLoadJSON<SavedTrainingExercise[]>(ks.savedTrainingExercises, []),
    sketchArea: mergeSketchArea(safeLoadJSON<unknown>(ks.sketchArea, null), emptySketchAreaState()),
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
