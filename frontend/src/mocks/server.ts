// In browser stand in for the backend API (AGENTS.md §5). Same routes, same rules, same error shapes.
// State lives in localStorage so a refresh keeps the demo data. Clear it with: localStorage.clear()
import { SPORTS } from "@/types";
import { SPORT_STATS } from "@/lib/sportStats";
import type { Mark, Player, PlayerStats, PracticeSession, Match, SessionUser, Sport } from "@/types";
import { seedDb, type MockDb, type MockSession, type MockMatch, type MockUser } from "./data";

export interface MockResponse {
  status: number;
  body: unknown;
}

const DB_KEY = "academy-mock-db-v2";
const USER_KEY = "academy-mock-user";

const ok = (body: unknown, status = 200): MockResponse => ({ status, body });
const fail = (status: number, error: string, details?: unknown): MockResponse => ({
  status,
  body: { error, ...(details ? { details } : {}) },
});
const notLoggedIn = () => fail(401, "Please log in.");
const forbidden = () => fail(403, "You are not allowed to do this.");

let memoryDb: MockDb | null = null;

function loadDb(): MockDb {
  if (memoryDb) return memoryDb;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return (memoryDb = JSON.parse(raw) as MockDb);
  } catch {
    /* fall through to a fresh seed */
  }
  return (memoryDb = seedDb());
}

function saveDb(db: MockDb) {
  memoryDb = db;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage blocked: the demo still works until reload */
  }
}

const nextId = (db: MockDb, prefix: string) => `${prefix}${++db.seq}`;

function currentUser(db: MockDb): MockUser | null {
  try {
    const id = localStorage.getItem(USER_KEY);
    return db.users.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
}

const sessionUser = (u: MockUser): SessionUser => ({
  id: u.id,
  username: u.username,
  role: u.role,
  ...(u.playerId ? { playerId: u.playerId } : {}),
});

function statsFor(db: MockDb, p: Player): PlayerStats {
  let held = 0;
  let present = 0;
  for (const s of db.sessions) {
    if (s.status !== "closed" || s.sport !== p.sport) continue;
    const e = s.attendance.find((a) => a.playerId === p.id);
    if (e?.mark) {
      held++;
      if (e.mark === "present") present++;
    }
  }
  const matches = db.matches.filter((m) => m.sport === p.sport && m.scores.some((x) => x.playerId === p.id)).length;
  return {
    ...p,
    sessionsHeld: held,
    sessionsPresent: present,
    attendancePct: held === 0 ? 0 : Math.round((present / held) * 1000) / 10,
    matchesPlayed: matches,
    // Integer maths so exactly 75% counts as Ready.
    ready: held > 0 && present * 4 >= held * 3 && matches >= 2,
  };
}

const nameOf = (db: MockDb, id: string) => db.players.find((p) => p.id === id)?.name ?? "";

const sessionOut = (db: MockDb, s: MockSession): PracticeSession => ({
  ...s,
  attendance: s.attendance.map((a) => ({ playerId: a.playerId, playerName: nameOf(db, a.playerId), mark: a.mark })),
});

const matchOut = (db: MockDb, m: MockMatch): Match => ({
  ...m,
  scores: m.scores.map((s) => ({ playerId: s.playerId, playerName: nameOf(db, s.playerId), stats: s.stats })),
});

const isDate = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};
const isSport = (v: unknown): v is Sport => SPORTS.includes(v as Sport);
const isMark = (v: unknown): v is Mark => v === "present" || v === "absent";

const BAD_DATE = fail(400, "date must be a real date in YYYY-MM-DD format.");
const BAD_SPORT = fail(400, `sport must be one of: ${SPORTS.join(", ")}.`);

type Body = Record<string, unknown>;

