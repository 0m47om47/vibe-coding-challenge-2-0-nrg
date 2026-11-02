import test from "node:test";
import assert from "node:assert/strict";
import { isReady, attendancePct, computeStats } from "../src/services/stats.js";
import { refusedPlayers, marksFromSessions } from "../src/services/matchRules.js";
import { isDate } from "../src/utils/validate.js";

test("Ready: exactly 75% with 2 matches is Ready", () => {
  assert.equal(isReady({ held: 4, present: 3, matches: 2 }), true);
});

test("Ready: below 75% is not Ready, even with many matches", () => {
  assert.equal(isReady({ held: 4, present: 2, matches: 5 }), false);
  assert.equal(isReady({ held: 100, present: 74, matches: 5 }), false);
  assert.equal(isReady({ held: 100, present: 75, matches: 5 }), true);
});

test("Ready: needs at least 2 matches", () => {
  assert.equal(isReady({ held: 4, present: 4, matches: 1 }), false);
  assert.equal(isReady({ held: 4, present: 4, matches: 2 }), true);
});

test("Ready: no sessions held is never Ready", () => {
  assert.equal(isReady({ held: 0, present: 0, matches: 9 }), false);
  assert.equal(attendancePct(0, 0), 0);
});

test("attendancePct rounds to 1 decimal", () => {
  assert.equal(attendancePct(3, 2), 66.7);
  assert.equal(attendancePct(4, 3), 75);
});

// The AGENTS.md §9 scenario
const A = "a".repeat(24), B = "b".repeat(24), C = "c".repeat(24);
const players = [
  { _id: A, name: "Aarav", age: 16, sport: "Football" },
  { _id: B, name: "Bina", age: 15, sport: "Football" },
  { _id: C, name: "Chandan", age: 17, sport: "Football" },
];
const row = (marks) => [A, B, C].map((p, i) => ({ player: p, mark: marks[i] }));
const sessions = [
  { sport: "Football", attendance: row(["present", "absent", "present"]) },
  { sport: "Football", attendance: row(["present", "present", "present"]) },
  { sport: "Football", attendance: row(["present", "present", "absent"]) },
  { sport: "Football", attendance: row(["present", "present", "absent"]) },
];
const matches = [
  { sport: "Football", scores: [{ player: A }, { player: B }] },
  { sport: "Football", scores: [{ player: A }, { player: B }] },
];

test("computeStats: seed scenario gives Aarav and Bina Ready, Chandan not", () => {
  const [aarav, bina, chandan] = computeStats(players, sessions, matches);
  assert.deepEqual([aarav.sessionsHeld, aarav.sessionsPresent, aarav.attendancePct, aarav.ready], [4, 4, 100, true]);
  assert.deepEqual([bina.sessionsHeld, bina.sessionsPresent, bina.attendancePct, bina.ready], [4, 3, 75, true]);
  assert.deepEqual([chandan.attendancePct, chandan.matchesPlayed, chandan.ready], [50, 0, false]);
});

test("computeStats: unmarked entries are not counted as held", () => {
  const [p] = computeStats([players[0]], [{ sport: "Football", attendance: [{ player: A, mark: null }] }], []);
  assert.equal(p.sessionsHeld, 0);
});

test("match sheet: absent and unmarked players are refused, present accepted", () => {
  const playersById = new Map(players.map((p) => [p._id, p]));
  const marksById = marksFromSessions([{ attendance: row(["present", "present", "absent"]) }]);
  const refused = refusedPlayers({
    date: "2026-11-01",
    sport: "Football",
    playerIds: [A, B, C],
    playersById,
    marksById,
  });
  assert.equal(refused.length, 1);
  assert.equal(refused[0].playerName, "Chandan");
  assert.match(refused[0].reason, /absent on 2026-11-01/);
});

test("match sheet: no session that day refuses everyone", () => {
  const playersById = new Map(players.map((p) => [p._id, p]));
  const refused = refusedPlayers({
    date: "2026-12-01",
    sport: "Football",
    playerIds: [A],
    playersById,
    marksById: new Map(),
  });
  assert.equal(refused.length, 1);
  assert.match(refused[0].reason, /not marked present/);
});

test("match sheet: wrong sport is refused", () => {
  const playersById = new Map([[A, { name: "Aarav", sport: "Cricket" }]]);
  const refused = refusedPlayers({
    date: "2026-11-01",
    sport: "Football",
    playerIds: [A],
    playersById,
    marksById: new Map([[A, "present"]]),
  });
  assert.equal(refused.length, 1);
});

test("isDate accepts real dates only", () => {
  assert.equal(isDate("2026-11-01"), true);
  assert.equal(isDate("2026-02-30"), false);
  assert.equal(isDate("01-11-2026"), false);
  assert.equal(isDate(20261101), false);
});
