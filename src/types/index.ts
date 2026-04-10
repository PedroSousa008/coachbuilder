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

export type FormationId = "4-3-3" | "4-2-3-1" | "3-5-2";

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

export interface Player {
  id: string;
  name: string;
  position: Position;
  age: number;
  availability: "available" | "doubt" | "out";
  performance: "up" | "steady" | "down";
  number: number;
  photoUrl?: string;
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
