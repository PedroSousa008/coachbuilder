/**
 * Chaves por utilizador + migração a partir do formato antigo (sem prefixo de conta).
 *
 * Regras: nunca depender de uma flag global que impeça outro utilizador ou uma 2.ª
 * tentativa de importação; só marcar por utilizador após tentativa.
 */

export const MIGRATION_FLAG_KEY = "coachbuilder-migrated-legacy-v1";

/** Por utilizador: evita reimportar em loop quando já há dados reais copiados. */
function perUserImportDoneKey(userId: string) {
  return `coachbuilder-data-import-v1-${userId}`;
}

/** Permite voltar a correr a importação legada (ex.: após atualização) sem apagar dados já preenchidos. */
export function clearPerUserImportFlag(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(perUserImportDoneKey(userId));
  } catch {
    /* ignore */
  }
}

export type UserDataKeyId =
  | "players"
  | "staff"
  | "teamRoles"
  | "conversations"
  | "messages"
  | "sessions"
  | "trainingPlayers"
  | "fixtures"
  | "league"
  | "coachProfile"
  | "tactics"
  | "tacticMatches"
  | "tacticPlayerNotes"
  | "savedTrainingExercises"
  | "sketchArea";

const LEGACY_MAP: Record<UserDataKeyId, string> = {
  players: "coachbuilder-players",
  staff: "coachbuilder-staff",
  teamRoles: "coachbuilder-team-roles-v1",
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
  savedTrainingExercises: "coachbuilder-saved-training-exercises-v1",
  sketchArea: "coachbuilder-sketch-area-v1",
};

export function userDataKey(userId: string, id: UserDataKeyId): string {
  return `coachbuilder-u-${userId}-${id}`;
}

export function getAllUserDataKeys(userId: string): Record<UserDataKeyId, string> {
  return {
    players: userDataKey(userId, "players"),
    staff: userDataKey(userId, "staff"),
    teamRoles: userDataKey(userId, "teamRoles"),
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
    savedTrainingExercises: userDataKey(userId, "savedTrainingExercises"),
    sketchArea: userDataKey(userId, "sketchArea"),
  };
}

function storageLooksEmpty(raw: string | null): boolean {
  if (raw == null) return true;
  const t = raw.trim();
  if (t === "" || t === "[]" || t === "{}") return true;
  try {
    const v = JSON.parse(t) as unknown;
    if (Array.isArray(v)) return v.length === 0;
    if (v && typeof v === "object") return Object.keys(v as object).length === 0;
  } catch {
    return false;
  }
  return false;
}

function legacyHasContent(raw: string | null): boolean {
  return !storageLooksEmpty(raw);
}

/**
 * Copia chaves legadas para o espaço do utilizador quando o destino está vazio
 * mas a origem tem dados (inclui `[]` guardado por engano no destino).
 * Não usa flag global — só `coachbuilder-data-import-v1-{userId}` após primeira tentativa.
 */
export function migrateLegacyDataIfNeeded(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const doneKey = perUserImportDoneKey(userId);
    if (localStorage.getItem(doneKey) === "1") return;

    const keys = getAllUserDataKeys(userId);
    const anyLegacy = (Object.keys(LEGACY_MAP) as UserDataKeyId[]).some((id) =>
      legacyHasContent(localStorage.getItem(LEGACY_MAP[id]))
    );

    if (!anyLegacy) {
      localStorage.setItem(doneKey, "1");
      return;
    }

    let copiedSomething = false;
    (Object.keys(LEGACY_MAP) as UserDataKeyId[]).forEach((id) => {
      const legacyKey = LEGACY_MAP[id];
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyHasContent(legacyRaw) || legacyRaw === null) return;

      const userKey = keys[id];
      const userRaw = localStorage.getItem(userKey);
      if (!storageLooksEmpty(userRaw)) return;

      localStorage.setItem(userKey, legacyRaw);
      copiedSomething = true;
    });

    localStorage.setItem(doneKey, "1");

    // Flag antiga: mantemos por compatibilidade com código que a leia, mas já não bloqueia migração.
    if (copiedSomething && localStorage.getItem(MIGRATION_FLAG_KEY) !== "1") {
      localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    }
  } catch {
    /* ignore */
  }
}

/**
 * Se o utilizador já tem dados na conta mas ainda existem chaves legadas com conteúdo,
 * opcionalmente funde táticas/jogos em falta (não sobrescreve arrays/objetos não vazios no destino).
 * Chamada única quando import-v1 já está "1" mas tactics no user vazio e legacy cheio.
 */
export function mergeLegacyTacticsIfUserEmpty(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys = getAllUserDataKeys(userId);
    const userTactics = localStorage.getItem(keys.tactics);
    const legTactics = localStorage.getItem(LEGACY_MAP.tactics);
    if (!storageLooksEmpty(userTactics) || !legacyHasContent(legTactics) || legTactics === null) return;
    localStorage.setItem(keys.tactics, legTactics);
  } catch {
    /* ignore */
  }
}
