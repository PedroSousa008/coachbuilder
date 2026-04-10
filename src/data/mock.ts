import type {
  Coach,
  Conversation,
  MatchClip,
  Message,
  NextMatch,
  Player,
  Tactic,
  TeamQuickStats,
  TrainingSession,
} from "@/types";

/** Fresh account — empty lists; coach profile is yours to fill in Profile. */
export const mockCoach: Coach = {
  id: "coach-1",
  name: "",
  club: "",
  role: "Head Coach",
  email: "",
  plan: "free",
  tacticsCreated: 0,
  sessionsPlanned: 0,
  matchesAnalyzed: 0,
};

export const mockTeamStats: TeamQuickStats = {
  formLast5: [],
  goalsFor: 0,
  goalsAgainst: 0,
  cleanSheets: 0,
};

export const mockNextMatch: NextMatch | null = null;

export const mockUpcomingSession: TrainingSession | null = null;

export const mockTactics: Tactic[] = [];

export const mockPlayers: Player[] = [];

export const mockSessions: TrainingSession[] = [];

export const mockConversations: Conversation[] = [];

export const mockMessages: Record<string, Message[]> = {};

export const mockClips: MatchClip[] = [];
