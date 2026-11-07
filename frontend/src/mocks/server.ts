// In browser stand in for the backend API (AGENTS.md §5). Same routes, same rules, same error shapes.
// State lives in localStorage so a refresh keeps the demo data. Clear it with: localStorage.clear()
import { SPORTS } from "@/types";
import { SPORT_STATS } from "@/lib/sportStats";
import type { AcademySummary, Mark, Player, PlayerStats, PracticeSession, Match, SessionUser, Sport } from "@/types";
import { seedDb, type MockAcademy, type MockDb, type MockPlayer, type MockSession, type MockMatch, type MockUser } from "./data";

export interface MockResponse {
  status: number;
  body: unknown;
}

const DB_KEY = "academy-mock-db-v5";
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
    const u = db.users.find((x) => x.id === id) ?? null;
    // Same as the backend: a scout the coach has not approved has no session.
    return u && u.role === "scout" && u.status === "pending" ? null : u;
  } catch {
    return null;
  }
}

const academyOut = (a: MockAcademy): AcademySummary => ({
  id: a.id,
  name: a.name,
  ...(a.town ? { town: a.town } : {}),
  sports: SPORTS.filter((s) => a.sports.includes(s)),
});

const sessionUser = (db: MockDb, u: MockUser): SessionUser => ({
  id: u.id,
  username: u.username,
  role: u.role,
  ...(u.playerId ? { playerId: u.playerId } : {}),
  academy: academyOut(db.academies.find((a) => a.id === u.academyId)!),
});

// The signed-in user's academy only. Same objects as in db, so changes to them are saved; adding and removing
// records still goes through db itself.
function scoped(db: MockDb, academyId: string): MockDb {
  return {
    academies: db.academies.filter((a) => a.id === academyId),
    users: db.users.filter((u) => u.academyId === academyId),
    players: db.players.filter((p) => p.academyId === academyId),
    sessions: db.sessions.filter((s) => s.academyId === academyId),
    matches: db.matches.filter((m) => m.academyId === academyId),
    seq: db.seq,
  };
}

