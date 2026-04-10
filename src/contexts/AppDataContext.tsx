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
import type { Conversation, Message, Player, Position, TrainingSession } from "@/types";
import { mockCoach } from "@/data/mock";

const LS_PLAYERS = "coachbuilder-players";
const LS_CONVS = "coachbuilder-conversations";
const LS_MSGS = "coachbuilder-messages";
const LS_SESSIONS = "coachbuilder-sessions";
const LS_TRAINING_PLAYERS = "coachbuilder-training-session-players";

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
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [trainingPlayerIdsBySession, setTrainingPlayerIdsBySession] = useState<Record<string, string[]>>({});

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
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
