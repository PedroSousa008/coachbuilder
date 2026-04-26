import test from "node:test";
import assert from "node:assert/strict";
import { parseMatchEventsFromOcrText } from "@/lib/league-results-ocr-parse";

test("parseMatchEventsFromOcrText extracts score lines (hyphen only, not colon)", () => {
  const events = parseMatchEventsFromOcrText("Team A 2-1 Team B\nTeam C 0-0 Team D");
  assert.equal(events.length, 2);
  assert.equal(events[0]?.homeTeam, "Team A");
  assert.equal(events[0]?.awayGoals, 1);
  assert.equal(events[1]?.homeGoals, 0);
});

test("parseMatchEventsFromOcrText ignores colon as score (kick-off time)", () => {
  const ocr = `Avs
26 ABR
20:30
Estádio Clube Desportivo Das Aves
Sporting Cp`;
  assert.equal(parseMatchEventsFromOcrText(ocr).length, 0);
});

test("parseMatchEventsFromOcrText does not treat 0:0 as a match result", () => {
  assert.equal(parseMatchEventsFromOcrText("Team A 0:0 Team B").length, 0);
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
