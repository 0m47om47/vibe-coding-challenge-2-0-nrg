import { test } from "node:test";
import assert from "node:assert/strict";
import { academyBest } from "../src/services/peers.js";

test("academyBest: highest per-match average and most matches, no names", () => {
  const matches = [
    { scores: [{ player: "a", stats: { goals: 2, assists: 0 } }, { player: "b", stats: { goals: 1, assists: 1 } }] },
    { scores: [{ player: "a", stats: { goals: 1, assists: 1 } }] },
    { scores: [{ player: "b", stats: { goals: 0, assists: 0 } }, { player: "c", stats: { goals: 0 } }] },
  ];
  const r = academyBest("Football", matches);
  assert.equal(r.matches, 2);
  assert.equal(r.best.goals, 1.5); // a: 3 goals in 2 matches
  assert.equal(r.best.assists, 0.5);
  assert.deepEqual(Object.keys(r).sort(), ["best", "matches"]);
});

test("academyBest with no matches is all zeros", () => {
  assert.deepEqual(academyBest("Cricket", []), { matches: 0, best: { runs: 0, wickets: 0, catches: 0 } });
});
