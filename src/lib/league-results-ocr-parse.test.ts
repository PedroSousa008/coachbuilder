import test from "node:test";
import assert from "node:assert/strict";
import { parseMatchEventsFromOcrText } from "@/lib/league-results-ocr-parse";

test("parseMatchEventsFromOcrText extracts score lines", () => {
  const events = parseMatchEventsFromOcrText("Team A 2-1 Team B\nTeam C 0:0 Team D");
  assert.equal(events.length, 2);
  assert.equal(events[0]?.homeTeam, "Team A");
  assert.equal(events[0]?.awayGoals, 1);
  assert.equal(events[1]?.homeGoals, 0);
});
