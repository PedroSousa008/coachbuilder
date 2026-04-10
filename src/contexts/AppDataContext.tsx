"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
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
  TrainingSession,
} from "@/types";
import { mockCoach } from "@/data/mock";
import { dedupeMatches } from "@/lib/league-match-dedupe";

const LS_PLAYERS = "coachbuilder-players";
const LS_CONVS = "coachbuilder-conversations";
const LS_MSGS = "coachbuilder-messages";
const LS_SESSIONS = "coachbuilder-sessions";
const LS_TRAINING_PLAYERS = "coachbuilder-training-session-players";
const LS_FIXTURES = "coachbuilder-fixtures";
const LS_LEAGUE = "coachbuilder-league";
const LS_COACH_PROFILE = "coachbuilder-coach-profile";

const defaultCoachProfile = (): CoachProfileState => ({
  name: "",
  club: "",
  role: "Head Coach",
  email: "",
});

/** Stable id for the default squad group chat (localStorage + UI). */
export const SQUAD_GROUP_ID = "conv-squad";

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
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
  age: number;
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
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
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
  const [coachProfile, setCoachProfileState] = useState<CoachProfileState>(defaultCoachProfile);

  useEffect(() => {
    const loadedPlayers = loadJSON<Player[]>(LS_PLAYERS, []);
    let loadedConvs = loadJSON<Conversation[]>(LS_CONVS, []);
    if (!loadedConvs.some((c) => c.type === "group")) {
      loadedConvs = [defaultGroup(), ...loadedConvs];
    }
    const loadedMsgs = loadJSON<Record<string, Message[]>>(LS_MSGS, {});
    if (!loadedMsgs[SQUAD_GROUP_ID]) {
      loadedMsgs[SQUAD_GROUP_ID] = [];
    }
    setPlayers(loadedPlayers);
    setConversations(loadedConvs);
    setMessagesByConv(loadedMsgs);
    setTrainingSessions(loadJSON<TrainingSession[]>(LS_SESSIONS, []));
    setTrainingPlayerIdsBySession(loadJSON<Record<string, string[]>>(LS_TRAINING_PLAYERS, {}));
    setFixtures(loadJSON<MatchFixture[]>(LS_FIXTURES, []));
    setCoachProfileState({
      ...defaultCoachProfile(),
      ...loadJSON<Partial<CoachProfileState>>(LS_COACH_PROFILE, {}),
    });
    const league = loadJSON<Partial<LeaguePersist>>(LS_LEAGUE, {});
    setLeagueTableUrlState(league.url ?? "");
    setLeagueTableRows(league.rows ?? []);
    setLeagueMatches(dedupeMatches(league.matches ?? []));
    setLeagueCompetitionName(league.competitionName ?? null);
    setLeagueTableLastFetched(league.lastFetched ?? null);
    setLeagueTableFetchError(league.lastError ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_PLAYERS, players);
  }, [players, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_CONVS, conversations);
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_MSGS, messagesByConv);
  }, [messagesByConv, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_SESSIONS, trainingSessions);
  }, [trainingSessions, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_TRAINING_PLAYERS, trainingPlayerIdsBySession);
  }, [trainingPlayerIdsBySession, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_FIXTURES, fixtures);
  }, [fixtures, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_LEAGUE, {
      url: leagueTableUrl,
      rows: leagueTableRows,
      matches: leagueMatches,
      competitionName: leagueCompetitionName,
      lastFetched: leagueTableLastFetched,
      lastError: leagueTableFetchError,
    } satisfies LeaguePersist);
  }, [
    hydrated,
    leagueTableUrl,
    leagueTableRows,
    leagueMatches,
    leagueCompetitionName,
    leagueTableLastFetched,
    leagueTableFetchError,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    saveJSON(LS_COACH_PROFILE, coachProfile);
  }, [coachProfile, hydrated]);

  const addPlayer = useCallback((input: NewPlayerInput) => {
    const p: Player = {
      id: uid("pl"),
      name: input.name.trim(),
      number: input.number,
      position: input.position,
      age: input.age,
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
        subtitle: `${player.position} · #${player.number}`,
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
    setCoachProfileState((prev) => ({ ...prev, ...patch }));
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
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
