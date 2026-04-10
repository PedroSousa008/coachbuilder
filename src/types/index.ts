export type Position =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LW"
  | "RW"
  | "ST";

/** Internal id → display label in `FORMATION_LABELS` (e.g. 4-3-3-v2 → "4-3-3(2)"). */
export type FormationId =
  | "3-1-4-2"
  | "3-4-1-2"
  | "3-4-2-1"
  | "3-5-2"
  | "3-4-3"
  | "4-1-2-1-2"
  | "4-1-2-1-2-v2"
  | "4-1-3-2"
  | "4-1-4-1"
  | "4-2-1-3"
  | "4-2-2-2"
  | "4-2-3-1"
  | "4-2-3-1-v2"
  | "4-2-4"
  | "4-3-1-2"
  | "4-3-2-1"
  | "4-3-3"
  | "4-3-3-v2"
  | "4-3-3-v3"
  | "4-3-3-v4"
  | "4-4-1-1-v2"
  | "4-4-2"
  | "4-4-2-v2"
  | "4-5-1"
  | "4-5-1-v2"
  | "5-2-1-2"
  | "5-2-3"
  | "5-3-2"
  | "5-4-1";

export interface PitchPlayer {
  id: string;
  /** Display on the chip (e.g. shirt number or role). */
  label: string;
  /** Role from formation template; used when clearing a roster assignment. */
  formationLabel: string;
  x: number;
  y: number;
  /** Linked squad player from Team roster. */
  playerId?: string | null;
  /** Snapshot of player name for chips and persisted tactics (synced from roster when possible). */
  playerName?: string | null;
}

export interface Tactic {
  id: string;
  name: string;
  formation: FormationId;
  opponent: string;
  notes: string;
  matchesUsed: number;
  wins: number;
  losses: number;
  players: PitchPlayer[];
  updatedAt: string;
}

export type PreferredFoot = "left" | "right" | "both";

export type QualityStatId =
  | "acceleration"
  | "sprintSpeed"
  | "attackingPosition"
  | "finishing"
  | "shotPower"
  | "longShots"
  | "volleys"
  | "penalties"
  | "vision"
  | "crossing"
  | "freeKickAccuracy"
  | "shortPass"
  | "longPass"
  | "curve"
  | "agility"
  | "balance"
  | "reactions"
  | "ballControl"
  | "dribbling"
  | "composure"
  | "interceptions"
  | "headingAccuracy"
  | "defensiveAwareness"
  | "standTackle"
  | "slideTackle"
  | "jumping"
  | "stamina"
  | "strength"
  | "aggression";

export type PlayerQualities = Record<QualityStatId, number>;

export type EvaluationTestId =
  | "sprint20m"
  | "dribblingSlalom"
  | "yoyoEndurance"
  | "verticalJump"
  | "shortPassingAccuracy"
  | "reactionTest";

/** Resultado de um teste físico/técnico (valor inserido + AI 0–100 quando calculável). */
export type EvaluationTestEntry = {
  /** Valor bruto introduzido pelo treinador (ex.: segundos, cm, repetições). */
  raw?: string;
  /** Pontuação 0–100 derivada de tabelas idade/tempo (ou provisória). */
  aiOverall?: number;
};

export type PlayerEvaluationTests = Partial<Record<EvaluationTestId, EvaluationTestEntry>>;

export interface Player {
  id: string;
  name: string;
  /** Primary position (legacy + tactics); first entry of `positions` when set. */
  position: Position;
  /** Optional extra positions (multi-role). */
  positions?: Position[];
  age: number;
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: PreferredFoot;
  availability: "available" | "doubt" | "out";
  performance: "up" | "steady" | "down";
  number: number;
  photoUrl?: string;
  /** FIFA-style attributes 0–100; merged with defaults when missing. */
  qualities?: Partial<PlayerQualities>;
  /** Testes de campo / balneário com valores e AI overall. */
  evaluationTests?: PlayerEvaluationTests;
}

export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  durationMin: number;
  intensity: "low" | "medium" | "high";
  categories: DrillCategory[];
  description: string;
}

export type DrillCategory =
  | "Possession"
  | "Finishing"
  | "Defensive shape"
  | "Pressing"
  | "Recovery";

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  body: string;
  sentAt: string;
}

export interface Conversation {
  id: string;
  type: "group" | "dm";
  title: string;
  subtitle?: string;
  avatarInitials: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unread?: number;
  participantIds: string[];
}

export interface MatchClip {
  id: string;
  title: string;
  durationSec: number;
  tags: AnalysisTag[];
  thumbnailTone: "green" | "slate" | "amber";
}

export type AnalysisTag =
  | "Defensive mistake"
  | "Build-up"
  | "Pressing trigger"
  | "Chance created";

export interface Coach {
  id: string;
  name: string;
  club: string;
  role: string;
  email: string;
  avatarUrl?: string;
  plan: "free" | "pro";
  tacticsCreated: number;
  sessionsPlanned: number;
  matchesAnalyzed: number;
}

export interface TeamQuickStats {
  formLast5: ("W" | "D" | "L")[];
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
}

export interface NextMatch {
  opponent: string;
  competition: string;
  kickoff: string;
  venue: "home" | "away";
}

/** Upcoming / past match in the calendar (stored locally until backend sync). */
export interface MatchFixture {
  id: string;
  opponent: string;
  competition: string;
  kickoff: string;
  venue: "home" | "away";
  notes?: string;
}

/** Parsed league standing row (best-effort from an external HTML table). */
export interface LeagueTableRow {
  position: number;
  team: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
  cells?: string[];
}

/** Imported from federation pages (e.g. FPF resultados) — past and future fixtures. */
export interface LeagueImportedMatch {
  id: string;
  matchId?: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  homeScore?: number;
  awayScore?: number;
  venue?: string;
  sourceUrl?: string;
  /** Jornada number from FPF competition tabs (1…N) when available. */
  fpfRound?: number;
  /** FPF fixture fragment id from `GetClassificationAndMatchesByFixture?fixtureId=`. */
  fpfFixtureId?: string;
}

export interface CoachProfileState {
  name: string;
  club: string;
  role: string;
  email: string;
}
