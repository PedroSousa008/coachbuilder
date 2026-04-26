"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  ChatAttachment,
  CoachProfileState,
  Conversation,
  LeagueImportedMatch,
  LeagueTableRow,
  MatchFixture,
  Message,
  Player,
  Position,
  PreferredFoot,
  SketchAreaState,
  Tactic,
  TacticMatch,
  TacticPlayerAnalysisNote,
  NewSavedTrainingExerciseInput,
  SavedTrainingExercise,
  StaffMember,
  TeamDoubleRoleId,
  TeamRoles,
  TeamSingleRoleId,
  TeamCallupState,
  TrainingSession,
} from "@/types";
import { tallyForTactic } from "@/lib/tactics-match-stats";
import { mockCoach } from "@/data/mock";
import { clipPreviewLine, messagePreviewLine } from "@/lib/chat-attachments";
import { cloudDmConversationId } from "@/lib/dm-conversation-id";
import {
  ptGroupCreatedBody,
  ptGroupRenamePreview,
  ptMembersAddedBody,
  ptMembersAddedPreview,
  ptMemberCountSubtitle,
} from "@/lib/group-chat-messages-pt";
import { dedupeMatches } from "@/lib/league-match-dedupe";
import { formatPlayerPositions } from "@/lib/player-positions";
import {
  getAllUserDataKeys,
  mergeLegacyTacticsIfUserEmpty,
  migrateLegacyDataIfNeeded,
} from "@/lib/user-storage-keys";
import { safeLoadJSON, safeSaveJSON } from "@/lib/coachbuilder-persist";
import { isCloudSyncEnabledClient, shouldUseCloudClientApis } from "@/lib/cloud-config";
import {
  collectWorkspaceFromLocalStorage,
  mergeSketchArea,
  snapshotHasMeaningfulData,
  writeWorkspaceSnapshotToLocalStorage,
  type WorkspaceSnapshotV1,
} from "@/lib/workspace-snapshot";
import { buildWorkspaceSnapshotV1 } from "@/lib/build-workspace-snapshot";
import { emptySketchAreaState } from "@/lib/sketch-area";
import { emptyTeamCallupState, mergeTeamCallup } from "@/lib/team-callup";
import { useAuth } from "@/contexts/AuthContext";
import { withNormalizedCareerSeasonsInProfile } from "@/lib/coach-career-season-normalize";
import { withNormalizedHonorCategories } from "@/lib/coach-honor-migration";
import {
  isTrainingAgeGroupId,
  normalizeTrainingExerciseAgeMap,
} from "@/lib/training-age-groups";

function normalizeCoachProfileState(profile: CoachProfileState): CoachProfileState {
  const normalized = withNormalizedHonorCategories(withNormalizedCareerSeasonsInProfile(profile));
  const ageGroup = isTrainingAgeGroupId(normalized.trainingSquadAgeGroup)
    ? normalized.trainingSquadAgeGroup
    : "juvenil";
  const exerciseAgeMap = normalizeTrainingExerciseAgeMap(normalized.trainingExerciseAgeMap);
  return {
    ...normalized,
    trainingSquadAgeGroup: ageGroup,
    ...(exerciseAgeMap ? { trainingExerciseAgeMap: exerciseAgeMap } : {}),
  };
}

function tacticPlayerNoteKey(tacticId: string, playerId: string) {
  return `${tacticId}::${playerId}`;
}

const defaultCoachProfile = (): CoachProfileState => ({
  name: "",
  club: "",
  role: "Head Coach",
  email: "",
  trainingSquadAgeGroup: "juvenil",
});

/** Stable id for the default squad group chat (localStorage + UI). */
export const SQUAD_GROUP_ID = "conv-squad";

function loadJSON<T>(key: string, fallback: T): T {
  return safeLoadJSON(key, fallback);
}

