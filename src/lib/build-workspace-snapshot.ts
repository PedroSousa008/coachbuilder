import type { WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";
import type {
  CoachProfileState,
  Conversation,
  LeagueSetup,
  LeagueImportedMatch,
  LeagueTableRow,
  MatchFixture,
  Message,
  PastClubResult,
  Player,
  SavedTrainingExercise,
  SketchAreaState,
  StaffMember,
  TeamCallupState,
  TeamRoles,
  Tactic,
  TacticMatch,
  TacticPlayerAnalysisNote,
  TrainingSession,
} from "@/types";

/** Snapshot completo alinhado com o que se persiste em cloud / localStorage (um único sítio de verdade). */
export function buildWorkspaceSnapshotV1(params: {
  players: Player[];
  staff: StaffMember[];
  teamRoles: TeamRoles;
  conversations: Conversation[];
  messagesByConv: Record<string, Message[]>;
  trainingSessions: TrainingSession[];
  trainingPlayerIdsBySession: Record<string, string[]>;
  fixtures: MatchFixture[];
  leagueTableUrl: string;
  leagueTableRows: LeagueTableRow[];
  leagueMatches: LeagueImportedMatch[];
  leagueCompetitionName: string | null;
  leagueTableLastFetched: string | null;
  leagueTableFetchError: string | null;
  leagueSetup: LeagueSetup | null;
  pastClubResults: PastClubResult[];
  coachProfile: CoachProfileState;
  savedTactics: Tactic[];
  tacticMatches: TacticMatch[];
  tacticPlayerNotes: Record<string, TacticPlayerAnalysisNote>;
  savedTrainingExercises: SavedTrainingExercise[];
  sketchArea: SketchAreaState;
  teamCallup: TeamCallupState;
}): WorkspaceSnapshotV1 {
  return {
    version: 1,
    players: params.players,
    staff: params.staff,
    teamRoles: params.teamRoles,
    conversations: params.conversations,
    messages: params.messagesByConv,
    trainingSessions: params.trainingSessions,
    trainingPlayers: params.trainingPlayerIdsBySession,
    fixtures: params.fixtures,
    league: {
      url: params.leagueTableUrl,
      rows: params.leagueTableRows,
      matches: params.leagueMatches,
      competitionName: params.leagueCompetitionName,
      lastFetched: params.leagueTableLastFetched,
      lastError: params.leagueTableFetchError,
      setup: params.leagueSetup,
      pastClubResults: params.pastClubResults,
    },
    coachProfile: params.coachProfile,
    tactics: params.savedTactics,
    tacticMatches: params.tacticMatches,
    tacticPlayerNotes: params.tacticPlayerNotes,
    savedTrainingExercises: params.savedTrainingExercises,
    sketchArea: params.sketchArea,
    teamCallup: params.teamCallup,
  };
}
