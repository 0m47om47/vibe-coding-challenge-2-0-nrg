/**
 * A player may be on a match sheet only if they were marked present in a
 * session of the same sport on the same date (AGENTS.md §3).
 *
 * date, sport: the match's date and sport
 * playerIds:   ids requested on the sheet
 * playersById: Map id -> { name, sport } for players that exist
 * marksById:   Map id -> "present" | "absent" from that day's sessions of that sport
 *
 * Returns [{ playerId, playerName, reason }] for everyone refused.
 */
export function refusedPlayers({ date, sport, playerIds, playersById, marksById }) {
  const refused = [];
  for (const playerId of playerIds) {
    const p = playersById.get(playerId);
    if (!p) {
      refused.push({ playerId, playerName: "Unknown player", reason: "does not exist" });
    } else if (p.sport !== sport) {
      refused.push({ playerId, playerName: p.name, reason: `plays ${p.sport}, not ${sport}` });
    } else {
      const mark = marksById.get(playerId);
      if (mark === "present") continue;
      refused.push({
        playerId,
        playerName: p.name,
        reason:
          mark === "absent"
            ? `was absent on ${date}`
            : `was not marked present on ${date}`,
      });
    }
  }
  return refused;
}

// Collapse a day's sessions into Map id -> "present" | "absent". Present wins.
export function marksFromSessions(sessions) {
  const marks = new Map();
  for (const s of sessions) {
    for (const e of s.attendance) {
      if (!e.mark) continue;
      const id = String(e.player);
      if (marks.get(id) !== "present") marks.set(id, e.mark);
    }
  }
  return marks;
}
