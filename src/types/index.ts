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
  /** Empates registados em jogos desta tática (sincronizado com `TacticMatch`). */
  draws?: number;
  players: PitchPlayer[];
  updatedAt: string;
}

/** Uma linha de estatísticas de um jogador num jogo jogado com uma dada tática. */
export interface TacticMatchPlayerLine {
  playerId: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
}

/** Jogo registado contra uma tática guardada (resultado + contribuições por jogador). */
export interface TacticMatch {
  id: string;
  tacticId: string;
  date: string;
  opponent: string;
  /** Competição ou fase (ex.: «Liga», «Taça»). */
  competition?: string;
  teamGoals: number;
  opponentGoals: number;
  outcome: "win" | "draw" | "loss";
  playerStats: TacticMatchPlayerLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Notas de análise do treinador por jogador e por tática (chave composta no storage). */
export interface TacticPlayerAnalysisNote {
  tacticId: string;
  playerId: string;
  notes: string;
  updatedAt: string;
}

export type PreferredFoot = "left" | "right" | "both";

export type QualityStatId =
  | "acceleration"
  | "sprintSpeed"
  | "diving"
  | "handling"
  | "kicking"
  | "reflexes"
  | "positioning"
  | "passing"
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

/** Tipo de documento associado a jogador ou staff (organização). */
export type TeamDocumentKind =
  | "contract"
  | "medical"
  | "identity"
  | "authorization"
  | "insurance"
  | "video"
  | "image"
  | "pdf"
  | "link"
  | "other";

/** Bloco do contrato (primeiro destaque na UI). */
export interface TeamContractSlot {
  /** Link https ou data URL (anexo pequeno). */
  url?: string;
  notes?: string;
  /** Nome do ficheiro quando há anexo. */
  fileName?: string;
  updatedAt?: string;
}

export interface TeamAttachedDocument {
  id: string;
  title: string;
  kind: TeamDocumentKind;
  url?: string;
  notes?: string;
  fileName?: string;
  addedAt: string;
}

export interface TeamDocumentsBundle {
  contract?: TeamContractSlot;
  items: TeamAttachedDocument[];
}

/** Encaixe da foto no avatar (posição + zoom dentro da moldura). */
export interface PlayerPhotoFrame {
  /** 0–100, eixo horizontal (`object-position`). */
  posX: number;
  /** 0–100, eixo vertical. */
  posY: number;
  /** ≥1; maior = mais zoom (aproximar). */
  zoom: number;
}

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
  /** Posição e zoom da foto dentro do avatar (só com `photoUrl`). */
  photoFrame?: PlayerPhotoFrame;
  /** FIFA-style attributes 0–100; merged with defaults when missing. */
  qualities?: Partial<PlayerQualities>;
  /** Testes de campo / balneário com valores e AI overall. */
  evaluationTests?: PlayerEvaluationTests;
  /** ISO date YYYY-MM-DD */
  dateOfBirth?: string;
  /** Contratos, PDFs, vídeos, links — sincronizado com o workspace. */
  documents?: TeamDocumentsBundle;
  /**
   * Nametag de conta CoachBuilder associado pelo treinador (normalizado, sem @).
   * A “aceitação” é verificada na cloud: existe utilizador com esse `nametag`.
   */
  linkedNametag?: string;
  /** Nacionalidade (texto livre). */
  nationality?: string;
  /** Valor de mercado / nota económica (texto livre, ex. «350k €»). */
  marketValueNote?: string;
  /** Clube de origem na observação / último clube conhecido (recrutamento). */
  scoutedFromClub?: string;
  /** Melhores qualidades destacadas na observação (rótulos em português). */
  scoutingHighlights?: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  /** ISO date YYYY-MM-DD */
  dateOfBirth?: string;
  documents?: TeamDocumentsBundle;
  /**
   * Nametag de conta CoachBuilder (normalizado, sem @). Verificado na cloud como nos jogadores.
   */
  linkedNametag?: string;
}

