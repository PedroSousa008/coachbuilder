"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
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
  TrainingSession,
} from "@/types";
import { tallyForTactic } from "@/lib/tactics-match-stats";
import { mockCoach } from "@/data/mock";
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
import { useAuth } from "@/contexts/AuthContext";
import { withNormalizedCareerSeasonsInProfile } from "@/lib/coach-career-season-normalize";
import { withNormalizedHonorCategories } from "@/lib/coach-honor-migration";

function normalizeCoachProfileState(profile: CoachProfileState): CoachProfileState {
  return withNormalizedHonorCategories(withNormalizedCareerSeasonsInProfile(profile));
}

function tacticPlayerNoteKey(tacticId: string, playerId: string) {
  return `${tacticId}::${playerId}`;
}

const defaultCoachProfile = (): CoachProfileState => ({
  name: "",
  club: "",
  role: "Head Coach",
  email: "",
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

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return p
    .map((n) => n[0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

function defaultGroup(): Conversation {
  return {
    id: SQUAD_GROUP_ID,
    type: "group",
    title: "Squad",
    subtitle: "Team channel",
    avatarInitials: "TM",
    lastMessagePreview: "Welcome your players when they join.",
    lastMessageAt: new Date().toISOString(),
    participantIds: [mockCoach.id],
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
  addPlayer: (input: NewPlayerInput) => Player;
  updatePlayer: (id: string, patch: Partial<Omit<Player, "id">>) => void;
  removePlayer: (id: string) => void;

  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  createDmWithPlayer: (player: Player) => string;
  addPlayerToGroupChat: (conversationId: string, player: Player) => void;
  sendChatMessage: (conversationId: string, body: string) => void;

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
  refreshLeagueTable: () => Promise<void>;

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
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const ks = useMemo(() => (user?.id ? getAllUserDataKeys(user.id) : null), [user?.id]);

  const [hydrated, setHydrated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [trainingPlayerIdsBySession, setTrainingPlayerIdsBySession] = useState<Record<string, string[]>>({});
  const [fixtures, setFixtures] = useState<MatchFixture[]>([]);
  const [leagueTableUrl, setLeagueTableUrlState] = useState("");
  const [leagueTableRows, setLeagueTableRows] = useState<LeagueTableRow[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<LeagueImportedMatch[]>([]);
  const [leagueCompetitionName, setLeagueCompetitionName] = useState<string | null>(null);
  const [leagueTableLastFetched, setLeagueTableLastFetched] = useState<string | null>(null);
  const [leagueTableFetchError, setLeagueTableFetchError] = useState<string | null>(null);
  const [coachProfile, setCoachProfileState] = useState<CoachProfileState>(() =>
    normalizeCoachProfileState(defaultCoachProfile())
  );
  const [savedTactics, setSavedTactics] = useState<Tactic[]>([]);
  const [tacticMatches, setTacticMatches] = useState<TacticMatch[]>([]);
  const [tacticPlayerNotes, setTacticPlayerNotesState] = useState<Record<string, TacticPlayerAnalysisNote>>({});
  const [savedTrainingExercises, setSavedTrainingExercises] = useState<SavedTrainingExercise[]>([]);
  const [sketchArea, setSketchArea] = useState<SketchAreaState>(() => emptySketchAreaState());

  const [cloudRemoteReady, setCloudRemoteReady] = useState(() => !isCloudSyncEnabledClient());

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
      setConversations([]);
      setMessagesByConv({});
      setTrainingSessions([]);
      setTrainingPlayerIdsBySession({});
      setFixtures([]);
      setLeagueTableUrlState("");
      setLeagueTableRows([]);
      setLeagueMatches([]);
      setLeagueCompetitionName(null);
      setLeagueTableLastFetched(null);
      setLeagueTableFetchError(null);
      setCoachProfileState(normalizeCoachProfileState(defaultCoachProfile()));
      setSavedTactics([]);
      setTacticMatches([]);
      setTacticPlayerNotesState({});
      setSavedTrainingExercises([]);
      setSketchArea(emptySketchAreaState());
      setHydrated(true);
      return;
    }

    migrateLegacyDataIfNeeded(user.id);
    mergeLegacyTacticsIfUserEmpty(user.id);

    const loadedPlayers = loadJSON<Player[]>(ks.players, []);
    let loadedConvs = loadJSON<Conversation[]>(ks.conversations, []);
    if (!loadedConvs.some((c) => c.type === "group")) {
      loadedConvs = [defaultGroup(), ...loadedConvs];
    }
    const loadedMsgs = loadJSON<Record<string, Message[]>>(ks.messages, {});
    if (!loadedMsgs[SQUAD_GROUP_ID]) {
      loadedMsgs[SQUAD_GROUP_ID] = [];
    }
    setPlayers(loadedPlayers);
    setConversations(loadedConvs);
    setMessagesByConv(loadedMsgs);
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
          let loadedConvs = s.conversations;
          if (!loadedConvs.some((c) => c.type === "group")) {
            loadedConvs = [defaultGroup(), ...loadedConvs];
          }
          const loadedMsgs = { ...s.messages };
          if (!loadedMsgs[SQUAD_GROUP_ID]) loadedMsgs[SQUAD_GROUP_ID] = [];
          const leagueMatchesDeduped = dedupeMatches(s.league.matches ?? []);
          setPlayers(s.players);
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
  ]);

  useEffect(() => {
    if (!hydrated || !ks) return;
    saveJSON(ks.players, players);
  }, [players, hydrated, ks]);

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
    };
    setPlayers((prev) => [...prev, p]);
    return p;
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
  }, []);

  const createDmWithPlayer = useCallback((player: Player) => {
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
        participantIds: [mockCoach.id, player.id],
      };
      return [...prev, conv];
    });
    setMessagesByConv((prev) => (prev[id] ? prev : { ...prev, [id]: [] }));
    return id;
  }, []);

  const addPlayerToGroupChat = useCallback((conversationId: string, player: Player) => {
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
      authorId: mockCoach.id,
      authorName: mockCoach.name.trim() || "Coach",
      body: sysBody,
      sentAt: new Date().toISOString(),
    };
    setMessagesByConv((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));
  }, []);

  const sendChatMessage = useCallback((conversationId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const msg: Message = {
      id: uid("m"),
      conversationId,
      authorId: mockCoach.id,
      authorName: mockCoach.name.trim() || "Coach",
      body: trimmed,
      sentAt: new Date().toISOString(),
    };
    setMessagesByConv((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), msg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessagePreview: trimmed.length > 72 ? `${trimmed.slice(0, 72)}…` : trimmed,
              lastMessageAt: msg.sentAt,
            }
          : c
      )
    );
  }, []);

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

  const refreshLeagueTable = useCallback(async () => {
    const u = leagueTableUrl.trim();
    if (!u) {
      setLeagueTableFetchError("Paste a standings page URL first.");
      return;
    }
    setLeagueTableFetchError(null);
    try {
      const res = await fetch("/api/league-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (!data.ok) {
        setLeagueTableFetchError(typeof data.error === "string" ? data.error : "Could not update table.");
        return;
      }
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

  const value = useMemo<AppDataContextValue>(
    () => ({
      hydrated,
      players,
      addPlayer,
      updatePlayer,
      removePlayer,
      conversations,
      messagesByConv,
      createDmWithPlayer,
      addPlayerToGroupChat,
      sendChatMessage,
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
    }),
    [
      hydrated,
      players,
      addPlayer,
      updatePlayer,
      removePlayer,
      conversations,
      messagesByConv,
      createDmWithPlayer,
      addPlayerToGroupChat,
      sendChatMessage,
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
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