function saveJSON(key: string, value: unknown) {
  safeSaveJSON(key, value);
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeMessages(a: Message[], b: Message[]): Message[] {
  const byId = new Map(a.map((m) => [m.id, m]));
  for (const m of b) {
    if (!byId.has(m.id)) byId.set(m.id, m);
  }
  return [...byId.values()].sort(
    (x, y) => new Date(x.sentAt).getTime() - new Date(y.sentAt).getTime()
  );
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return p
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

function defaultGroup(actorId: string): Conversation {
  return {
    id: SQUAD_GROUP_ID,
    type: "group",
    title: "Squad",
    subtitle: "Team channel",
    avatarInitials: "TM",
    lastMessagePreview: "Welcome your players when they join.",
    lastMessageAt: new Date().toISOString(),
    participantIds: [actorId],
    unread: 0,
  };
}

export type NewPlayerInput = {
  name: string;
  number: number;
  position: Position;
  /** Multi-position; defaults to `[position]` when omitted. */
  positions?: Position[];
  age: number;
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: PreferredFoot;
  availability: Player["availability"];
  performance: Player["performance"];
  dateOfBirth?: string;
};

export type NewStaffInput = {
  name: string;
  role: string;
  dateOfBirth?: string;
};

export type NewSessionInput = {
  title: string;
  date: string;
  durationMin: number;
  intensity: TrainingSession["intensity"];
  categories: TrainingSession["categories"];
  description: string;
};

export type NewFixtureInput = {
  opponent: string;
  competition: string;
  kickoff: string;
  venue: MatchFixture["venue"];
  notes?: string;
};

type LeaguePersist = {
  url: string;
  rows: LeagueTableRow[];
  matches: LeagueImportedMatch[];
  competitionName: string | null;
  lastFetched: string | null;
  lastError: string | null;
};

type AppDataContextValue = {
  hydrated: boolean;
  players: Player[];
  staff: StaffMember[];
  teamRoles: TeamRoles;
  addPlayer: (input: NewPlayerInput) => Player;
  updatePlayer: (id: string, patch: Partial<Omit<Player, "id">>) => void;
  removePlayer: (id: string) => void;
  addStaff: (input: NewStaffInput) => StaffMember;
  updateStaff: (id: string, patch: Partial<Omit<StaffMember, "id">>) => void;
  removeStaff: (id: string) => void;
  setTeamSingleRole: (role: TeamSingleRoleId, playerId: string | null) => void;
  setTeamDoubleRole: (role: TeamDoubleRoleId, playerIds: string[]) => void;

  conversations: Conversation[];
  /** Soma de `unread` por conversa (badge no header/sidebar). */
  unreadMessagesCount: number;
  messagesByConv: Record<string, Message[]>;
  /** Id da última mensagem lida por conversa (local); usado para abrir no primeiro não lido. */
  lastReadMessageByConv: Record<string, string>;
  createDmWithPlayer: (player: Player, opts?: { peerCloudUserId: string | null }) => string | null;
  createDmWithStaff: (member: StaffMember, opts?: { peerCloudUserId: string | null }) => string | null;
  addPlayerToGroupChat: (conversationId: string, player: Player) => void;
  createGroupConversation: (title: string, members: { participantId: string; name: string }[]) => string;
  updateGroupConversation: (conversationId: string, patch: { title?: string }) => Promise<void>;
  addParticipantsToGroupChat: (conversationId: string, members: { participantId: string; name: string }[]) => void;
  removeParticipantFromGroupChat: (conversationId: string, participantCloudId: string) => Promise<void>;
  setGroupAdmin: (conversationId: string, participantCloudId: string, isAdmin: boolean) => void;
  sendChatMessage: (conversationId: string, body: string, attachments?: ChatAttachment[]) => void;
  mergeRemoteDmMessages: (
    conversationId: string,
    incoming: Message[],
    opts?: { viewerActiveConversationId?: string | null }
  ) => void;
  hydrateDmThreadsFromCloud: (
    threads: Array<{ peerUserId: string; peerName: string; lastBody: string; lastAt: string }>
  ) => void;
  markConversationRead: (conversationId: string) => void;

  trainingSessions: TrainingSession[];
  addTrainingSession: (input: NewSessionInput) => TrainingSession;
  trainingPlayerIdsBySession: Record<string, string[]>;
  setTrainingSessionPlayerIds: (sessionId: string, playerIds: string[]) => void;

  savedTrainingExercises: SavedTrainingExercise[];
  addSavedTrainingExercise: (input: NewSavedTrainingExerciseInput) => SavedTrainingExercise;
  updateSavedTrainingExercise: (
    id: string,
    patch: Partial<Pick<SavedTrainingExercise, "category" | "coachNotes">>
  ) => void;
  removeSavedTrainingExercise: (id: string) => void;

  fixtures: MatchFixture[];
  addFixture: (input: NewFixtureInput) => MatchFixture;
  updateFixture: (id: string, patch: Partial<NewFixtureInput>) => void;
  removeFixture: (id: string) => void;

  leagueTableUrl: string;
  setLeagueTableUrl: (url: string) => void;
  leagueTableRows: LeagueTableRow[];
  leagueMatches: LeagueImportedMatch[];
  leagueCompetitionName: string | null;
  leagueTableLastFetched: string | null;
  leagueTableFetchError: string | null;
  refreshLeagueTable: (opts?: { html?: string }) => Promise<void>;

  coachProfile: CoachProfileState;
  setCoachProfile: (patch: Partial<CoachProfileState>) => void;

  savedTactics: Tactic[];
  upsertTactic: (tactic: Tactic) => void;
  deleteTactic: (id: string) => void;

  tacticMatches: TacticMatch[];
  upsertTacticMatch: (match: TacticMatch) => void;
  removeTacticMatch: (matchId: string) => void;

  tacticPlayerNotes: Record<string, TacticPlayerAnalysisNote>;
  setTacticPlayerAnalysisNote: (tacticId: string, playerId: string, notes: string) => void;

  sketchArea: SketchAreaState;
  setSketchArea: Dispatch<SetStateAction<SketchAreaState>>;

  teamCallup: TeamCallupState;
  setTeamCallup: Dispatch<SetStateAction<TeamCallupState>>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function defaultTeamRoles(): TeamRoles {
  return {
    captain: null,
    viceCaptain: null,
    thirdCaptain: null,
    fourthCaptain: null,
    penalties: [],
    freeKickRight: [],
    freeKickLeft: [],
    cornerRight: [],
    cornerLeft: [],
  };
}

function normalizeTeamRoles(raw: unknown): TeamRoles {
  const base = defaultTeamRoles();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<TeamRoles>;
  return {
    ...base,
    ...r,
    penalties: Array.isArray(r.penalties) ? r.penalties.slice(0, 2) : [],
    freeKickRight: Array.isArray(r.freeKickRight) ? r.freeKickRight.slice(0, 2) : [],
    freeKickLeft: Array.isArray(r.freeKickLeft) ? r.freeKickLeft.slice(0, 2) : [],
    cornerRight: Array.isArray(r.cornerRight) ? r.cornerRight.slice(0, 2) : [],
    cornerLeft: Array.isArray(r.cornerLeft) ? r.cornerLeft.slice(0, 2) : [],
  };
}

function isFpfResultadosUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("resultados.fpf.pt");
  } catch {
    return false;
  }
}

async function fetchFpfHtmlInBrowser(url: string): Promise<string> {
  const r = await fetch(url, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!r.ok) {
    throw new Error(`browser_fetch_${r.status}`);
  }
  return r.text();
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const ks = useMemo(() => (user?.id ? getAllUserDataKeys(user.id) : null), [user?.id]);

  const [hydrated, setHydrated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRoles>(() => defaultTeamRoles());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [lastReadMessageByConv, setLastReadMessageByConv] = useState<Record<string, string>>({});
  const messagesByConvRef = useRef(messagesByConv);
  messagesByConvRef.current = messagesByConv;
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [trainingPlayerIdsBySession, setTrainingPlayerIdsBySession] = useState<Record<string, string[]>>({});
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [leagueTableUrl, setLeagueTableUrlState] = useState("");
  const [leagueTableRows, setLeagueTableRows] = useState<LeagueTableRow[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<LeagueImportedMatch[]>([]);
  const [leagueCompetitionName, setLeagueCompetitionName] = useState<string | null>(null);
  const [leagueTableLastFetched, setLeagueTableLastFetched] = useState<string | null>(null);
  const [leagueTableFetchError, setLeagueTableFetchError] = useState<string | null>(null);
  /** After a browser CORS/network failure for FPF, avoid hammering our API with doomed server-side fetches. */
  const fpfSkipServerFetchRef = useRef(false);
  const fpfSkipServerFetchUrlRef = useRef<string>("");
  const [coachProfile, setCoachProfileState] = useState<CoachProfileState>(() =>
    normalizeCoachProfileState(defaultCoachProfile())
  );
  const [savedTactics, setSavedTactics] = useState<Tactic[]>([]);
  const [tacticMatches, setTacticMatches] = useState<TacticMatch[]>([]);
  const [tacticPlayerNotes, setTacticPlayerNotesState] = useState<Record<string, TacticPlayerAnalysisNote>>({});
  const [savedTrainingExercises, setSavedTrainingExercises] = useState<SavedTrainingExercise[]>([]);
  const [sketchArea, setSketchArea] = useState<SketchAreaState>(() => emptySketchAreaState());
  const [teamCallup, setTeamCallup] = useState<TeamCallupState>(() => emptyTeamCallupState());

  const [cloudRemoteReady, setCloudRemoteReady] = useState(() => !isCloudSyncEnabledClient());

  useEffect(() => {
    const t = leagueTableUrl.trim();
    if (fpfSkipServerFetchUrlRef.current !== t) {
      fpfSkipServerFetchUrlRef.current = t;
      fpfSkipServerFetchRef.current = false;
    }
  }, [leagueTableUrl]);

  useEffect(() => {
    if (!shouldUseCloudClientApis(user)) {
      setCloudRemoteReady(true);
      return;
    }
    if (!user?.id) {
      setCloudRemoteReady(true);
      return;
    }
    setCloudRemoteReady(false);
  }, [user?.id, user]);

  useEffect(() => {
    if (!authReady) return;

    if (!user?.id || !ks) {
      setPlayers([]);
      setStaff([]);
      setTeamRoles(defaultTeamRoles());
      setConversations([]);
      setMessagesByConv({});
      setLastReadMessageByConv({});
      setTrainingSessions([]);
      setTrainingPlayerIdsBySession({});
      setFixtures([]);
      setLeagueTableUrlState("");
      setLeagueTableRows([]);
      setLeagueMatches([]);
      setLeagueCompetitionName(null);
      setLeagueTableLastFetched(null);
      setLeagueTableFetchError(null);
      fpfSkipServerFetchRef.current = false;
      fpfSkipServerFetchUrlRef.current = "";
      setCoachProfileState(normalizeCoachProfileState(defaultCoachProfile()));
      setSavedTactics([]);
      setTacticMatches([]);
      setTacticPlayerNotesState({});
      setSavedTrainingExercises([]);
      setSketchArea(emptySketchAreaState());
      setTeamCallup(emptyTeamCallupState());
      setHydrated(true);
      return;
    }

    migrateLegacyDataIfNeeded(user.id);
    mergeLegacyTacticsIfUserEmpty(user.id);

    const loadedPlayers = loadJSON<Player[]>(ks.players, []);
    const loadedStaff = loadJSON<StaffMember[]>(ks.staff, []);
    const loadedTeamRoles = normalizeTeamRoles(loadJSON<unknown>(ks.teamRoles, defaultTeamRoles()));
    const actorId = user?.id ?? mockCoach.id;
    let loadedConvs = loadJSON<Conversation[]>(ks.conversations, []);
    if (!loadedConvs.some((c) => c.type === "group")) {
      loadedConvs = [defaultGroup(actorId), ...loadedConvs];
    }
    const loadedMsgs = loadJSON<Record<string, Message[]>>(ks.messages, {});
    if (!loadedMsgs[SQUAD_GROUP_ID]) {
      loadedMsgs[SQUAD_GROUP_ID] = [];
    }
    setPlayers(loadedPlayers);
    setStaff(loadedStaff);
    setTeamRoles(loadedTeamRoles);
    setConversations(loadedConvs);
    setMessagesByConv(loadedMsgs);
    setLastReadMessageByConv(loadJSON<Record<string, string>>(ks.conversationLastReadMessageIds, {}));
    setTrainingSessions(loadJSON<TrainingSession[]>(ks.sessions, []));
    setTrainingPlayerIdsBySession(loadJSON<Record<string, string[]>>(ks.trainingPlayers, {}));
    setFixtures(loadJSON<MatchFixture[]>(ks.fixtures, []));
    setCoachProfileState(
      normalizeCoachProfileState({
        ...defaultCoachProfile(),
        ...loadJSON<Partial<CoachProfileState>>(ks.coachProfile, {}),
      } as CoachProfileState)
    );
    const league = loadJSON<Partial<LeaguePersist>>(ks.league, {});
    setLeagueTableUrlState(league.url ?? "");
    setLeagueTableRows(league.rows ?? []);
    setLeagueMatches(dedupeMatches(league.matches ?? []));
    setLeagueCompetitionName(league.competitionName ?? null);
    setLeagueTableLastFetched(league.lastFetched ?? null);
    setLeagueTableFetchError(league.lastError ?? null);
    setSavedTactics(loadJSON<Tactic[]>(ks.tactics, []));
    setTacticMatches(loadJSON<TacticMatch[]>(ks.tacticMatches, []));
    setTacticPlayerNotesState(loadJSON<Record<string, TacticPlayerAnalysisNote>>(ks.tacticPlayerNotes, {}));
    setSavedTrainingExercises(loadJSON<SavedTrainingExercise[]>(ks.savedTrainingExercises, []));
    setSketchArea(mergeSketchArea(loadJSON<unknown>(ks.sketchArea, null), emptySketchAreaState()));
    setTeamCallup(mergeTeamCallup(loadJSON<unknown>(ks.teamCallup, null), emptyTeamCallupState()));
    setHydrated(true);
  }, [authReady, user?.id, ks]);

  useEffect(() => {
    if (!shouldUseCloudClientApis(user) || !authReady || !user?.id || !ks || !hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cloud/workspace", { credentials: "include" });
        const data = (await res.json()) as {
          ok?: boolean;
          payload?: WorkspaceSnapshotV1 | null;
        };
        if (cancelled) return;
        if (res.ok && data.ok && data.payload && snapshotHasMeaningfulData(data.payload)) {
          const s = data.payload;
          const actorIdCloud = user?.id ?? mockCoach.id;
          let loadedConvs = s.conversations;
          if (!loadedConvs.some((c) => c.type === "group")) {
            loadedConvs = [defaultGroup(actorIdCloud), ...loadedConvs];
          }
          const loadedMsgs = { ...s.messages };
          if (!loadedMsgs[SQUAD_GROUP_ID]) loadedMsgs[SQUAD_GROUP_ID] = [];
          const leagueMatchesDeduped = dedupeMatches(s.league.matches ?? []);
          setPlayers(s.players);
          setStaff(s.staff ?? []);
          setTeamRoles(normalizeTeamRoles(s.teamRoles));
          setConversations(loadedConvs);
          setMessagesByConv(loadedMsgs);
          setTrainingSessions(s.trainingSessions);
          setTrainingPlayerIdsBySession(s.trainingPlayers);
          setFixtures(s.fixtures);
          setCoachProfileState(
            normalizeCoachProfileState({ ...defaultCoachProfile(), ...s.coachProfile } as CoachProfileState)
          );
          setLeagueTableUrlState(s.league.url ?? "");
          setLeagueTableRows(s.league.rows ?? []);
          setLeagueMatches(leagueMatchesDeduped);
          setLeagueCompetitionName(s.league.competitionName ?? null);
          setLeagueTableLastFetched(s.league.lastFetched ?? null);
          setLeagueTableFetchError(s.league.lastError ?? null);
          setSavedTactics(s.tactics);
          setTacticMatches(s.tacticMatches);
          setTacticPlayerNotesState(s.tacticPlayerNotes);
          setSavedTrainingExercises(s.savedTrainingExercises ?? []);
          setSketchArea(mergeSketchArea(s.sketchArea, emptySketchAreaState()));
          const mergedCallup = mergeTeamCallup((s as Partial<{ teamCallup?: unknown }>).teamCallup, emptyTeamCallupState());
          setTeamCallup(mergedCallup);
          writeWorkspaceSnapshotToLocalStorage(user.id, {
            ...s,
            conversations: loadedConvs,
            messages: loadedMsgs,
            league: {
              ...s.league,
              matches: leagueMatchesDeduped,
            },
            savedTrainingExercises: s.savedTrainingExercises ?? [],
            sketchArea: mergeSketchArea(s.sketchArea, emptySketchAreaState()),
            teamCallup: mergedCallup,
          });
        } else {
          const local = collectWorkspaceFromLocalStorage(user.id);
          if (snapshotHasMeaningfulData(local)) {
            await fetch("/api/cloud/workspace", {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payload: local }),
            });
          }
        }
      } finally {
        if (!cancelled) setCloudRemoteReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, ks, hydrated]);

  useEffect(() => {
    if (!shouldUseCloudClientApis(user) || !cloudRemoteReady || !hydrated || !user?.id) return;
    const snap: WorkspaceSnapshotV1 = buildWorkspaceSnapshotV1({
      players,
      staff,
      teamRoles,
      conversations,
      messagesByConv,
      trainingSessions,
      trainingPlayerIdsBySession,
      fixtures,
      leagueTableUrl,
      leagueTableRows,
      leagueMatches,
      leagueCompetitionName,
      leagueTableLastFetched,
      leagueTableFetchError,
      coachProfile,
      savedTactics,
      tacticMatches,
      tacticPlayerNotes,
      savedTrainingExercises,
      sketchArea,
      teamCallup,
    });
    const t = window.setTimeout(() => {
      void fetch("/api/cloud/workspace", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: snap }),
      });
    }, 2200);
    return () => window.clearTimeout(t);
  }, [
    cloudRemoteReady,
    hydrated,
    user?.id,
    players,
    staff,
    teamRoles,
    conversations,
    messagesByConv,
    trainingSessions,
    trainingPlayerIdsBySession,
    fixtures,
    leagueTableUrl,
    leagueTableRows,
    leagueMatches,
    leagueCompetitionName,
    leagueTableLastFetched,
    leagueTableFetchError,
    coachProfile,
    savedTactics,
    tacticMatches,
    tacticPlayerNotes,
    savedTrainingExercises,
    sketchArea,
    teamCallup,
  ]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.players, players);
  }, [players, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.staff, staff);
  }, [staff, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.teamRoles, teamRoles);
  }, [teamRoles, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.conversations, conversations);
  }, [conversations, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.messages, messagesByConv);
  }, [messagesByConv, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.conversationLastReadMessageIds, lastReadMessageByConv);
  }, [lastReadMessageByConv, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.sessions, trainingSessions);
  }, [trainingSessions, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.trainingPlayers, trainingPlayerIdsBySession);
  }, [trainingPlayerIdsBySession, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.fixtures, fixtures);
  }, [fixtures, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.league, {
      url: leagueTableUrl,
      rows: leagueTableRows,
      matches: leagueMatches,
      competitionName: leagueCompetitionName,
      lastFetched: leagueTableLastFetched,
      lastError: leagueTableFetchError,
    } satisfies LeaguePersist);
  }, [
    hydrated,
    ks,
    leagueTableUrl,
    leagueTableRows,
    leagueMatches,
    leagueCompetitionName,
    leagueTableLastFetched,
    leagueTableFetchError,
  ]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.coachProfile, coachProfile);
  }, [coachProfile, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.tactics, savedTactics);
  }, [savedTactics, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.tacticMatches, tacticMatches);
  }, [tacticMatches, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.tacticPlayerNotes, tacticPlayerNotes);
  }, [tacticPlayerNotes, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.savedTrainingExercises, savedTrainingExercises);
  }, [savedTrainingExercises, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.sketchArea, sketchArea);
  }, [sketchArea, hydrated, ks]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.teamCallup, teamCallup);
  }, [teamCallup, hydrated, ks]);

  /** Mantém `matchesUsed` / vitórias / empates / derrotas nas táticas alinhados com os jogos registados. */
  useEffect(() => {
    if (!hydrated || !ks) return;
    setSavedTactics((prev) =>
      prev.map((t) => {
        const tally = tallyForTactic(tacticMatches, t.id);
        return {
          ...t,
          matchesUsed: tally.matchesUsed,
          wins: tally.wins,
          losses: tally.losses,
          draws: tally.draws,
        };
      })
    );
  }, [tacticMatches, hydrated]);

  const upsertTactic = useCallback((tactic: Tactic) => {
    setSavedTactics((prev) => {
      const i = prev.findIndex((t) => t.id === tactic.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = tactic;
        return next;
      }
      return [...prev, tactic];
    });
  }, []);

  const deleteTactic = useCallback((id: string) => {
    setSavedTactics((prev) => prev.filter((t) => t.id !== id));
    setTacticMatches((prev) => prev.filter((m) => m.tacticId !== id));
    setTacticPlayerNotesState((prev) => {
      const prefix = `${id}::`;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      return next;
    });
  }, []);

  const upsertTacticMatch = useCallback((match: TacticMatch) => {
    setTacticMatches((prev) => {
      const i = prev.findIndex((m) => m.id === match.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = match;
        return next;
      }
      return [...prev, match];
    });
  }, []);

  const removeTacticMatch = useCallback((matchId: string) => {
    setTacticMatches((prev) => prev.filter((m) => m.id !== matchId));
  }, []);

  const setTacticPlayerAnalysisNote = useCallback((tacticId: string, playerId: string, notes: string) => {
    const key = tacticPlayerNoteKey(tacticId, playerId);
    const trimmed = notes.trim();
    setTacticPlayerNotesState((prev) => {
      if (!trimmed) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: {
          tacticId,
          playerId,
          notes: trimmed,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  }, []);

  const addPlayer = useCallback((input: NewPlayerInput) => {
    const posList = input.positions?.length ? [...input.positions] : [input.position];
    const p: Player = {
      id: uid("pl"),
      name: input.name.trim(),
      number: input.number,
      position: posList[0]!,
      positions: posList.length > 1 ? posList : undefined,
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      preferredFoot: input.preferredFoot,
      availability: input.availability,
      performance: input.performance,
      dateOfBirth: input.dateOfBirth,
    };
    setPlayers((prev) => [...prev, p]);
    return p;
  }, []);

  const addStaff = useCallback((input: NewStaffInput) => {
    const s: StaffMember = {
      id: uid("stf"),
      name: input.name.trim(),
      role: input.role.trim() || "Staff",
      dateOfBirth: input.dateOfBirth,
    };
    setStaff((prev) => [...prev, s]);
    return s;
  }, []);

  const updateStaff = useCallback((id: string, patch: Partial<Omit<StaffMember, "id">>) => {
    setStaff((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const removeStaff = useCallback((id: string) => {
    setStaff((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const updatePlayer = useCallback((id: string, patch: Partial<Omit<Player, "id">>) => {
    setPlayers((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  const removePlayer = useCallback((id: string) => {
    setPlayers((prev) => prev.filter((x) => x.id !== id));
    setTrainingPlayerIdsBySession((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = next[k].filter((pid) => pid !== id);
      }
      return next;
    });
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        participantIds: c.participantIds.filter((pid) => pid !== id),
      }))
    );
    setTeamRoles((prev) => ({
      captain: prev.captain === id ? null : prev.captain,
      viceCaptain: prev.viceCaptain === id ? null : prev.viceCaptain,
      thirdCaptain: prev.thirdCaptain === id ? null : prev.thirdCaptain,
      fourthCaptain: prev.fourthCaptain === id ? null : prev.fourthCaptain,
      penalties: prev.penalties.filter((pid) => pid !== id),
      freeKickRight: prev.freeKickRight.filter((pid) => pid !== id),
      freeKickLeft: prev.freeKickLeft.filter((pid) => pid !== id),
      cornerRight: prev.cornerRight.filter((pid) => pid !== id),
      cornerLeft: prev.cornerLeft.filter((pid) => pid !== id),
    }));
  }, []);

  const setTeamSingleRole = useCallback((role: TeamSingleRoleId, playerId: string | null) => {
    setTeamRoles((prev) => ({ ...prev, [role]: playerId }));
  }, []);

  const setTeamDoubleRole = useCallback((role: TeamDoubleRoleId, playerIds: string[]) => {
    setTeamRoles((prev) => ({ ...prev, [role]: playerIds.slice(0, 2) }));
  }, []);

  const mergeRemoteDmMessages = useCallback(
    (conversationId: string, incoming: Message[], opts?: { viewerActiveConversationId?: string | null }) => {
      if (incoming.length === 0) return;
      const actorId = user?.id ?? mockCoach.id;
      const viewerActive = opts?.viewerActiveConversationId ?? null;
      setMessagesByConv((prev) => {
        const cur = prev[conversationId] ?? [];
        const existingIds = new Set(cur.map((m) => m.id));
        const newMsgs = incoming.filter((m) => !existingIds.has(m.id));
        const merged = mergeMessages(cur, incoming);
        const last = merged[merged.length - 1]!;
        const preview = clipPreviewLine(messagePreviewLine(last.body, last.attachments));
        const newFromOthers = newMsgs.filter((m) => m.authorId !== actorId);
        const bumpUnread = newFromOthers.length > 0 && viewerActive !== conversationId;

        setConversations((prevConvs) =>
          prevConvs.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              lastMessagePreview: preview,
              lastMessageAt: last.sentAt,
              ...(bumpUnread ? { unread: (c.unread ?? 0) + newFromOthers.length } : {}),
            };
          })
        );

        return { ...prev, [conversationId]: merged };
      });
    },
    [user?.id]
  );

  const hydrateDmThreadsFromCloud = useCallback(
    (threads: Array<{ peerUserId: string; peerName: string; lastBody: string; lastAt: string }>) => {
      const uidSelf = user?.id;
      if (!uidSelf) return;
      setConversations((prev) => {
        let next = [...prev];
        for (const t of threads) {
          const id = cloudDmConversationId(uidSelf, t.peerUserId);
          const idx = next.findIndex((c) => c.id === id);
          const conv: Conversation = {
            id,
            type: "dm",
            title: t.peerName,
            avatarInitials: initials(t.peerName),
            lastMessagePreview: t.lastBody.length > 72 ? `${t.lastBody.slice(0, 72)}…` : t.lastBody,
            lastMessageAt: t.lastAt,
            participantIds: [uidSelf, t.peerUserId],
          };
          if (idx < 0) next.push(conv);
          else {
            const cur = next[idx]!;
            if (new Date(t.lastAt).getTime() >= new Date(cur.lastMessageAt).getTime()) {
              next[idx] = { ...cur, ...conv };
            }
          }
        }
        return next;
      });
      setMessagesByConv((prev) => {
        const next = { ...prev };
        for (const t of threads) {
          const id = cloudDmConversationId(uidSelf, t.peerUserId);
          if (!next[id]) next[id] = [];
        }
        return next;
      });
    },
    [user?.id]
  );

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))
    );
    const msgs = messagesByConvRef.current[conversationId];
    if (!msgs?.length) return;
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
    const last = sorted[sorted.length - 1]!;
    setLastReadMessageByConv((prev) => ({ ...prev, [conversationId]: last.id }));
  }, []);

  const createGroupConversation = useCallback(
    (titleRaw: string, members: { participantId: string; name: string }[]) => {
      const id = uid("conv-group");
      const actorId = user?.id ?? mockCoach.id;
      const title = titleRaw.trim() || "Grupo";
      const now = new Date().toISOString();
      const names = members.map((m) => m.name);
      const participantIds = Array.from(new Set([actorId, ...members.map((m) => m.participantId)]));
      const memberMeta: Record<string, { addedById: string; joinedAt: string }> = {};
      for (const m of members) {
        memberMeta[m.participantId] = { addedById: actorId, joinedAt: now };
      }
      const createdBody = ptGroupCreatedBody(title, names);
      const conv: Conversation = {
        id,
        type: "group",
        title,
        createdById: actorId,
        groupPrimaryAdminId: actorId,
        groupAdminIds: [actorId],
        groupMemberMeta: memberMeta,
        subtitle: ptMemberCountSubtitle(participantIds.length),
        avatarInitials: initials(title),
        lastMessagePreview: clipPreviewLine(createdBody),
        lastMessageAt: now,
        participantIds,
        titleUpdatedAt: now,
        unread: 0,
      };
      const systemMsg: Message = {
        id: uid("m"),
        conversationId: id,
        authorId: actorId,
        authorName: coachProfile.name.trim() || mockCoach.name || "Coach",
        body: createdBody,
        sentAt: now,
        system: true,
      };
      setConversations((prev) => [...prev, conv]);
      setMessagesByConv((prev) => ({ ...prev, [id]: [systemMsg] }));

      if (shouldUseCloudClientApis(user) && members.length > 0) {
        queueMicrotask(() => {
          void fetch("/api/cloud/chat/group/sync", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation: conv, messages: [systemMsg] }),
          });
        });
      }
      return id;
    },
    [coachProfile.name, user, user?.id]
  );

  const updateGroupConversation = useCallback(
    async (conversationId: string, patch: { title?: string }) => {
      const title = patch.title?.trim();
      if (!title) return;
      const actorId = user?.id ?? mockCoach.id;
      if (shouldUseCloudClientApis(user)) {
        try {
          const res = await fetch("/api/cloud/chat/group/rename", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, title }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            conversation?: Conversation;
            message?: Message;
          };
          if (res.ok && data.ok && data.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === conversationId ? data.conversation! : c)));
            if (data.message) {
              setMessagesByConv((prev) => ({
                ...prev,
                [conversationId]: mergeMessages(prev[conversationId] ?? [], [data.message!]),
              }));
            }
            return;
          }
        } catch {
          /* local fallback */
        }
      }
      const now = new Date().toISOString();
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId && c.type === "group"
            ? {
                ...c,
                title,
                titleUpdatedAt: now,
                avatarInitials: initials(title),
                lastMessageAt: now,
                lastMessagePreview: ptGroupRenamePreview(title),
              }
            : c
        )
      );
      const msg: Message = {
        id: uid("m"),
        conversationId,
        authorId: actorId,
        authorName: coachProfile.name.trim() || mockCoach.name || "Coach",
        body: `O grupo foi renomeado para «${title}».`,
        sentAt: now,
        system: true,
      };
      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: mergeMessages(prev[conversationId] ?? [], [msg]),
      }));
    },
    [coachProfile.name, user, user?.id]
  );

  const addParticipantsToGroupChat = useCallback(
    (conversationId: string, members: { participantId: string; name: string }[]) => {
      if (members.length === 0) return;
      const actorId = user?.id ?? mockCoach.id;
      const now = new Date().toISOString();
      const addedNames = members.map((m) => m.name);
      const sys: Message = {
        id: uid("m"),
        conversationId,
        authorId: actorId,
        authorName: coachProfile.name.trim() || mockCoach.name || "Coach",
        body: ptMembersAddedBody(addedNames),
        sentAt: now,
        system: true,
      };

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId && c.type === "group");
        if (idx < 0) return prev;
        const c = prev[idx]!;
        const nextIds = Array.from(new Set([...c.participantIds, ...members.map((m) => m.participantId)]));
        const meta = { ...(c.groupMemberMeta ?? {}) };
        for (const m of members) {
          meta[m.participantId] = { addedById: actorId, joinedAt: now };
        }
        const nextConv: Conversation = {
          ...c,
          participantIds: nextIds,
          groupMemberMeta: meta,
          subtitle: ptMemberCountSubtitle(nextIds.length),
          lastMessageAt: now,
          lastMessagePreview: clipPreviewLine(ptMembersAddedPreview(addedNames)),
        };
        if (shouldUseCloudClientApis(user)) {
          queueMicrotask(() => {
            void fetch("/api/cloud/chat/group/sync", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation: nextConv, messages: [sys] }),
            });
          });
        }
        const next = [...prev];
        next[idx] = nextConv;
        return next;
      });

      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: mergeMessages(prev[conversationId] ?? [], [sys]),
      }));
    },
    [coachProfile.name, user, user?.id]
  );

  const removeParticipantFromGroupChat = useCallback(
    async (conversationId: string, participantCloudId: string) => {
      if (shouldUseCloudClientApis(user)) {
        try {
          const res = await fetch("/api/cloud/chat/group/remove-member", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, participantId: participantCloudId }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            conversation?: Conversation;
            message?: Message;
          };
          if (res.ok && data.ok && data.conversation) {
            setConversations((prev) => prev.map((c) => (c.id === conversationId ? data.conversation! : c)));
            if (data.message) {
              setMessagesByConv((prev) => ({
                ...prev,
                [conversationId]: mergeMessages(prev[conversationId] ?? [], [data.message!]),
              }));
            }
            return;
          }
        } catch {
          /* local fallback */
        }
      }
      const now = new Date().toISOString();
      const actorId = user?.id ?? mockCoach.id;
      setConversations((prev) =>
        prev
          .map((c) => {
            if (c.id !== conversationId || c.type !== "group") return c;
            if (!c.participantIds.includes(participantCloudId)) return c;
            const nextIds = c.participantIds.filter((id) => id !== participantCloudId);
            const meta = { ...(c.groupMemberMeta ?? {}) };
            delete meta[participantCloudId];
            const nextAdmins = (c.groupAdminIds ?? []).filter((id) => id !== participantCloudId);
            const nextPrimary =
              c.groupPrimaryAdminId === participantCloudId
                ? (nextIds[0] ?? actorId)
                : c.groupPrimaryAdminId;
            return {
              ...c,
              participantIds: nextIds,
              groupMemberMeta: meta,
              groupAdminIds: nextAdmins,
              groupPrimaryAdminId: nextPrimary,
              subtitle: ptMemberCountSubtitle(nextIds.length),
              lastMessageAt: now,
              lastMessagePreview: "Um membro foi removido do grupo.",
            };
          })
          .filter((c) => {
            if (c.id !== conversationId || c.type !== "group") return true;
            return c.participantIds.length > 0;
          })
      );
      const msg: Message = {
        id: uid("m"),
        conversationId,
        authorId: actorId,
        authorName: coachProfile.name.trim() || mockCoach.name || "Coach",
        body: "Um membro foi removido do grupo.",
        sentAt: now,
        system: true,
      };
      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: mergeMessages(prev[conversationId] ?? [], [msg]),
      }));
    },
    [coachProfile.name, user, user?.id]
  );

  const setGroupAdmin = useCallback(
    (conversationId: string, participantCloudId: string, isAdmin: boolean) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId && c.type === "group");
        if (idx < 0) return prev;
        const c = prev[idx]!;
        if (c.groupPrimaryAdminId === participantCloudId && !isAdmin) return prev;
        let nextAdmins = [...(c.groupAdminIds ?? [])];
        if (isAdmin) {
          if (!nextAdmins.includes(participantCloudId)) nextAdmins.push(participantCloudId);
        } else {
          nextAdmins = nextAdmins.filter((id) => id !== participantCloudId);
        }
        const nextConv: Conversation = { ...c, groupAdminIds: nextAdmins };
        if (shouldUseCloudClientApis(user)) {
          queueMicrotask(() => {
            void fetch("/api/cloud/chat/group/sync", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation: nextConv, messages: [] }),
            });
          });
        }
        const next = [...prev];
        next[idx] = nextConv;
        return next;
      });
    },
    [user, user?.id]
  );

  const createDmWithPlayer = useCallback(
    (player: Player, opts?: { peerCloudUserId: string | null }) => {
      const peer = opts?.peerCloudUserId ?? null;
      const actorId = user?.id ?? mockCoach.id;
      if (shouldUseCloudClientApis(user) && user?.id) {
        if (!peer) return null;
        const id = cloudDmConversationId(user.id, peer);
        setConversations((prev) => {
          if (prev.some((c) => c.id === id)) return prev;
          const conv: Conversation = {
            id,
            type: "dm",
            title: player.name,
            subtitle: `${formatPlayerPositions(player)} · #${player.number}`,
            avatarInitials: initials(player.name),
            lastMessagePreview: "No messages yet",
            lastMessageAt: new Date().toISOString(),
            participantIds: [user.id, peer],
          };
          return [...prev, conv];
        });
        setMessagesByConv((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
        return id;
      }
      const id = `conv-dm-${player.id}`;
      setConversations((prev) => {
        if (prev.some((c) => c.id === id)) return prev;
        const conv: Conversation = {
          id,
          type: "dm",
          title: player.name,
          subtitle: `${formatPlayerPositions(player)} · #${player.number}`,
          avatarInitials: initials(player.name),
          lastMessagePreview: "No messages yet",
          lastMessageAt: new Date().toISOString(),
          participantIds: [actorId, player.id],
        };
        return [...prev, conv];
      });
      setMessagesByConv((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
      return id;
    },
    [user, user?.id]
  );

  const createDmWithStaff = useCallback(
    (member: StaffMember, opts?: { peerCloudUserId: string | null }) => {
      const peer = opts?.peerCloudUserId ?? null;
      const actorId = user?.id ?? mockCoach.id;
      const roleLine = member.role.trim() || "Staff";
      if (shouldUseCloudClientApis(user) && user?.id) {
        if (!peer) return null;
        const id = cloudDmConversationId(user.id, peer);
        setConversations((prev) => {
          if (prev.some((c) => c.id === id)) return prev;
          const conv: Conversation = {
            id,
            type: "dm",
            title: member.name,
            subtitle: roleLine,
            avatarInitials: initials(member.name),
            lastMessagePreview: "No messages yet",
            lastMessageAt: new Date().toISOString(),
            participantIds: [user.id, peer],
          };
          return [...prev, conv];
        });
        setMessagesByConv((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
        return id;
      }
      const id = `conv-dm-${member.id}`;
      setConversations((prev) => {
        if (prev.some((c) => c.id === id)) return prev;
        const conv: Conversation = {
          id,
          type: "dm",
          title: member.name,
          subtitle: roleLine,
          avatarInitials: initials(member.name),
          lastMessagePreview: "No messages yet",
          lastMessageAt: new Date().toISOString(),
          participantIds: [actorId, member.id],
        };
        return [...prev, conv];
      });
      setMessagesByConv((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
      return id;
    },
    [user, user?.id]
  );

  const addPlayerToGroupChat = useCallback((conversationId: string, player: Player) => {
    const actorId = user?.id ?? mockCoach.id;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId || c.type !== "group") return c;
        if (c.participantIds.includes(player.id)) return c;
        const nextIds = [...c.participantIds, player.id];
        return {
          ...c,
          participantIds: nextIds,
          subtitle: `${nextIds.length} members`,
          lastMessagePreview: `${player.name} added to the channel`,
          lastMessageAt: new Date().toISOString(),
        };
      })
    );
    const sysBody = `${player.name} was added to the squad channel.`;
    const msg: Message = {
      id: uid("m"),
      conversationId,
      authorId: actorId,
      authorName: mockCoach.name.trim() || "Coach",
      body: sysBody,
      sentAt: new Date().toISOString(),
    };
    setMessagesByConv((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));
  }, [user?.id]);

  const sendChatMessage = useCallback(
    (conversationId: string, body: string, attachments?: ChatAttachment[]) => {
      const trimmed = body.trim();
      const hasAttach = Boolean(attachments?.length);
      if (!trimmed && !hasAttach) return;
      const actorId = user?.id ?? mockCoach.id;
      const authorName = coachProfile.name.trim() || mockCoach.name || "Coach";
      const preview = clipPreviewLine(messagePreviewLine(trimmed, attachments));
      const msg: Message = {
        id: uid("m"),
        conversationId,
        authorId: actorId,
        authorName,
        body: trimmed,
        sentAt: new Date().toISOString(),
        ...(attachments?.length ? { attachments } : {}),
      };

      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] ?? []), msg],
      }));

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        const cur = idx >= 0 ? prev[idx] : undefined;
        if (cur?.type === "group" && shouldUseCloudClientApis(user)) {
          const nextConv: Conversation = {
            ...cur,
            lastMessagePreview: preview,
            lastMessageAt: msg.sentAt,
          };
          queueMicrotask(() => {
            void fetch("/api/cloud/chat/group/sync", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation: nextConv, messages: [msg] }),
            });
          });
        }
        return prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessagePreview: preview,
                lastMessageAt: msg.sentAt,
              }
            : c
        );
      });
    },
    [coachProfile.name, user, user?.id]
  );

  const addTrainingSession = useCallback((input: NewSessionInput) => {
    const s: TrainingSession = {
      id: uid("sess"),
      title: input.title.trim(),
      date: input.date,
      durationMin: input.durationMin,
      intensity: input.intensity,
      categories: input.categories,
      description: input.description.trim(),
    };
    setTrainingSessions((prev) => [s, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return s;
  }, []);

  const setTrainingSessionPlayerIds = useCallback((sessionId: string, playerIds: string[]) => {
    setTrainingPlayerIdsBySession((prev) => ({ ...prev, [sessionId]: playerIds }));
  }, []);

  const addSavedTrainingExercise = useCallback((input: NewSavedTrainingExerciseInput) => {
    const now = new Date().toISOString();
    const row: SavedTrainingExercise = {
      id: uid("svtex"),
      title: input.title.trim(),
      category: input.category,
      coachNotes: "",
      createdAt: now,
      updatedAt: now,
      durationMin: input.durationMin,
      description: input.description,
      coachingPoints: input.coachingPoints,
      setup: input.setup,
      groupSplit: input.groupSplit,
      diagramHint: input.diagramHint,
      videoUrl: input.videoUrl,
      progression: input.progression,
      variations: input.variations,
      objective: input.objective,
      sourcePhase: input.sourcePhase,
    };
    setSavedTrainingExercises((prev) => [row, ...prev]);
    return row;
  }, []);

  const updateSavedTrainingExercise = useCallback(
    (id: string, patch: Partial<Pick<SavedTrainingExercise, "category" | "coachNotes">>) => {
      setSavedTrainingExercises((prev) =>
        prev.map((x) => {
          if (x.id !== id) return x;
          return {
            ...x,
            ...(patch.coachNotes !== undefined ? { coachNotes: patch.coachNotes } : {}),
            ...(patch.category !== undefined ? { category: patch.category } : {}),
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const removeSavedTrainingExercise = useCallback((id: string) => {
    setSavedTrainingExercises((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const addFixture = useCallback((input: NewFixtureInput) => {
    const f: MatchFixture = {
      id: uid("fx"),
      opponent: input.opponent.trim(),
      competition: input.competition.trim(),
      kickoff: input.kickoff,
      venue: input.venue,
      notes: input.notes?.trim() || undefined,
    };
    setFixtures((prev) =>
      [...prev, f].sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    );
    return f;
  }, []);

  const updateFixture = useCallback((id: string, patch: Partial<NewFixtureInput>) => {
    setFixtures((prev) =>
      prev
        .map((x) =>
          x.id === id
            ? {
                ...x,
                ...patch,
                opponent: patch.opponent !== undefined ? patch.opponent.trim() : x.opponent,
                competition: patch.competition !== undefined ? patch.competition.trim() : x.competition,
                notes: patch.notes !== undefined ? patch.notes.trim() || undefined : x.notes,
              }
            : x
        )
        .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    );
  }, []);

  const removeFixture = useCallback((id: string) => {
    setFixtures((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setLeagueTableUrl = useCallback((url: string) => {
    setLeagueTableUrlState(url);
  }, []);

  const setCoachProfile = useCallback((patch: Partial<CoachProfileState>) => {
    setCoachProfileState((prev) => normalizeCoachProfileState({ ...prev, ...patch }));
  }, []);

  const refreshLeagueTable = useCallback(async (opts?: { html?: string }) => {
    const u = leagueTableUrl.trim();
    if (!u) {
      setLeagueTableFetchError("Paste a standings page URL first.");
      return;
    }
    setLeagueTableFetchError(null);
    try {
      const pasted = typeof opts?.html === "string" ? opts.html.trim() : "";
      if (pasted) {
        fpfSkipServerFetchRef.current = false;
      }

      let htmlForPost: string | undefined;

      if (pasted) {
        htmlForPost = pasted;
      } else if (isFpfResultadosUrl(u) && !fpfSkipServerFetchRef.current) {
        try {
          htmlForPost = await fetchFpfHtmlInBrowser(u);
        } catch {
          // Likely CORS or network — fall back to server fetch once per URL (unless skipped).
        }
      }

      if (!htmlForPost && isFpfResultadosUrl(u) && fpfSkipServerFetchRef.current) {
        setLeagueTableFetchError(
          "FPF blocked server fetch (HTTP 403) and the browser cannot read the page cross-origin. Open the competition URL in your browser, copy the full page HTML (View Page Source), and use “Import from pasted HTML” on the calendar page."
        );
        return;
      }

      const res = await fetch("/api/league-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(htmlForPost ? { url: u, html: htmlForPost } : { url: u }),
      });
      let data: {
        ok?: boolean;
        error?: string;
        upstreamStatus?: number;
        rows?: LeagueTableRow[];
        matches?: LeagueImportedMatch[];
        competitionName?: string;
        fetchedAt?: string;
      };
      try {
        data = await res.json();
      } catch {
        setLeagueTableFetchError("Could not read server response — try again.");
        return;
      }
      if (!data.ok) {
        const upstream = typeof data.upstreamStatus === "number" ? data.upstreamStatus : undefined;
        if (!pasted && !htmlForPost && isFpfResultadosUrl(u) && upstream === 403) {
          fpfSkipServerFetchRef.current = true;
        }
        setLeagueTableFetchError(typeof data.error === "string" ? data.error : "Could not update table.");
        return;
      }
      fpfSkipServerFetchRef.current = false;
      setLeagueTableRows(data.rows ?? []);
      setLeagueMatches(dedupeMatches(Array.isArray(data.matches) ? data.matches : []));
      setLeagueCompetitionName(
        typeof data.competitionName === "string" && data.competitionName.trim() ? data.competitionName.trim() : null
      );
      setLeagueTableLastFetched(data.fetchedAt ?? new Date().toISOString());
      setLeagueTableFetchError(null);
    } catch {
      setLeagueTableFetchError("Network error — try again.");
    }
  }, [leagueTableUrl]);

  const unreadMessagesCount = useMemo(
    () => conversations.reduce((n, c) => n + (c.unread ?? 0), 0),
    [conversations]
  );

  const value = useMemo<AppDataContextValue>(
    () => ({
      hydrated,
      players,
      staff,
      teamRoles,
      addPlayer,
      updatePlayer,
      removePlayer,
      addStaff,
      updateStaff,
      removeStaff,
      setTeamSingleRole,
      setTeamDoubleRole,
      conversations,
      unreadMessagesCount,
      messagesByConv,
      lastReadMessageByConv,
      createDmWithPlayer,
      createDmWithStaff,
      addPlayerToGroupChat,
      createGroupConversation,
      updateGroupConversation,
      addParticipantsToGroupChat,
      removeParticipantFromGroupChat,
      setGroupAdmin,
      sendChatMessage,
      mergeRemoteDmMessages,
      hydrateDmThreadsFromCloud,
      markConversationRead,
      trainingSessions,
      addTrainingSession,
      trainingPlayerIdsBySession,
      setTrainingSessionPlayerIds,
      savedTrainingExercises,
      addSavedTrainingExercise,
      updateSavedTrainingExercise,
      removeSavedTrainingExercise,
      fixtures,
      addFixture,
      updateFixture,
      removeFixture,
      leagueTableUrl,
      setLeagueTableUrl,
      leagueTableRows,
      leagueMatches,
      leagueCompetitionName,
      leagueTableLastFetched,
      leagueTableFetchError,
      refreshLeagueTable,
      coachProfile,
      setCoachProfile,
      savedTactics,
      upsertTactic,
      deleteTactic,
      tacticMatches,
      upsertTacticMatch,
      removeTacticMatch,
      tacticPlayerNotes,
      setTacticPlayerAnalysisNote,
      sketchArea,
      setSketchArea,
      teamCallup,
      setTeamCallup,
    }),
    [
      hydrated,
      players,
      staff,
      teamRoles,
      addPlayer,
      updatePlayer,
      removePlayer,
      addStaff,
      updateStaff,
      removeStaff,
      setTeamSingleRole,
      setTeamDoubleRole,
      conversations,
      unreadMessagesCount,
      messagesByConv,
      lastReadMessageByConv,
      createDmWithPlayer,
      createDmWithStaff,
      addPlayerToGroupChat,
      createGroupConversation,
      updateGroupConversation,
      addParticipantsToGroupChat,
      removeParticipantFromGroupChat,
      setGroupAdmin,
      sendChatMessage,
      mergeRemoteDmMessages,
      hydrateDmThreadsFromCloud,
      markConversationRead,
      trainingSessions,
      addTrainingSession,
      trainingPlayerIdsBySession,
      setTrainingSessionPlayerIds,
      savedTrainingExercises,
      addSavedTrainingExercise,
      updateSavedTrainingExercise,
      removeSavedTrainingExercise,
      fixtures,
      addFixture,
      updateFixture,
      removeFixture,
      leagueTableUrl,
      setLeagueTableUrl,
      leagueTableRows,
      leagueMatches,
      leagueCompetitionName,
      leagueTableLastFetched,
      leagueTableFetchError,
      refreshLeagueTable,
      coachProfile,
      setCoachProfile,
      savedTactics,
      upsertTactic,
      deleteTactic,
      tacticMatches,
      upsertTacticMatch,
      removeTacticMatch,
      tacticPlayerNotes,
      setTacticPlayerAnalysisNote,
      sketchArea,
      setSketchArea,
      teamCallup,
      setTeamCallup,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