export type TeamSingleRoleId =
  | "captain"
  | "viceCaptain"
  | "thirdCaptain"
  | "fourthCaptain";

export type TeamDoubleRoleId =
  | "penalties"
  | "freeKickRight"
  | "freeKickLeft"
  | "cornerRight"
  | "cornerLeft";

export type TeamRoleId = TeamSingleRoleId | TeamDoubleRoleId;

/** Responsáveis por funções de equipa (capitães e bolas paradas). */
export interface TeamRoles {
  captain: string | null;
  viceCaptain: string | null;
  thirdCaptain: string | null;
  fourthCaptain: string | null;
  penalties: string[];
  freeKickRight: string[];
  freeKickLeft: string[];
  cornerRight: string[];
  cornerLeft: string[];
}

/** Dados do jogo / logística para impressão da convocatória. */
export interface TeamCallupCalendarForm {
  jogo: string;
  jornada: string;
  data: string;
  /** Hora de início do jogo (texto livre, ex.: 15:00). */
  horaJogo: string;
  pontoEncontro: string;
  maps: string;
  horaEncontro: string;
  chegadaJogo: string;
}

/** Convocatória: logótipo opcional, formulário, até 18 jogadores, observações por jogador. */
export interface TeamCallupState {
  /** Data URL da imagem do logótipo da equipa (opcional). */
  clubLogoDataUrl?: string;
  form: TeamCallupCalendarForm;
  /** Ids dos jogadores convocados (máx. 18; na impressão ordenados por número da camisola). */
  selectedPlayerIds: string[];
  /** Texto livre por jogador (coluna Observações na impressão). */
  observationsByPlayerId: Record<string, string>;
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

/** Categoria para filtrar a biblioteca pessoal de exercícios (dados só da conta do treinador). */
export type SavedExerciseCategory =
  | "warmup"
  | "stretching"
  | "possession"
  | "goalKick"
  | "setPiece"
  | "pressing"
  | "finishing"
  | "defensive"
  | "transition"
  | "physical"
  | "mixed";

export type TrainingAgeGroupId =
  | "benjamin"
  | "infantil"
  | "iniciado"
  | "junior"
  | "juvenil"
  | "senior";

/** Exercício guardado pelo treinador — notas privadas por conta (localStorage + workspace cloud). */
export interface SavedTrainingExercise {
  id: string;
  title: string;
  category: SavedExerciseCategory;
  /** Notas pessoais; visíveis só para este utilizador. */
  coachNotes: string;
  createdAt: string;
  updatedAt: string;
  durationMin: number;
  description: string;
  coachingPoints: string;
  setup?: string;
  groupSplit?: string;
  diagramHint?: string;
  videoUrl?: string;
  progression?: string;
  variations?: string;
  /** Preenchido quando o save veio do modo exercício isolado. */
  objective?: string;
  /** Fase do bloco quando guardado a partir de uma sessão completa. */
  sourcePhase?: "warmup" | "main" | "cooldown";
  /** Criado a partir do quadro tático (Sketch Area); só visível para este treinador. */
  fromSketchBoard?: boolean;
  /** Temas seleccionados no formulário «Guardar Treino». */
  themes?: SavedExerciseCategory[];
  /** Imagem composta dos frames para impressão em sessões. */
  printImageDataUrl?: string;
  /** Ligação ao rascunho do quadro (evita duplicados). */
  sketchBoardDraftId?: string;
  /** Cópia inline do vídeo (só se couber no armazenamento); fallback se o IDB falhar. */
  videoDataUrl?: string;
}

export type NewSavedTrainingExerciseInput = {
  title: string;
  category: SavedExerciseCategory;
  durationMin: number;
  description: string;
  coachingPoints: string;
  setup?: string;
  groupSplit?: string;
  diagramHint?: string;
  videoUrl?: string;
  progression?: string;
  variations?: string;
  objective?: string;
  sourcePhase?: "warmup" | "main" | "cooldown";
  fromSketchBoard?: boolean;
  themes?: SavedExerciseCategory[];
  printImageDataUrl?: string;
  sketchBoardDraftId?: string;
  videoDataUrl?: string;
  id?: string;
};

export type DrillCategory =
  | "Possession"
  | "Finishing"
  | "Defensive shape"
  | "Pressing"
  | "Recovery";

export type ChatAttachmentKind =
  | "file"
  | "training_session"
  | "saved_exercise"
  | "training_catalog"
  /** Full Sketch Area workspace snapshot (legacy / bulk). */
  | "sketch_board"
  /** Single saved item from Sketch Area for the group. */
  | "sketch_note"
  | "sketch_saved_file"
  | "sketch_board_draft"
  | "sketch_task"
  | "sketch_calendar_event";

export interface ChatAttachment {
  id: string;
  kind: ChatAttachmentKind;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** Inline file (images, vídeos carregados como ficheiro); validado em `chat-attachments`. */
  dataUrl?: string;
  /**
   * URL pública do vídeo (ex. `/videos/training/9v9+2.mp4` ou YouTube).
   * Preferível a dataUrl para o catálogo — todos na app veem o mesmo MP4.
   */
  videoUrl?: string;
  /** Structured snapshot (training block, sketch JSON, etc.). */
  payloadJson?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  authorName: string;
  body: string;
  sentAt: string;
  /** True for automated channel events (add/remove/rename); not shown as a user chat bubble. */
  system?: boolean;
  attachments?: ChatAttachment[];
}

export interface Conversation {
  id: string;
  type: "group" | "dm";
  title: string;
  titleUpdatedAt?: string;
  createdById?: string;
  groupPrimaryAdminId?: string;
  groupAdminIds?: string[];
  groupMemberMeta?: Record<string, { addedById: string; joinedAt: string }>;
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

export interface StandingsTeamRow {
  teamId: string;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface StandingsTable {
  phaseId: string;
  updatedAt: string;
  rows: StandingsTeamRow[];
}

export interface LeaguePhase {
  id: string;
  name: string;
  teamIds: string[];
  standings: StandingsTable;
}

export interface LeagueSetup {
  configured: boolean;
  teamCount: number;
  phaseCount: number;
  activePhaseId: string;
  phases: LeaguePhase[];
}

export interface ParsedMatchEvent {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  playedAt?: string;
  source?: "image" | "manual" | "import";
}

/** One fixture resolved against standings rows (for past games + fuzzy apply). */
export interface ResolvedLeagueResult {
  homeRow: StandingsTeamRow;
  awayRow: StandingsTeamRow;
  homeGoals: number;
  awayGoals: number;
  /** ISO date/time when available from OCR source line. */
  playedAt?: string;
}

/** Jogos já disputados envolvendo o clube do Perfil (alimentado por resultados OCR). */
export interface PastClubResult {
  id: string;
  homeSide: string;
  awaySide: string;
  homeGoals: number;
  awayGoals: number;
  outcome: "W" | "D" | "L";
  notes: string;
  recordedAt: string;
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

/** Função técnica num clube (época). */
export type CoachCareerRoleId =
  | "head"
  | "assistant"
  | "analyst"
  | "gk"
  | "fitness"
  | "coordinator";

/** Situação profissional actual. */
export type CoachEmploymentStatus = "active" | "unattached" | "break";

export interface CoachCareerCurrent {
  club: string;
  ageGroup: string;
  role: CoachCareerRoleId;
  /** ISO date — desde quando no cargo */
  since?: string;
  status: CoachEmploymentStatus;
}

export interface CoachSeasonStats {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points?: number;
  finalPosition?: number;
}

/** Associação distrital quando a época marca campeonato distrital. */
export type CoachDistrictAssociationId =
  | "algarve"
  | "aveiro"
  | "acores"
  | "beja"
  | "braga"
  | "braganca"
  | "castelo_branco"
  | "coimbra"
  | "evora"
  | "guarda"
  | "leiria"
  | "lisboa"
  | "madeira"
  | "portalegre"
  | "porto"
  | "santarem"
  | "setubal"
  | "viana_do_castelo"
  | "vila_real"
  | "viseu";

export interface CoachSeasonAchievements {
  championNational: boolean;
  /** Campeão distrital: qual AF; `null` se não aplicável. */
  championDistrictAfId: CoachDistrictAssociationId | null;
  /** Uma linha por taça ou texto livre */
  cupsWon: string;
  promotion: boolean;
  maintenance: boolean;
  qualifiedFinals: boolean;
  recordsNotes?: string;
  distinctions?: string;
}

/** Uma época desportiva na carreira (ex.: 2024/25). */
export interface CoachCareerSeason {
  id: string;
  seasonLabel: string;
  club: string;
  ageGroup: string;
  role: CoachCareerRoleId;
  stats: CoachSeasonStats;
  achievements: CoachSeasonAchievements;
}

export type UefaLicenseId = "uefa_c" | "uefa_b" | "uefa_a" | "uefa_pro";

export type CoachCertKind = "uefa" | "fpf" | "course";

export interface CoachCertificationEntry {
  id: string;
  kind: CoachCertKind;
  uefaLevel?: UefaLicenseId;
  /** Título para FPF / curso complementar */
  title?: string;
  completed: boolean;
  completionYear?: number;
  costEur?: number;
  certificateDataUrl?: string;
  issuingBody?: string;
  licenseNumber?: string;
  validUntil?: string;
  notes?: string;
}

export interface CoachCertificationGoal {
  targetLevelId: UefaLicenseId | string;
  progressPercent: number;
  criteriaMet: string[];
  criteriaPending: string[];
  deadline?: string;
}

export interface CoachCareerDocument {
  id: string;
  name: string;
  category: "certificate" | "proof" | "other";
  dataUrl?: string;
  uploadedAt: string;
  notes?: string;
}

export type CoachHonorCategory =
  | "league_national"
  | "league_district"
  /** Legado (JSON antigo); migrado para nacional/distrital ao carregar */
  | "league"
  | "cup"
  | "supercup"
  | "tournament"
  | "individual"
  | "special";

export type CoachHonorOrigin = "manual" | "career" | "coach_of_month";

export interface CoachHonorEntry {
  id: string;
  category: CoachHonorCategory;
  title: string;
  seasonLabel: string;
  club: string;
  ageGroup: string;
  trophyImageDataUrl?: string;
  /** Troféu distrital por AF (palmarés / carreira). */
  districtAssociationId?: CoachDistrictAssociationId;
  /** Quando gerado a partir da Carreira */
  sourceSeasonId?: string;
  origin: CoachHonorOrigin;
}

export interface CoachProfileState {
  name: string;
  club: string;
  role: string;
  email: string;

