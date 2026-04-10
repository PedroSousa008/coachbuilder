/** Chaves por utilizador + migração de dados antigos (sem prefixo de conta). */

export const MIGRATION_FLAG_KEY = "coachbuilder-migrated-legacy-v1";

export type UserDataKeyId =
  | "players"
  | "conversations"
  | "messages"
  | "sessions"
  | "trainingPlayers"
  | "fixtures"
  | "league"
  | "coachProfile"
  | "tactics"
  | "tacticMatches"
  | "tacticPlayerNotes";

const LEGACY_MAP: Record<UserDataKeyId, string> = {
  players: "coachbuilder-players",
  conversations: "coachbuilder-conversations",
  messages: "coachbuilder-messages",
  sessions: "coachbuilder-sessions",
  trainingPlayers: "coachbuilder-training-session-players",
  fixtures: "coachbuilder-fixtures",
  league: "coachbuilder-league",
  coachProfile: "coachbuilder-coach-profile",
  tactics: "coachbuilder-tactics",
  tacticMatches: "coachbuilder-tactic-matches",
  tacticPlayerNotes: "coachbuilder-tactic-player-notes",
};

export function userDataKey(userId: string, id: UserDataKeyId): string {
  return `coachbuilder-u-${userId}-${id}`;
}

export function getAllUserDataKeys(userId: string): Record<UserDataKeyId, string> {
  return {
    players: userDataKey(userId, "players"),
    conversations: userDataKey(userId, "conversations"),
    messages: userDataKey(userId, "messages"),
    sessions: userDataKey(userId, "sessions"),
    trainingPlayers: userDataKey(userId, "trainingPlayers"),
    fixtures: userDataKey(userId, "fixtures"),
    league: userDataKey(userId, "league"),
    coachProfile: userDataKey(userId, "coachProfile"),
    tactics: userDataKey(userId, "tactics"),
    tacticMatches: userDataKey(userId, "tacticMatches"),
    tacticPlayerNotes: userDataKey(userId, "tacticPlayerNotes"),
  };
}

/** Copia dados legados (primeira conta neste dispositivo) para o espaço do utilizador. */
export function migrateLegacyDataIfNeeded(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === "1") return;
    const hasLegacy = localStorage.getItem(LEGACY_MAP.players) != null;
    if (!hasLegacy) {
      localStorage.setItem(MIGRATION_FLAG_KEY, "1");
      return;
    }
    const keys = getAllUserDataKeys(userId);
    (Object.keys(LEGACY_MAP) as UserDataKeyId[]).forEach((id) => {
      const legacy = LEGACY_MAP[id];
      const raw = localStorage.getItem(legacy);
      if (raw !== null && localStorage.getItem(keys[id]) === null) {
        localStorage.setItem(keys[id], raw);
      }
    });
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
  } catch {
    /* ignore */
  }
}