const USERNAME_RE = /^[a-z0-9_.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const keyOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

function statsFor(db: MockDb, full: Player | MockPlayer): PlayerStats {
  const { academyId: _academy, ...p } = full as MockPlayer; // never sent to the browser, like the real API
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

  // ---- public: auth and the academy list
  if (method === "GET" && pathname === "/academies") {
    const list = [...db.academies].sort((a, c) => a.name.localeCompare(c.name));
    return ok({ academies: list.map((a) => ({ id: a.id, name: a.name, ...(a.town ? { town: a.town } : {}) })) });
  }
  if (method === "POST" && pathname === "/auth/login") {
    const username = String(b.username ?? "").trim().toLowerCase();
    const user = db.users.find((u) => (u.username === username || u.email === username) && u.password === b.password);
    if (!user) return fail(401, "Wrong username or password.");
    if (user.status === "pending") {
      return fail(403, "Your request is waiting for the coach to approve it. Try again after they do.");
    }
    localStorage.setItem(USER_KEY, user.id);
    return ok({ user: sessionUser(db, user) });
  }
  if (method === "POST" && pathname === "/auth/register-academy") {
    const name = String(b.academyName ?? "").trim();
    const town = String(b.town ?? "").trim();
    const username = String(b.username ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    const sports = Array.isArray(b.sports) ? (b.sports as unknown[]) : [];
    if (name.length < 3 || name.length > 60) return fail(400, "academy name must be 3-60 characters.");
    if (town && (town.length < 2 || town.length > 60)) return fail(400, "town must be 2-60 characters.");
    if (sports.length === 0) return fail(400, "Choose at least one sport.");
    if (!sports.every(isSport)) return BAD_SPORT;
    if (username.length < 3 || username.length > 30 || !USERNAME_RE.test(username)) {
      return fail(400, "username may only use letters, numbers, dot, dash and underscore.");
    }
    if (password.length < 6 || password.length > 100) return fail(400, "password must be 6-100 characters.");
    if (db.academies.some((a) => a.nameKey === keyOf(name))) return fail(409, `An academy called "${name}" is already registered.`);
    if (db.users.some((u) => u.username === username || u.email === username)) return fail(409, `The username "${username}" is already taken.`);
    const academy: MockAcademy = { id: nextId(db, "a"), name, nameKey: keyOf(name), ...(town ? { town } : {}), sports: SPORTS.filter((s) => sports.includes(s)) };
    const coach: MockUser = { id: nextId(db, "u"), username, password, role: "coach", academyId: academy.id, createdAt: new Date().toISOString() };
    db.academies.push(academy);
    db.users.push(coach);
    saveDb(db);
    localStorage.setItem(USER_KEY, coach.id);
    return ok({ user: sessionUser(db, coach) }, 201);
  }
  if (method === "POST" && pathname === "/auth/register-scout") {
    const email = String(b.email ?? "").trim().toLowerCase();
    const password = String(b.password ?? "");
    if (!EMAIL_RE.test(email) || email.length > 120) return fail(400, "email must be a valid email address.");
    if (password.length < 6 || password.length > 100) return fail(400, "password must be 6-100 characters.");
    const academy = db.academies.find((a) => a.id === b.academyId);
    if (!academy) return fail(400, "Choose the academy you want to scout.");
    if (db.users.some((u) => u.email === email || u.username === email)) return fail(409, "An account with this email already exists.");
    db.users.push({ id: nextId(db, "u"), username: email, email, password, role: "scout", status: "pending", createdAt: new Date().toISOString(), academyId: academy.id });
    saveDb(db);
    return ok({ ok: true, message: `Request sent to ${academy.name}. A coach there has to approve it before you can sign in.` }, 201);
  }
  if (method === "POST" && pathname === "/auth/logout") {
    localStorage.removeItem(USER_KEY);
    return ok({ ok: true });
  }
  if (!me) return notLoggedIn();
  const d = scoped(db, me.academyId);
  const academy = db.academies.find((a) => a.id === me.academyId)!;
  const runs = (sport: unknown) => isSport(sport) && academy.sports.includes(sport);
  const NOT_RUN = (sport: unknown) => fail(400, `${academy.name} does not run ${String(sport)}. Add it in Academy settings first.`);
  if (method === "GET" && pathname === "/auth/me") return ok({ user: sessionUser(db, me) });

  // ---- the academy itself
  if (pathname === "/academy") {
    if (method === "GET") return ok({ academy: academyOut(academy) });
    if (method === "PATCH") {
      if (me.role !== "coach") return forbidden();
      let changed = false;
      if (b.name !== undefined) {
        const name = String(b.name ?? "").trim();
        if (name.length < 3 || name.length > 60) return fail(400, "academy name must be 3-60 characters.");
        if (db.academies.some((a) => a.id !== academy.id && a.nameKey === keyOf(name))) return fail(409, `An academy called "${name}" is already registered.`);
        academy.name = name;
        academy.nameKey = keyOf(name);
        changed = true;
      }
      if (b.town !== undefined) {
        const town = String(b.town ?? "").trim();
        if (town && (town.length < 2 || town.length > 60)) return fail(400, "town must be 2-60 characters.");
        if (town) academy.town = town;
        else delete academy.town;
        changed = true;
      }
      if (b.sports !== undefined) {
        const sports = Array.isArray(b.sports) ? (b.sports as unknown[]) : [];
        if (sports.length === 0) return fail(400, "Choose at least one sport.");
        if (!sports.every(isSport)) return BAD_SPORT;
        const stillUsed = academy.sports.filter((s) => !sports.includes(s) && d.players.some((p) => p.sport === s));
        if (stillUsed.length > 0) {
          return fail(409, `${stillUsed.join(" and ")} still ${stillUsed.length === 1 ? "has" : "have"} players, so it cannot be removed.`, { stillUsed });
        }
        academy.sports = SPORTS.filter((s) => sports.includes(s));
        changed = true;
      }
      if (!changed) return fail(400, "Send at least one of: name, town, sports.");
      saveDb(db);
      return ok({ academy: academyOut(academy) });
    }
  }

  // ---- coach accounts (coach only)
  if (seg[0] === "users" && seg[1] === "coaches") {
    if (me.role !== "coach") return forbidden();
    const out = (u: MockUser) => ({ id: u.id, username: u.username, you: u.id === me.id, createdAt: u.createdAt ?? "2026-10-01T00:00:00.000Z" });
    if (method === "GET" && seg.length === 2) {
      return ok({ coaches: d.users.filter((u) => u.role === "coach").sort((a, c) => (a.createdAt ?? "").localeCompare(c.createdAt ?? "")).map(out) });
    }
    if (method === "POST" && seg.length === 2) {
      const username = String(b.username ?? "").trim().toLowerCase();
      const password = String(b.password ?? "");
      if (username.length < 3 || username.length > 30 || !USERNAME_RE.test(username)) {
        return fail(400, "username may only use letters, numbers, dot, dash and underscore.");
      }
      if (password.length < 6 || password.length > 100) return fail(400, "password must be 6-100 characters.");
      if (db.users.some((u) => u.username === username || u.email === username)) return fail(409, `The username "${username}" is already taken.`);
      const u: MockUser = { id: nextId(db, "u"), username, password, role: "coach", academyId: academy.id, createdAt: new Date().toISOString() };
      db.users.push(u);
      saveDb(db);
      return ok({ coach: out(u) }, 201);
    }
    if (method === "DELETE" && seg.length === 3) {
      if (seg[2] === me.id) return fail(400, "You cannot remove your own coach account.");
      const u = d.users.find((x) => x.id === seg[2] && x.role === "coach");
      if (!u) return fail(404, "Coach not found.");
      db.users = db.users.filter((x) => x.id !== u.id);
      saveDb(db);
      return ok({ ok: true });
    }
  }

  // ---- scout accounts (coach only)
  if (seg[0] === "users" && seg[1] === "scouts") {
    if (me.role !== "coach") return forbidden();
    const out = (u: MockUser) => ({ id: u.id, email: u.email ?? u.username, status: u.status ?? "active", createdAt: u.createdAt ?? "2026-10-01T00:00:00.000Z" });
    const scoutOf = (id: string | undefined) => d.users.find((u) => u.id === id && u.role === "scout");
    if (method === "GET" && seg.length === 2) {
      const all = d.users.filter((u) => u.role === "scout").sort((a, c) => (c.createdAt ?? "").localeCompare(a.createdAt ?? ""));
      const list = [...all.filter((u) => u.status === "pending"), ...all.filter((u) => u.status !== "pending")];
      return ok({ scouts: list.map(out) });
    }
    if (method === "POST" && seg.length === 2) {
      const email = String(b.email ?? "").trim().toLowerCase();
      const password = String(b.password ?? "");
      if (!EMAIL_RE.test(email) || email.length > 120) return fail(400, "email must be a valid email address.");
      if (password.length < 6 || password.length > 100) return fail(400, "password must be 6-100 characters.");
      if (d.users.some((u) => u.email === email || u.username === email)) return fail(409, "An account with this email already exists.");
      const u: MockUser = { id: nextId(db, "u"), username: email, email, password, role: "scout", status: "active", createdAt: new Date().toISOString(), academyId: academy.id };
      db.users.push(u);
      saveDb(db);
      return ok({ scout: out(u) }, 201);
    }
    if (method === "PATCH" && seg.length === 4 && seg[3] === "approve") {
      const u = scoutOf(seg[2]);
      if (!u) return fail(404, "Scout not found.");
      u.status = "active";
      saveDb(db);
      return ok({ scout: out(u) });
    }
    if (method === "DELETE" && seg.length === 3) {
      const u = scoutOf(seg[2]);
      if (!u) return fail(404, "Scout not found.");
      db.users = db.users.filter((x) => x.id !== u.id);
      saveDb(db);
      return ok({ ok: true });
    }
  }

  // ---- players
  if (seg[0] === "players") {
    if (method === "GET" && seg.length === 1) {
      const sport = q.get("sport");
      if (sport && !isSport(sport)) return BAD_SPORT;
      let list = d.players.filter((p) => !sport || p.sport === sport).map((p) => statsFor(d, p));
      if (me.role === "player") list = list.filter((p) => p.id === me.playerId);
      if (me.role === "scout") list = list.filter((p) => p.ready);
      return ok({ players: list.sort((a, c) => a.name.localeCompare(c.name)) });
    }
    if (method === "GET" && seg.length === 2) {
      const p = d.players.find((x) => x.id === seg[1]);
      if (!p || (me.role === "player" && p.id !== me.playerId)) return fail(404, "Player not found.");
      const stats = statsFor(d, p);
      if (me.role === "scout" && !stats.ready) return fail(404, "Player not found.");
      return ok({ player: stats });
    }
    if (method === "GET" && seg.length === 3 && seg[2] === "history") {
      const p = d.players.find((x) => x.id === seg[1]);
      if (!p || (me.role === "player" && p.id !== me.playerId)) return fail(404, "Player not found.");
      if (me.role === "scout" && !statsFor(d, p).ready) return fail(404, "Player not found.");
      const sessions = d.sessions
        .filter((s) => s.status === "closed")
        .flatMap((s) => {
          const mark = s.attendance.find((a) => a.playerId === p.id)?.mark;
          return mark ? [{ id: s.id, date: s.date, sport: s.sport, mark }] : [];
        })
        .sort((a, c) => a.date.localeCompare(c.date));
      const matches = d.matches
        .flatMap((m) => {
          const entry = m.scores.find((x) => x.playerId === p.id);
          return entry ? [{ id: m.id, date: m.date, opponent: m.opponent, stats: entry.stats }] : [];
        })
        .sort((a, c) => c.date.localeCompare(a.date));
      // Academy best in the player's sport: anonymous maxima, same as backend/src/services/peers.js
      const per = new Map<string, { n: number; sums: Record<string, number> }>();
      for (const m of d.matches.filter((x) => x.sport === p.sport)) {
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
      const p = d.players.find((x) => x.id === seg[1]);
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
      return ok({ player: statsFor(d, p) });
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
      if (!runs(b.sport)) return NOT_RUN(b.sport);
      if (username.length < 3 || !/^[a-z0-9_.-]+$/.test(username)) {
        return fail(400, "username may only use letters, numbers, dot, dash and underscore.");
      }
      if (password.length < 6) return fail(400, "password must be 6-100 characters.");
      if (db.users.some((u) => u.username === username || u.email === username)) {
        return fail(409, `The username "${username}" is already taken.`);
      }
      const player: MockPlayer = { id: nextId(db, "p"), academyId: academy.id, name, age: b.age as number, sport: b.sport };
      db.players.push(player);
      db.users.push({ id: nextId(db, "u"), username, password, role: "player", playerId: player.id, academyId: academy.id });
      saveDb(db);
      const { academyId: _a, ...out } = player;
      return ok({ player: out }, 201);
    }
  }

  // ---- everything below is coach only
  if ((seg[0] === "sessions" || seg[0] === "matches") && me.role !== "coach") return forbidden();

  // ---- sessions
  if (seg[0] === "sessions") {
    if (method === "GET" && seg.length === 1) {
      const list = [...d.sessions].sort((a, c) => (a.date < c.date ? 1 : a.date > c.date ? -1 : 0));
      return ok({ sessions: list.map((s) => sessionOut(d, s)) });
    }
    if (method === "POST" && seg.length === 1) {
      if (!isDate(b.date)) return BAD_DATE;
      if (!isSport(b.sport)) return BAD_SPORT;
      if (!runs(b.sport)) return NOT_RUN(b.sport);
      if (d.sessions.some((s) => s.date === b.date && s.sport === b.sport)) {
        return fail(409, `A ${b.sport} session already exists on ${b.date}.`);
      }
      const s: MockSession = {
        id: nextId(db, "s"),
        academyId: academy.id,
        date: b.date,
        sport: b.sport,
        status: "open",
        attendance: d.players
          .filter((p) => p.sport === b.sport)
          .sort((a, c) => a.name.localeCompare(c.name))
          .map((p) => ({ playerId: p.id, mark: null })),
      };
      db.sessions.push(s);
      saveDb(db);
      return ok({ session: sessionOut(d, s) }, 201);
    }
    const session = d.sessions.find((s) => s.id === seg[1]);
    if (seg.length >= 2 && !session) return fail(404, "Session not found.");
    if (session) {
      if (method === "GET" && seg.length === 2) return ok({ session: sessionOut(d, session) });
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
        return ok({ session: sessionOut(d, session) });
      }
      if (method === "POST" && seg[2] === "close") {
        if (session.status === "closed") return fail(409, "This session is already closed.");
        const unmarked = session.attendance.filter((a) => !a.mark);
        if (unmarked.length > 0) {
          const names = unmarked.map((a) => nameOf(d, a.playerId));
          return fail(409, `Mark every player before closing. Not marked yet: ${names.join(", ")}.`, {
            unmarked: unmarked.map((a) => ({ playerId: a.playerId, playerName: nameOf(d, a.playerId) })),
          });
        }
        session.status = "closed";
        saveDb(db);
        return ok({ session: sessionOut(d, session) });
      }
    }
  }

  // ---- matches
  if (seg[0] === "matches") {
    if (method === "GET" && seg.length === 1) {
      const list = [...d.matches].sort((a, c) => (a.date < c.date ? 1 : a.date > c.date ? -1 : 0));
      return ok({ matches: list.map((m) => matchOut(d, m)) });
    }
    if (method === "GET" && seg[1] === "eligible") {
      const date = q.get("date");
      const sport = q.get("sport");
      if (!isDate(date)) return BAD_DATE;
      if (!isSport(sport)) return BAD_SPORT;
      return ok({ players: presentOn(d, date, sport) });
    }
    if (method === "POST" && seg.length === 1) {
      if (!isDate(b.date)) return BAD_DATE;
      if (!isSport(b.sport)) return BAD_SPORT;
      if (!runs(b.sport)) return NOT_RUN(b.sport);
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

      const present = new Set(presentOn(d, b.date, b.sport).map((p) => p.id));
      const refused = scores
        .filter((s) => !present.has(s.playerId))
        .map((s) => {
          const p = d.players.find((x) => x.id === s.playerId);
          if (!p) return { playerId: s.playerId, playerName: "Unknown player", reason: "does not exist" };
          if (p.sport !== b.sport) return { playerId: p.id, playerName: p.name, reason: `plays ${p.sport}, not ${b.sport}` };
          const absent = d.sessions.some(
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
      const m: MockMatch = { id: nextId(db, "m"), academyId: academy.id, date: b.date, sport: b.sport, opponent, scores };
      db.matches.push(m);
      saveDb(db);
      return ok({ match: matchOut(d, m) }, 201);
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
