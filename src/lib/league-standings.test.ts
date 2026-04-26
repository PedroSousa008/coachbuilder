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

test("applyMatchEventsToStandings updates W/D/L and points", () => {
  const next = applyMatchEventsToStandings(
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
