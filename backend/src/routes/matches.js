import { Router } from "express";
import Player from "../models/Player.js";
import Session from "../models/Session.js";
import Match from "../models/Match.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { matchJSON, playerJSON } from "../utils/toJSON.js";
import { marksFromSessions, refusedPlayers } from "../services/matchRules.js";
import {
  assertBody,
  assertDate,
  assertSport,
  assertString,
  assertInt,
  assertObjectId,
} from "../utils/validate.js";

const router = Router();
router.use(requireAuth, requireRole("coach"));

router.get("/", async (_req, res) => {
  const matches = await Match.find()
    .sort({ date: -1, createdAt: -1 })
    .populate("scores.player", "name");
  res.json({ matches: matches.map(matchJSON) });
});

// Who was present that day: the players who may go on the sheet.
router.get("/eligible", async (req, res) => {
  const date = assertDate(req.query.date);
  const sport = assertSport(req.query.sport);

  const sessions = await Session.find({ date, sport }).lean();
  const marks = marksFromSessions(sessions);
  const presentIds = [...marks].filter(([, m]) => m === "present").map(([id]) => id);

  const players = await Player.find({ _id: { $in: presentIds }, sport }).sort({ name: 1 });
  res.json({ players: players.map(playerJSON) });
});

router.post("/", async (req, res) => {
  const body = assertBody(req);
  const date = assertDate(body.date);
  const sport = assertSport(body.sport);
  const opponent = assertString(body.opponent, "opponent");

  if (!Array.isArray(body.scores) || body.scores.length === 0) {
    throw new HttpError(400, "Add at least one player to the score sheet.");
  }
  const entries = body.scores.map((s) => ({
    playerId: assertObjectId(s?.playerId, "playerId"),
    score: assertInt(s?.score, "score", { min: 0, max: 1000 }),
  }));
  const ids = entries.map((e) => e.playerId);
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(400, "A player can appear only once on the score sheet.");
  }

  const [players, sessions] = await Promise.all([
    Player.find({ _id: { $in: ids } }).lean(),
    Session.find({ date, sport }).lean(),
  ]);
  const refused = refusedPlayers({
    date,
    sport,
    playerIds: ids,
    playersById: new Map(players.map((p) => [String(p._id), p])),
    marksById: marksFromSessions(sessions),
  });
  if (refused.length > 0) {
    throw new HttpError(
      422,
      refused.map((r) => `${r.playerName} ${r.reason}`).join("; ") + ".",
      { refused }
    );
  }

  const match = await Match.create({
    date,
    sport,
    opponent,
    scores: entries.map((e) => ({ player: e.playerId, score: e.score })),
  });
  const saved = await Match.findById(match._id).populate("scores.player", "name");
  res.status(201).json({ match: matchJSON(saved) });
});

export default router;
