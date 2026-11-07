// Map Mongo documents to the shapes in AGENTS.md §4 (id instead of _id, no __v).
const idOf = (v) => String(v?._id ?? v);

// Optional profile fields are left out entirely when they are not set.
export const profileJSON = (p) => ({
  ...(p.photoUrl ? { photoUrl: p.photoUrl } : {}),
  ...(p.heightCm != null ? { heightCm: p.heightCm } : {}),
  ...(p.weightKg != null ? { weightKg: p.weightKg } : {}),
  ...(p.nationality ? { nationality: p.nationality } : {}),
});

export const playerJSON = (p) => ({
  id: idOf(p),
  name: p.name,
  age: p.age,
  sport: p.sport,
  ...profileJSON(p),
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
    stats: { ...(e.stats ?? {}) },
  })),
});
