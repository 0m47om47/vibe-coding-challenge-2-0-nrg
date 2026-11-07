import Player from "../models/Player.js";
import { profileJSON } from "../utils/toJSON.js";
import Session from "../models/Session.js";
import Match from "../models/Match.js";
import {
  READY_ATTENDANCE_NUM,
  READY_ATTENDANCE_DEN,
  READY_MIN_MATCHES,
} from "../constants.js";

// Integer maths on purpose: exactly 75% must count as Ready.
export function isReady({ held, present, matches }) {
  return (
    held > 0 &&
    present * READY_ATTENDANCE_DEN >= held * READY_ATTENDANCE_NUM &&
    matches >= READY_MIN_MATCHES
  );
}

export function attendancePct(held, present) {
  return held === 0 ? 0 : Math.round((present / held) * 1000) / 10;
}

/**
 * Pure calculation.
 * players:  [{ _id, name, age, sport }]
 * sessions: CLOSED sessions only, [{ sport, attendance: [{ player, mark }] }]
 * matches:  [{ sport, scores: [{ player }] }]
 */
export function computeStats(players, sessions, matches) {
  const held = new Map();
  const present = new Map();
  const played = new Map();
  const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

  for (const s of sessions) {
    for (const e of s.attendance) {
      if (e.mark !== "present" && e.mark !== "absent") continue;
      const id = String(e.player);
      bump(held, id);
      if (e.mark === "present") bump(present, id);
    }
  }
  for (const m of matches) {
    for (const e of m.scores) bump(played, String(e.player));
  }

  return players.map((p) => {
    const id = String(p._id);
    const h = held.get(id) ?? 0;
    const pr = present.get(id) ?? 0;
    const mp = played.get(id) ?? 0;
    return {
      id,
      name: p.name,
      age: p.age,
      sport: p.sport,
      ...profileJSON(p),
      sessionsHeld: h,
      sessionsPresent: pr,
      attendancePct: attendancePct(h, pr),
      matchesPlayed: mp,
      ready: isReady({ held: h, present: pr, matches: mp }),
    };
  });
}

// Loads from Mongo and computes. `filter` is a Player query, e.g. {} or { sport } or { _id }.
export async function getPlayerStats(filter = {}) {
  const players = await Player.find(filter).sort({ name: 1 }).lean();
  if (players.length === 0) return [];
  const ids = players.map((p) => p._id);
  const sports = [...new Set(players.map((p) => p.sport))];

  const [sessions, matches] = await Promise.all([
    Session.find({ status: "closed", sport: { $in: sports }, "attendance.player": { $in: ids } }).lean(),
    Match.find({ sport: { $in: sports }, "scores.player": { $in: ids } }).lean(),
  ]);
  return computeStats(players, sessions, matches);
}
