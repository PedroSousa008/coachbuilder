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

test("parseMatchEventsFromOcrText accepts OCR dash variants", () => {
  const events = parseMatchEventsFromOcrText("Estoril Praia 0—1 Fc Famalicão");
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeTeam, "Estoril Praia");
  assert.equal(events[0]?.awayTeam, "Fc Famalicão");
  assert.equal(events[0]?.homeGoals, 0);
  assert.equal(events[0]?.awayGoals, 1);
});

test("parseMatchEventsFromOcrText accepts no-dash scores and O/0 OCR confusion", () => {
  const ocr = "Vitória Sc 2 O Rio Ave Fc\nEstoril Praia O 1 Fc Famalicão";
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.homeTeam, "Vitória Sc");
  assert.equal(events[0]?.awayTeam, "Rio Ave Fc");
  assert.equal(events[0]?.homeGoals, 2);
  assert.equal(events[0]?.awayGoals, 0);
  assert.equal(events[1]?.homeTeam, "Estoril Praia");
  assert.equal(events[1]?.awayTeam, "Fc Famalicão");
  assert.equal(events[1]?.homeGoals, 0);
  assert.equal(events[1]?.awayGoals, 1);
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

test("parseMatchEventsFromOcrText reads jornada layout: home then away above score", () => {
  const ocr = `Alverca Sad
Fc Arouca
2 - 1
24 ABR
Estádio Futebol Clube Alverca`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeTeam, "Alverca Sad");
  assert.equal(events[0]?.awayTeam, "Fc Arouca");
  assert.equal(events[0]?.homeGoals, 2);
  assert.equal(events[0]?.awayGoals, 1);
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

test("parseMatchEventsFromOcrText reads OCR decorated score + teams with date in one line", () => {
  const ocr = `: 4-1 :
SI Benfica 25 ABR Moreirense Fc
Estádio Sport Lisboa Benfica`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeTeam, "SI Benfica");
  assert.equal(events[0]?.awayTeam, "Moreirense Fc");
  assert.equal(events[0]?.homeGoals, 4);
  assert.equal(events[0]?.awayGoals, 1);
});

test("parseMatchEventsFromOcrText parses score-first block and ignores date/stadium lines", () => {
  const ocr = `: 4-1 :
SI Benfica 25 ABR Moreirense Fc
Estádio Sport Lisboa Benfica`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeTeam, "SI Benfica");
  assert.equal(events[0]?.awayTeam, "Moreirense Fc");
  assert.equal(events[0]?.homeGoals, 4);
  assert.equal(events[0]?.awayGoals, 1);
});

test("parseMatchEventsFromOcrText handles noisy score token line", () => {
  const ocr = `e 2-O |
Vitória Sc 25 ABR Rio Ave Fc
Estádio D. Afonso Henriques`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.homeTeam, "Vitória Sc");
  assert.equal(events[0]?.awayTeam, "Rio Ave Fc");
  assert.equal(events[0]?.homeGoals, 2);
  assert.equal(events[0]?.awayGoals, 0);
});

test("parseMatchEventsFromOcrText skips fixtures without a score", () => {
  const events = parseMatchEventsFromOcrText("AVS Futebol Sad\nSporting CP");
  assert.equal(events.length, 0);
});

test("parseMatchEventsFromOcrText parses several jornada blocks and skips kick-off times", () => {
  const ocr = `Alverca Sad
Fc Arouca
2 - 1
24 ABR
Estádio X
Cd Tondela, Sad
Cd Nacional
0 - 2
25 ABR
Estádio Y
Avs
Sporting Cp
26 ABR
20:30
Estádio Aves`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.homeTeam, "Alverca Sad");
  assert.equal(events[0]?.awayTeam, "Fc Arouca");
  assert.equal(events[1]?.homeTeam, "Cd Tondela, Sad");
  assert.equal(events[1]?.awayTeam, "Cd Nacional");
});

test("parseMatchEventsFromOcrText parses block cards with accents/no-accents consistently", () => {
  const ocr = `Vitória Sc
Rio Ave Fc
2 - 0
25 ABR
Estádio D. Afonso Henriques
Estoril Praia
Fc Famalicao
0 - 1
26 ABR
Estádio Antonio Coimbra Mota`;
  const events = parseMatchEventsFromOcrText(ocr);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.homeTeam, "Vitória Sc");
  assert.equal(events[0]?.awayTeam, "Rio Ave Fc");
  assert.equal(events[0]?.homeGoals, 2);
  assert.equal(events[0]?.awayGoals, 0);
  assert.equal(events[1]?.homeTeam, "Estoril Praia");
  assert.equal(events[1]?.awayTeam, "Fc Famalicao");
  assert.equal(events[1]?.homeGoals, 0);
  assert.equal(events[1]?.awayGoals, 1);
});
