import test from "node:test";
import assert from "node:assert/strict";
import { applyMatchEventsToStandings, sortStandingsRows } from "@/lib/league-standings";

test("sortStandingsRows orders by points then goalsFor", () => {
  const rows = sortStandingsRows([
    {
      teamId: "b",
      team: "B",
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 3,
      goalsAgainst: 1,
      points: 4,
    },
    {
      teamId: "a",
      team: "A",
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 4,
      goalsAgainst: 2,
      points: 4,
    },
  ]);
  assert.equal(rows[0]?.teamId, "a");
});

test("sortStandingsRows orders tied points by goal difference", () => {
  const rows = sortStandingsRows([
    {
      teamId: "worse-gd",
      team: "Worse",
      played: 1,
      won: 0,
      drawn: 0,
      lost: 1,
      goalsFor: 0,
      goalsAgainst: 2,
      points: 0,
    },
    {
      teamId: "zero-gd",
      team: "Zero",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
  ]);
  assert.equal(rows[0]?.teamId, "zero-gd");
  assert.equal(rows[1]?.teamId, "worse-gd");
});

test("applyMatchEventsToStandings updates W/D/L and points", () => {
  const { rows: next } = applyMatchEventsToStandings(
    [
      {
        teamId: "a",
        team: "A",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
      {
        teamId: "b",
        team: "B",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ],
    [{ homeTeam: "A", awayTeam: "B", homeGoals: 2, awayGoals: 1, source: "manual" }]
  );
  const a = next.find((x) => x.team === "A");
  const b = next.find((x) => x.team === "B");
  assert.equal(a?.points, 3);
  assert.equal(a?.won, 1);
  assert.equal(b?.lost, 1);
});

test("applyMatchEventsToStandings matches OCR club names to table rows (fuzzy)", () => {
  const { rows: next } = applyMatchEventsToStandings(
    [
      {
        teamId: "a",
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
        teamId: "b",
        team: "Porto",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
    ],
    [{ homeTeam: "SL Benfica", awayTeam: "FC Porto", homeGoals: 0, awayGoals: 0, source: "image" }]
  );
  const benfica = next.find((x) => x.team === "Benfica");
  const porto = next.find((x) => x.team === "Porto");
  assert.equal(benfica?.played, 1);
  assert.equal(porto?.played, 1);
  assert.equal(benfica?.drawn, 1);
  assert.equal(porto?.drawn, 1);
});

test("applyMatchEventsToStandings applies all jornada fixtures (each row used at most once)", () => {
  const row = (teamId: string, team: string) => ({
    teamId,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  });
  const { applied, rows: next } = applyMatchEventsToStandings(
    [
      row("a", "Pevidém SC"),
      row("b", "U. Torcatense"),
      row("c", "GD Figueiredo"),
      row("d", "GD Selho"),
    ],
    [
      { homeTeam: "Pevidém SC", awayTeam: "U. Torcatense", homeGoals: 1, awayGoals: 3, source: "image" },
      { homeTeam: "GD Figueiredo", awayTeam: "GD Selho", homeGoals: 0, awayGoals: 1, source: "image" },
    ]
  );
  assert.equal(applied.length, 2);
  assert.equal(next.find((x) => x.teamId === "a")?.lost, 1);
  assert.equal(next.find((x) => x.teamId === "b")?.won, 1);
  assert.equal(next.find((x) => x.teamId === "d")?.won, 1);
});
