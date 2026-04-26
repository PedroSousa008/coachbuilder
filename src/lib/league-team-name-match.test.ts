import test from "node:test";
import assert from "node:assert/strict";
import { scoreTeamMatch, findBestStandingsRowForOcr } from "@/lib/league-team-name-match";
import type { StandingsTeamRow } from "@/types";

test("scoreTeamMatch treats SL Benfica and Benfica as strong match", () => {
  assert.ok(scoreTeamMatch("SL Benfica", "Benfica") >= 0.85);
  assert.ok(scoreTeamMatch("FC Porto", "Porto") >= 0.85);
});

test("findBestStandingsRowForOcr picks table row from OCR variant", () => {
  const rows: StandingsTeamRow[] = [
    {
      teamId: "1",
      team: "Benfica",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
    {
      teamId: "2",
      team: "Porto",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
  ];
  const b = findBestStandingsRowForOcr("SL Benfica", rows);
  assert.equal(b?.team, "Benfica");
});

test("findBestStandingsRowForOcr rejects ambiguous fuzzy matches", () => {
  const rows: StandingsTeamRow[] = [
    {
      teamId: "1",
      team: "Estrela",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
    {
      teamId: "2",
      team: "Estoril",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
  ];
  const pick = findBestStandingsRowForOcr("Est", rows);
  assert.equal(pick, null);
});
