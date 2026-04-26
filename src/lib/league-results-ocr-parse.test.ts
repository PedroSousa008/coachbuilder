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

test("parseMatchEventsFromOcrText reads scorecard layout (home / score / away)", () => {
  const ocr = `Sl Benfica
4 - 1
25 ABR
Estádio Sport Lisboa e Benfica
Moreirense Fc`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeTeam, "Sl Benfica");
  assert.equal(events[0]?.awayTeam, "Moreirense Fc");
  assert.equal(events[0]?.homeGoals, 4);
  assert.equal(events[0]?.awayGoals, 1);
});

test("parseMatchEventsFromOcrText reads home+score line then away on next line", () => {
  const ocr = `Sl Benfica 4 - 1
25 ABR
Moreirense Fc`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeGoals, 4);
  assert.equal(events[0]?.awayGoals, 1);
});

test("parseMatchEventsFromOcrText skips fixtures without a score", () => {
  const events = parseMatchEventsFromOcrText("AVS Futebol Sad\nSporting CP");
  assert.equal(events.length, 0);
});
