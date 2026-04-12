import type {
  SketchCalendarEventCategory,
  SketchFileFolder,
  SketchStaffNoteCategory,
  SketchTaskCategory,
} from "@/types";

export const EVENT_CATEGORY_LABELS: Record<SketchCalendarEventCategory, string> = {
  training: "Training session",
  match: "Match",
  player_review: "Player review",
  opponent_analysis: "Opponent analysis",
  task_deadline: "Deadline / task",
  meeting: "Meeting",
  other: "Other",
};

export const NOTE_CATEGORY_LABELS: Record<SketchStaffNoteCategory, string> = {
  training: "Training notes",
  player: "Player notes",
  todo: "To-do notes",
  meeting: "Meeting notes",
  match: "Match notes",
  opponent: "Opponent notes",
  players_to_analyze: "Players to analyze",
  session_reflection: "Session reflections",
  recruitment: "Recruitment / trial",
  generic: "General",
};

export const TASK_CATEGORY_LABELS: Record<SketchTaskCategory, string> = {
  team: "Team",
  player: "Player",
  training: "Training",
  match: "Match",
  staff: "Staff",
  personal: "Personal",
};

export const FILE_FOLDER_LABELS: Record<SketchFileFolder, string> = {
  training: "Training",
  matchday: "Matchday",
  opponents: "Opponents",
  team_talks: "Team talks",
  player_analysis: "Player analysis",
  staff_meetings: "Staff meetings",
  season_planning: "Season planning",
  recruitment: "Recruitment",
};

export const MAX_SKETCH_FILE_BYTES = 380_000;