export async function mockRequest(method: string, path: string, body?: unknown): Promise<MockResponse> {
  await new Promise((r) => setTimeout(r, 150)); // feel like a network call
  const db = loadDb();
  const [pathname, search = ""] = path.split("?");
  const q = new URLSearchParams(search);
  const seg = pathname.split("/").filter(Boolean);
  const b: Body = body && typeof body === "object" ? (body as Body) : {};
  const me = currentUser(db);

  // ---- auth
  if (method === "POST" && pathname === "/auth/login") {
    const username = String(b.username ?? "").trim().toLowerCase();
    const user = db.users.find((u) => u.username === username && u.password === b.password);
    if (!user) return fail(401, "Wrong username or password.");
    localStorage.setItem(USER_KEY, user.id);
    return ok({ user: sessionUser(user) });
  }
  if (method === "POST" && pathname === "/auth/logout") {
    localStorage.removeItem(USER_KEY);
    return ok({ ok: true });
  }
  if (!me) return notLoggedIn();
  if (method === "GET" && pathname === "/auth/me") return ok({ user: sessionUser(me) });

  // ---- players
  if (seg[0] === "players") {
    if (method === "GET" && seg.length === 1) {
      const sport = q.get("sport");
      if (sport && !isSport(sport)) return BAD_SPORT;
      let list = db.players.filter((p) => !sport || p.sport === sport).map((p) => statsFor(db, p));
      if (me.role === "player") list = list.filter((p) => p.id === me.playerId);
      if (me.role === "scout") list = list.filter((p) => p.ready);
      return ok({ players: list.sort((a, c) => a.name.localeCompare(c.name)) });
    }
    if (method === "GET" && seg.length === 2) {
      const p = db.players.find((x) => x.id === seg[1]);
      if (!p || (me.role === "player" && p.id !== me.playerId)) return fail(404, "Player not found.");
      const stats = statsFor(db, p);
      if (me.role === "scout" && !stats.ready) return fail(404, "Player not found.");
      return ok({ player: stats });
    }
    if (method === "GET" && seg.length === 3 && seg[2] === "history") {
      const p = db.players.find((x) => x.id === seg[1]);
      if (!p || (me.role === "player" && p.id !== me.playerId)) return fail(404, "Player not found.");
      if (me.role === "scout" && !statsFor(db, p).ready) return fail(404, "Player not found.");
      const sessions = db.sessions
        .filter((s) => s.status === "closed")
        .flatMap((s) => {
          const mark = s.attendance.find((a) => a.playerId === p.id)?.mark;
          return mark ? [{ id: s.id, date: s.date, sport: s.sport, mark }] : [];
        })
        .sort((a, c) => a.date.localeCompare(c.date));
      const matches = db.matches
        .flatMap((m) => {
          const entry = m.scores.find((x) => x.playerId === p.id);
          return entry ? [{ id: m.id, date: m.date, opponent: m.opponent, stats: entry.stats }] : [];
        })
        .sort((a, c) => c.date.localeCompare(a.date));
      // Academy best in the player's sport: anonymous maxima, same as backend/src/services/peers.js
      const per = new Map<string, { n: number; sums: Record<string, number> }>();
      for (const m of db.matches.filter((x) => x.sport === p.sport)) {
        for (const e of m.scores) {
          const row = per.get(e.playerId) ?? { n: 0, sums: {} };
          row.n++;
          for (const f of SPORT_STATS[p.sport]) row.sums[f.key] = (row.sums[f.key] ?? 0) + (e.stats[f.key] ?? 0);
          per.set(e.playerId, row);
        }
      }
      const best = Object.fromEntries(SPORT_STATS[p.sport].map((f) => [f.key, 0]));
      let most = 0;
      for (const { n, sums } of per.values()) {
        most = Math.max(most, n);
        for (const f of SPORT_STATS[p.sport]) best[f.key] = Math.max(best[f.key], sums[f.key] / n);
      }
      return ok({ history: { sessions, matches, peers: { matches: most, best } } });
    }
    if (method === "PATCH" && seg.length === 2) {
      if (me.role === "scout") return forbidden();
      const p = db.players.find((x) => x.id === seg[1]);
      if (!p || (me.role === "player" && p.id !== me.playerId)) return fail(404, "Player not found.");

      const set: Partial<Record<"photoUrl" | "heightCm" | "weightKg" | "nationality", string | number>> = {};
      const clear: ("photoUrl" | "heightCm" | "weightKg" | "nationality")[] = [];
      const wholeNumber = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

      if (b.heightCm !== undefined) {
        if (b.heightCm === null) clear.push("heightCm");
        else if (!wholeNumber(b.heightCm, 50, 250)) return fail(400, "heightCm must be a whole number between 50 and 250.");
        else set.heightCm = b.heightCm as number;
      }
      if (b.weightKg !== undefined) {
        if (b.weightKg === null) clear.push("weightKg");
        else if (!wholeNumber(b.weightKg, 10, 250)) return fail(400, "weightKg must be a whole number between 10 and 250.");
        else set.weightKg = b.weightKg as number;
      }
      if (b.nationality !== undefined) {
        const n = typeof b.nationality === "string" ? b.nationality.trim() : null;
        if (b.nationality === null) clear.push("nationality");
        else if (!n || n.length < 2 || n.length > 56) return fail(400, "nationality must be 2-56 characters.");
        else if (!/^[\p{L}\p{M} .'’-]+$/u.test(n)) return fail(400, "nationality may only use letters, spaces, dot, dash and apostrophe.");
        else set.nationality = n;
      }
      if (b.photoUrl !== undefined) {
        // Demo mode keeps the shrunken picture itself. The real API only accepts our own Cloudinary URLs.
        if (b.photoUrl === null) clear.push("photoUrl");
        else if (typeof b.photoUrl !== "string" || !b.photoUrl.startsWith("data:image/") || b.photoUrl.length > 600_000) {
          return fail(400, "photoUrl must be the photo you just uploaded for this player.");
        } else set.photoUrl = b.photoUrl;
      }
      if (Object.keys(set).length + clear.length === 0) {
        return fail(400, "Send at least one of: photoUrl, heightCm, weightKg, nationality.");
      }
      Object.assign(p, set);
      for (const k of clear) delete p[k];
      saveDb(db);
      return ok({ player: statsFor(db, p) });
    }
    if (method === "POST" && seg.length === 3 && seg[2] === "photo-signature") {
      if (me.role === "scout") return forbidden();
      return fail(503, "Demo mode keeps photos in the browser, so no upload ticket is needed.");
    }
    if (method === "POST" && seg.length === 1) {
      if (me.role !== "coach") return forbidden();
      const name = String(b.name ?? "").trim();
      const username = String(b.username ?? "").trim().toLowerCase();
      const password = String(b.password ?? "");
      if (!name || name.length > 80) return fail(400, "name must be 1-80 characters.");
      if (!Number.isInteger(b.age) || (b.age as number) < 3 || (b.age as number) > 100) {
        return fail(400, "age must be a whole number between 3 and 100.");
      }
      if (!isSport(b.sport)) return BAD_SPORT;
      if (username.length < 3 || !/^[a-z0-9_.-]+$/.test(username)) {
        return fail(400, "username may only use letters, numbers, dot, dash and underscore.");
      }
      if (password.length < 6) return fail(400, "password must be 6-100 characters.");
      if (db.users.some((u) => u.username === username)) {
        return fail(409, `The username "${username}" is already taken.`);
      }
      const player: Player = { id: nextId(db, "p"), name, age: b.age as number, sport: b.sport };
      db.players.push(player);
      db.users.push({ id: nextId(db, "u"), username, password, role: "player", playerId: player.id });
      saveDb(db);
      return ok({ player }, 201);
    }
  }

  // ---- everything below is coach only
  if ((seg[0] === "sessions" || seg[0] === "matches") && me.role !== "coach") return forbidden();

  // ---- sessions
  if (seg[0] === "sessions") {
    if (method === "GET" && seg.length === 1) {
      const list = [...db.sessions].sort((a, c) => (a.date < c.date ? 1 : a.date > c.date ? -1 : 0));
      return ok({ sessions: list.map((s) => sessionOut(db, s)) });
    }
    if (method === "POST" && seg.length === 1) {
      if (!isDate(b.date)) return BAD_DATE;
      if (!isSport(b.sport)) return BAD_SPORT;
      if (db.sessions.some((s) => s.date === b.date && s.sport === b.sport)) {
        return fail(409, `A ${b.sport} session already exists on ${b.date}.`);
      }
      const s: MockSession = {
        id: nextId(db, "s"),
        date: b.date,
        sport: b.sport,
        status: "open",
        attendance: db.players
          .filter((p) => p.sport === b.sport)
          .sort((a, c) => a.name.localeCompare(c.name))
          .map((p) => ({ playerId: p.id, mark: null })),
      };
      db.sessions.push(s);
      saveDb(db);
      return ok({ session: sessionOut(db, s) }, 201);
    }
    const session = db.sessions.find((s) => s.id === seg[1]);
    if (seg.length >= 2 && !session) return fail(404, "Session not found.");
    if (session) {
      if (method === "GET" && seg.length === 2) return ok({ session: sessionOut(db, session) });
      if (method === "PATCH" && seg[2] === "attendance") {
        if (session.status === "closed") return fail(409, "This session is closed and can no longer be changed.");
        const marks = b.marks;
        if (!Array.isArray(marks) || marks.length === 0) {
          return fail(400, "marks must be a non-empty list of { playerId, mark }.");
        }
        for (const m of marks as { playerId?: string; mark?: unknown }[]) {
          if (!isMark(m?.mark)) return fail(400, "mark must be one of: present, absent.");
          if (!session.attendance.some((a) => a.playerId === m.playerId)) {
            return fail(400, "That player is not on this session's roster.");
          }
        }
        for (const m of marks as { playerId: string; mark: Mark }[]) {
          session.attendance.find((a) => a.playerId === m.playerId)!.mark = m.mark;
        }
        saveDb(db);
        return ok({ session: sessionOut(db, session) });
      }
      if (method === "POST" && seg[2] === "close") {
        if (session.status === "closed") return fail(409, "This session is already closed.");
        const unmarked = session.attendance.filter((a) => !a.mark);
        if (unmarked.length > 0) {
          const names = unmarked.map((a) => nameOf(db, a.playerId));
          return fail(409, `Mark every player before closing. Not marked yet: ${names.join(", ")}.`, {
            unmarked: unmarked.map((a) => ({ playerId: a.playerId, playerName: nameOf(db, a.playerId) })),
          });
        }
        session.status = "closed";
        saveDb(db);
        return ok({ session: sessionOut(db, session) });
      }
    }
  }

  // ---- matches
  if (seg[0] === "matches") {
    if (method === "GET" && seg.length === 1) {
      const list = [...db.matches].sort((a, c) => (a.date < c.date ? 1 : a.date > c.date ? -1 : 0));
      return ok({ matches: list.map((m) => matchOut(db, m)) });
    }
    if (method === "GET" && seg[1] === "eligible") {
      const date = q.get("date");
      const sport = q.get("sport");
      if (!isDate(date)) return BAD_DATE;
      if (!isSport(sport)) return BAD_SPORT;
      return ok({ players: presentOn(db, date, sport) });
    }
    if (method === "POST" && seg.length === 1) {
      if (!isDate(b.date)) return BAD_DATE;
      if (!isSport(b.sport)) return BAD_SPORT;
      const opponent = String(b.opponent ?? "").trim();
      if (!opponent || opponent.length > 80) return fail(400, "opponent must be 1-80 characters.");
      const rawScores = b.scores as { playerId: string; stats?: Record<string, unknown> }[] | undefined;
      if (!Array.isArray(rawScores) || rawScores.length === 0) return fail(400, "Add at least one player to the score sheet.");
      const fields = SPORT_STATS[b.sport];
      const scores: MockMatch["scores"] = [];
      for (const s of rawScores) {
        const given = s.stats && typeof s.stats === "object" && !Array.isArray(s.stats) ? s.stats : {};
        const unknown = Object.keys(given).filter((k) => !fields.some((f) => f.key === k));
        if (unknown.length > 0) return fail(400, `${b.sport} does not record: ${unknown.join(", ")}. Use ${fields.map((f) => f.key).join(", ")}.`);
        const stats: Record<string, number> = {};
        for (const f of fields) {
          const v = given[f.key] ?? 0;
          if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1000) {
            return fail(400, `${f.label} must be a whole number between 0 and 1000.`);
          }
          stats[f.key] = v;
        }
        scores.push({ playerId: s.playerId, stats });
      }
      if (new Set(scores.map((s) => s.playerId)).size !== scores.length) {
        return fail(400, "A player can appear only once on the score sheet.");
      }

      const present = new Set(presentOn(db, b.date, b.sport).map((p) => p.id));
      const refused = scores
        .filter((s) => !present.has(s.playerId))
        .map((s) => {
          const p = db.players.find((x) => x.id === s.playerId);
          if (!p) return { playerId: s.playerId, playerName: "Unknown player", reason: "does not exist" };
          if (p.sport !== b.sport) return { playerId: p.id, playerName: p.name, reason: `plays ${p.sport}, not ${b.sport}` };
          const absent = db.sessions.some(
            (x) => x.date === b.date && x.sport === b.sport && x.attendance.some((a) => a.playerId === p.id && a.mark === "absent")
          );
          return {
            playerId: p.id,
            playerName: p.name,
            reason: absent ? `was absent on ${b.date}` : `was not marked present on ${b.date}`,
          };
        });
      if (refused.length > 0) {
        return fail(422, refused.map((r) => `${r.playerName} ${r.reason}`).join("; ") + ".", { refused });
      }
      const m: MockMatch = { id: nextId(db, "m"), date: b.date, sport: b.sport, opponent, scores };
      db.matches.push(m);
      saveDb(db);
      return ok({ match: matchOut(db, m) }, 201);
    }
  }

  return fail(404, "Not found.");
}

function presentOn(db: MockDb, date: string, sport: Sport): Player[] {
  const ids = new Set<string>();
  for (const s of db.sessions) {
    if (s.date !== date || s.sport !== sport) continue;
    for (const a of s.attendance) if (a.mark === "present") ids.add(a.playerId);
  }
  return db.players.filter((p) => ids.has(p.id) && p.sport === sport).sort((a, c) => a.name.localeCompare(c.name));
}
