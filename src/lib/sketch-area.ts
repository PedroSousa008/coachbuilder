import type { SketchAreaState } from "@/types";

export function emptySketchAreaState(): SketchAreaState {
  return {
    calendarEvents: [],
    notes: [],
    tasks: [],
    files: [],
    boardDrafts: [],
    watchlist: [],
  };
}
