import type { WorkspaceSnapshotV1 } from "@/lib/workspace-snapshot";

export type WorkspaceDataCounts = {
  players: number;
  tactics: number;
  tacticMatches: number;
  tacticPlayerNotes: number;
  trainingSessions: number;
  fixtures: number;
  conversations: number;
  messages: number;
  savedTrainingExercises: number;
  sketchCalendarEvents: number;
  sketchNotes: number;
  sketchTasks: number;
  sketchFiles: number;
  sketchBoardDrafts: number;
  sketchWatchlist: number;
};

export function workspaceDataCounts(s: WorkspaceSnapshotV1): WorkspaceDataCounts {
  let messages = 0;
  for (const arr of Object.values(s.messages)) {
    messages += Array.isArray(arr) ? arr.length : 0;
  }
  const sk = s.sketchArea;
  return {
    players: s.players.length,
    tactics: s.tactics.length,
    tacticMatches: s.tacticMatches.length,
    tacticPlayerNotes: Object.keys(s.tacticPlayerNotes).length,
    trainingSessions: s.trainingSessions.length,
    fixtures: s.fixtures.length,
    conversations: s.conversations.length,
    messages,
    savedTrainingExercises: s.savedTrainingExercises.length,
    sketchCalendarEvents: sk.calendarEvents.length,
    sketchNotes: sk.notes.length,
    sketchTasks: sk.tasks.length,
    sketchFiles: sk.files.length,
    sketchBoardDrafts: sk.boardDrafts.length,
    sketchWatchlist: sk.watchlist.length,
  };
}
