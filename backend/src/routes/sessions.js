import { Router } from "express";
import Player from "../models/Player.js";
import Session from "../models/Session.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { sessionJSON } from "../utils/toJSON.js";
import {
  assertBody,
  assertDate,
  assertSport,
  assertMark,
  assertObjectId,
  isObjectId,
} from "../utils/validate.js";

const router = Router();
router.use(requireAuth, requireRole("coach"));

const loadPopulated = (id) => Session.findById(id).populate("attendance.player", "name");

async function findSession(id) {
  if (!isObjectId(id)) throw new HttpError(404, "Session not found.");
  const session = await loadPopulated(id);
  if (!session) throw new HttpError(404, "Session not found.");
  return session;
}

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.sport !== undefined) filter.sport = assertSport(req.query.sport);
  if (req.query.date !== undefined) filter.date = assertDate(req.query.date);
  const sessions = await Session.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .populate("attendance.player", "name");
  res.json({ sessions: sessions.map(sessionJSON) });
});

// 1. Open: date + sport. The roster is every player of that sport right now.
router.post("/", async (req, res) => {
  const body = assertBody(req);
  const date = assertDate(body.date);
  const sport = assertSport(body.sport);

  const exists = () => new HttpError(409, `A ${sport} session already exists on ${date}.`);
  if (await Session.exists({ sport, date })) throw exists();

  const roster = await Player.find({ sport }).sort({ name: 1 }).select("_id");
  let created;
  try {
    created = await Session.create({
      date,
      sport,
      attendance: roster.map((p) => ({ player: p._id, mark: null })),
    });
  } catch (err) {
    throw err.code === 11000 ? exists() : err;
  }
  res.status(201).json({ session: sessionJSON(await loadPopulated(created._id)) });
});

router.get("/:id", async (req, res) => {
  res.json({ session: sessionJSON(await findSession(req.params.id)) });
});

// 2. Mark: set Present / Absent. All-or-nothing; refused once the session is closed.
router.patch("/:id/attendance", async (req, res) => {
  const session = await findSession(req.params.id);
  if (session.status === "closed") {
    throw new HttpError(409, "This session is closed and can no longer be changed.");
  }

  const { marks } = assertBody(req);
  if (!Array.isArray(marks) || marks.length === 0) {
    throw new HttpError(400, "marks must be a non-empty list of { playerId, mark }.");
  }

  const updates = marks.map((m) => ({
    playerId: assertObjectId(m?.playerId, "playerId"),
    mark: assertMark(m?.mark),
  }));
  const entries = new Map(updates.map((u) => {
    const entry = session.attendance.find((e) => String(e.player._id) === u.playerId);
    if (!entry) throw new HttpError(400, "That player is not on this session's roster.");
    return [u.playerId, entry];
  }));
  for (const u of updates) entries.get(u.playerId).mark = u.mark;

  // Only write if still open (guards against a close racing this request).
  const result = await Session.updateOne(
    { _id: session._id, status: "open" },
    { $set: { attendance: session.attendance.map((e) => ({ player: e.player._id, mark: e.mark })) } }
  );
  if (result.matchedCount === 0) {
    throw new HttpError(409, "This session is closed and can no longer be changed.");
  }
  res.json({ session: sessionJSON(await loadPopulated(session._id)) });
});

// 3. Close: locks the session. Everyone on the roster must be marked first.
router.post("/:id/close", async (req, res) => {
  const session = await findSession(req.params.id);
  if (session.status === "closed") {
    throw new HttpError(409, "This session is already closed.");
  }
  const unmarked = session.attendance.filter((e) => !e.mark);
  if (unmarked.length > 0) {
    throw new HttpError(
      409,
      `Mark every player before closing. Not marked yet: ${unmarked.map((e) => e.player.name).join(", ")}.`,
      { unmarked: unmarked.map((e) => ({ playerId: String(e.player._id), playerName: e.player.name })) }
    );
  }

  const result = await Session.updateOne({ _id: session._id, status: "open" }, { $set: { status: "closed" } });
  if (result.matchedCount === 0) throw new HttpError(409, "This session is already closed.");
  res.json({ session: sessionJSON(await loadPopulated(session._id)) });
});

export default router;