  profession?: string;
  dateOfBirth?: string;
  nationality?: string;
  location?: string;
  phone?: string;
  bio?: string;
  avatarDataUrl?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialWebsite?: string;

  careerSeasons?: CoachCareerSeason[];
  careerCurrent?: CoachCareerCurrent;
  certifications?: CoachCertificationEntry[];
  certificationGoal?: CoachCertificationGoal;
  careerDocuments?: CoachCareerDocument[];
  honors?: CoachHonorEntry[];
  careerHonorSyncMode?: "auto" | "manual";
  /** Escalão actual da equipa (impacta o gerador de treino). */
  trainingSquadAgeGroup?: TrainingAgeGroupId;
  /** Mapa: título do exercício -> escalões associados. */
  trainingExerciseAgeMap?: Record<string, TrainingAgeGroupId[]>;
}

/** Sketch Area — staff workspace (calendar, notes, tasks, files, board, watchlist). */
export type SketchCalendarEventCategory =
  | "training"
  | "match"
  | "player_review"
  | "opponent_analysis"
  | "task_deadline"
  | "meeting"
  | "other";

export interface SketchCalendarEvent {
  id: string;
  title: string;
  category: SketchCalendarEventCategory;
  /** ISO date YYYY-MM-DD */
  date: string;
  timeStart?: string;
  timeEnd?: string;
  location?: string;
  notes?: string;
  linkedPlayerId?: string;
  linkedTrainingSessionId?: string;
  linkedFixtureId?: string;
  /** Whole-squad context (no specific player id). */
  teamScope?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SketchStaffNoteCategory =
  | "training"
  | "player"
  | "todo"
  | "meeting"
  | "match"
  | "opponent"
  | "players_to_analyze"
  | "session_reflection"
  | "recruitment"
  | "generic";

export interface SketchStaffNote {
  id: string;
  category: SketchStaffNoteCategory;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  date: string;
  linkedPlayerId?: string;
  linkedTrainingSessionId?: string;
  linkedFixtureId?: string;
  attachmentHint?: string;
  createdAt: string;
  updatedAt: string;
}

export type SketchTaskCategory = "team" | "player" | "training" | "match" | "staff" | "personal";
export type SketchTaskPriority = "low" | "medium" | "high";
export type SketchTaskRecurring = "none" | "daily" | "weekly";

export interface SketchTask {
  id: string;
  title: string;
  category: SketchTaskCategory;
  dueDate?: string;
  priority: SketchTaskPriority;
  completed: boolean;
  completedAt?: string;
  linkedPlayerId?: string;
  linkedCalendarEventId?: string;
  recurring: SketchTaskRecurring;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SketchFileFolder =
  | "training"
  | "matchday"
  | "opponents"
  | "team_talks"
  | "player_analysis"
  | "staff_meetings"
  | "season_planning"
  | "recruitment";

export type SketchFileVisibility = "private" | "team" | "selected_players" | "assistants";

export interface SketchFileEntry {
  id: string;
  name: string;
  folder: SketchFileFolder;
  mimeType: string;
  sizeBytes: number;
  externalUrl?: string;
  /** Small files only — larger uploads should use external URL. */
  dataUrl?: string;
  reviewLater: boolean;
  visibility: SketchFileVisibility;
  selectedPlayerIds?: string[];
  createdAt: string;
}

export type SketchPitchTemplate = "blank" | "half" | "full";

export type SketchStrokeTool =
  | "draw"
  | "arrow"
  | "line"
  | "lineDashed"
  | "lineArrow"
  | "curve"
  | "curveArrow"
  | "circle"
  | "cone"
  | "player"
  | "numbered"
  | "playerToken"
  | "square"
  | "triangle"
  | "goal"
  | "miniGoal"
  | "coneTall"
  | "leader"
  | "ladder"
  | "mannequin"
  | "poleBase"
  | "ball";

export type SketchLineStyle = "solid" | "dashed";

export interface SketchStroke {
  /** Identificador estável para animação entre frames (jogadores, bola, etc.). */
  elementId?: string;
  tool: SketchStrokeTool;
  color: string;
  lineWidth: number;
  points: [number, number][];
  lineStyle?: SketchLineStyle;
  /** Só para `numbered` / genérico: número dentro do círculo (1–24). */
  label?: number;
  /** Só para `playerToken`: número + nome do jogador. */
  playerId?: string;
  playerNumber?: number;
  playerName?: string;
}

export interface SketchBoardText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize?: number;
}

export interface SketchBoardFrame {
  id: string;
  label: string;
  strokes: SketchStroke[];
  texts: SketchBoardText[];
  /** Duração deste frame na reprodução (ms). */
  durationMs: number;
}

export interface SketchBoardDraft {
  id: string;
  title: string;
  pitchTemplate: SketchPitchTemplate;
  /** @deprecated Usar `frames`; mantido para migração e espelho do frame activo. */
  strokes: SketchStroke[];
  frames?: SketchBoardFrame[];
  /** Cor principal do relvado (hex). */
  pitchColor?: string;
  noteAttached?: string;
  category?: string;
  objective?: string;
  ageGroup?: string;
  playerCount?: number;
  duration?: string;
  coachNotes?: string;
  updatedAt: string;
}

/** Estado do fluxo de observação / captação na Sketch Area. */
export type SketchScoutingObservationStatus =
  | "observed"
  | "analyzing"
  | "priority"
  | "interested"
  | "rejected"
  | "signed";

export interface SketchScoutingObservationNote {
  id: string;
  text: string;
  /** ISO instant */
  createdAt: string;
}

/** Blocos de atributos 1–99 (scouting manual, independente das qualidades FIFA). */
export type SketchScoutingAttributeScores = Record<string, number>;

export interface SketchScoutingProfile {
  id: string;
  fullName: string;
  photoUrl?: string;
  /** ISO YYYY-MM-DD */
  dateOfBirth?: string;
  nationality?: string;
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: PreferredFoot;
  currentClub?: string;
  positions: Position[];
  /** Escalão / categoria (texto livre, ex. Sub-19). */
  ageCategory?: string;
  status: SketchScoutingObservationStatus;
  /** Chaves de qualidade FIFA (opcional) para cruzar com overall do plantel. */
  qualityStatIds?: QualityStatId[];
  technique: SketchScoutingAttributeScores;
  tactical: SketchScoutingAttributeScores;
  physical: SketchScoutingAttributeScores;
  mental: SketchScoutingAttributeScores;
  /** Perfis táticos (playmaker, box-to-box, …). */
  tacticalRoleTags: string[];
  observations: SketchScoutingObservationNote[];
  watchlistPriority?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SketchScoutingBoardState {
  formation: FormationId;
  players: PitchPlayer[];
  updatedAt: string;
}

export interface SketchWatchlistEntry {
  id: string;
  /** Team player id (when linked to your own squad). */
  playerId?: string;
  /** External player profile (when scouting players from other teams). */
  externalPlayerName?: string;
  externalClub?: string;
  /** Legado: posição em texto livre; preferir `externalPositions`. */
  externalPosition?: string;
  /** Posições (plantel) para ficha, qualidades e promoção à equipa. */
  externalPositions?: Position[];
  /** ISO date YYYY-MM-DD */
  dateOfBirth?: string;
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: PreferredFoot;
  marketValueNote?: string;
  nationality?: string;
  externalPhotoUrl?: string;
  externalPhotoFrame?: PlayerPhotoFrame;
  /** Qualidades escolhidas a partir da tabela top-10 da posição principal. */
  highlightQualities?: string[];
  /** Qualidades extra escritas pelo utilizador. */
  extraHighlightQualities?: string[];
  focusTags: string[];
  latestNote: string;
  nextAction: string;
  reminderText?: string;
  /** Data do lembrete (YYYY-MM-DD) para criar/atualizar evento no calendário da Sketch Area. */
  reminderDate?: string;
  /** Id de `calendarEvents` quando o lembrete está ligado ao calendário. */
  reminderCalendarEventId?: string;
  clipLinks: string[];
  attendanceNote?: string;
  createdAt: string;
  updatedAt: string;
}

/** Análise qualitativa manual do treinador por mês (YYYY-MM). */
export interface SketchMonthlyReportNotes {
  monthKey: string;
  teamForm?: string;
  bestPhase?: string;
  worstPhase?: string;
  strengths?: string;
  problems?: string;
  updatedAt: string;
}

export interface SketchAreaState {
  calendarEvents: SketchCalendarEvent[];
  notes: SketchStaffNote[];
  tasks: SketchTask[];
  files: SketchFileEntry[];
  boardDrafts: SketchBoardDraft[];
  watchlist: SketchWatchlistEntry[];
  /** Perfis de jogadores observados / captação. */
  scoutingProfiles: SketchScoutingProfile[];
  /** Quadro táctico sandbox (igual ao das Táticas, persistido no workspace). */
  scoutingBoard: SketchScoutingBoardState;
  /** Notas qualitativas do relatório mensal (Sketch Area). */
  monthlyReportNotes?: SketchMonthlyReportNotes[];
}
