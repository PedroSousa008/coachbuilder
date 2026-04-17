/** Structured output from the opponent-analysis AI (server + client render). */

export type OpponentAnalysisRolePick = {
  playerId: string;
  playerName: string;
  rationale: string;
};

export type OpponentAnalysisRoles = {
  captain: OpponentAnalysisRolePick;
  captainAlternate?: OpponentAnalysisRolePick;
  viceCaptain?: OpponentAnalysisRolePick;
  penaltyTaker: OpponentAnalysisRolePick;
  penaltyAlternate?: OpponentAnalysisRolePick;
  freeKickTaker?: OpponentAnalysisRolePick;
  cornerLeft?: OpponentAnalysisRolePick;
  cornerRight?: OpponentAnalysisRolePick;
};

export type OpponentAnalysisXiPlayer = {
  playerId: string;
  playerName: string;
  shirtNumber?: number;
  positionLabel: string;
  tacticalNotes?: string;
};

export type OpponentAnalysisAiResult = {
  headline: string;
  winProbabilityPercent: number;
  winProbabilityNotes: string;
  opponentRecentSummary: string;
  ourRecentSummary: string;
  goalsForTrend: string;
  goalsAgainstTrend: string;
  howWeShouldApproach: string;
  howWeExpectOpponent: string;
  recommendedFormation: string;
  formationAndTacticRationale: string;
  startingXi: OpponentAnalysisXiPlayer[];
  benchNotes: string;
  roles: OpponentAnalysisRoles;
  dataLimitations?: string;
};
