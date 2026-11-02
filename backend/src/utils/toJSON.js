// Map Mongo documents to the shapes in AGENTS.md §4 (id instead of _id, no __v).
const idOf = (v) => String(v?._id ?? v);

export const playerJSON = (p) => ({
  id: idOf(p),
  name: p.name,
  age: p.age,
  sport: p.sport,
});

// Expects attendance[].player to be populated with at least { name }.
export const sessionJSON = (s) => ({
  id: idOf(s),
  date: s.date,
  sport: s.sport,
  status: s.status,
  attendance: s.attendance.map((e) => ({
    playerId: idOf(e.player),
    playerName: e.player?.name ?? "",
    mark: e.mark ?? null,
  })),
});

// Expects scores[].player to be populated with at least { name }.
export const matchJSON = (m) => ({
  id: idOf(m),
  date: m.date,
  sport: m.sport,
  opponent: m.opponent,
  scores: m.scores.map((e) => ({
    playerId: idOf(e.player),
    playerName: e.player?.name ?? "",
    score: e.score,
  })),
});
