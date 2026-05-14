import type { SketchAreaState } from "@/types";
import { emptyScoutingBoard } from "@/lib/sketch-scouting";

export function emptySketchAreaState(): SketchAreaState {
  return {
    calendarEvents: [],
    notes: [],
    tasks: [],
    files: [],
    boardDrafts: [],
    watchlist: [],
    scoutingProfiles: [],
    scoutingBoard: emptyScoutingBoard("4-3-3"),
  };
}
