import { academyBest } from "../services/peers.js";
import { Router } from "express";
import bcrypt from "bcryptjs";
import Player from "../models/Player.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Match from "../models/Match.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getPlayerStats } from "../services/stats.js";
import { cloudinaryConfig, createUploadTicket, isPlayerPhotoUrl } from "../services/cloudinary.js";
import { HttpError } from "../utils/httpError.js";
import { playerJSON } from "../utils/toJSON.js";
import {
  assertBody,
  assertSport,
  assertString,
  assertInt,
  isObjectId,
} from "../utils/validate.js";

const router = Router();
router.use(requireAuth);

// coach: everyone. scout: only Ready players. player: only themselves.
router.get("/", async (req, res) => {
  const { role, playerId } = req.user;
  const filter = {};
  if (req.query.sport !== undefined) filter.sport = assertSport(req.query.sport);

  if (role === "player") {
    if (!isObjectId(playerId)) return res.json({ players: [] });
    filter._id = playerId;
  }

  let players = await getPlayerStats(filter);
  if (role === "scout") players = players.filter((p) => p.ready);
  res.json({ players });
});

// The one visibility rule for a single player: coach any, player only themselves, scout only Ready.
async function visiblePlayer(req) {
  const { role, playerId } = req.user;
  const { id } = req.params;
  const notFound = new HttpError(404, "Player not found.");

  if (!isObjectId(id)) throw notFound;
  if (role === "player" && id !== playerId) throw notFound;

  const [player] = await getPlayerStats({ _id: id });
  if (!player || (role === "scout" && !player.ready)) throw notFound;
  return player;
}

router.get("/:id", async (req, res) => {
  res.json({ player: await visiblePlayer(req) });
});

// Closed sessions the player was marked in (oldest first) and matches they scored in (newest first).
router.get("/:id/history", async (req, res) => {
  const player = await visiblePlayer(req);
  const [sessions, matches, sportMatches] = await Promise.all([
    Session.find({ status: "closed", "attendance.player": player.id }).sort({ date: 1, createdAt: 1 }).lean(),
    Match.find({ "scores.player": player.id }).sort({ date: -1, createdAt: -1 }).lean(),
    Match.find({ sport: player.sport }).lean(),
  ]);
  res.json({
    history: {
      sessions: sessions.flatMap((s) => {
        const mark = s.attendance.find((a) => String(a.player) === player.id)?.mark;
        return mark ? [{ id: String(s._id), date: s.date, sport: s.sport, mark }] : [];
      }),
      matches: matches.map((m) => ({
        id: String(m._id),
        date: m.date,
        opponent: m.opponent,
        stats: { ...(m.scores.find((x) => String(x.player) === player.id).stats ?? {}) },
      })),
      peers: academyBest(player.sport, sportMatches),
    },
  });
});

// Adding a player also creates that player's login.
router.post("/", requireRole("coach"), async (req, res) => {
  const body = assertBody(req);
  const name = assertString(body.name, "name");
  const age = assertInt(body.age, "age", { min: 3, max: 100 });
  const sport = assertSport(body.sport);
  const username = assertString(body.username, "username", { min: 3, max: 30 }).toLowerCase();
  const password = assertString(body.password, "password", { min: 6, max: 100 });
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    throw new HttpError(400, "username may only use letters, numbers, dot, dash and underscore.");
  }

  const taken = () => new HttpError(409, `The username "${username}" is already taken.`);
  if (await User.exists({ username })) throw taken();

  const player = await Player.create({ name, age, sport });
  try {
    await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: "player",
      playerId: player._id,
    });
  } catch (err) {
    await Player.deleteOne({ _id: player._id });
    throw err.code === 11000 ? taken() : err;
  }
  res.status(201).json({ player: playerJSON(player) });
});

// ---- Profile and photo (AGENTS.md §3): a player changes only their own, the coach changes anyone's.
const canEdit = requireRole("coach", "player");

function ownedPlayerId(req) {
  const { role, playerId } = req.user;
  const { id } = req.params;
  const notFound = new HttpError(404, "Player not found.");
  if (!isObjectId(id)) throw notFound;
  if (role === "player" && id !== playerId) throw notFound;
  return id;
}

const NATIONALITY_RE = /^[\p{L}\p{M} .'’-]+$/u;

// Every field is optional. null clears it.
router.patch("/:id", canEdit, async (req, res) => {
  const id = ownedPlayerId(req);
  const body = assertBody(req);
  const $set = {};
  const $unset = {};
  const apply = (key, value) => (value === null ? ($unset[key] = "") : ($set[key] = value));

  if (body.heightCm !== undefined) {
    apply("heightCm", body.heightCm === null ? null : assertInt(body.heightCm, "heightCm", { min: 50, max: 250 }));
  }
  if (body.weightKg !== undefined) {
    apply("weightKg", body.weightKg === null ? null : assertInt(body.weightKg, "weightKg", { min: 10, max: 250 }));
  }
  if (body.nationality !== undefined) {
    if (body.nationality === null) apply("nationality", null);
    else {
      const n = assertString(body.nationality, "nationality", { min: 2, max: 56 });
      if (!NATIONALITY_RE.test(n)) throw new HttpError(400, "nationality may only use letters, spaces, dot, dash and apostrophe.");
      apply("nationality", n);
    }
  }
  if (body.photoUrl !== undefined) {
    if (body.photoUrl === null) apply("photoUrl", null);
    else {
      const cfg = cloudinaryConfig();
      if (!cfg) throw new HttpError(503, "Photo upload is not set up yet. Ask the coach to add the Cloudinary keys.");
      if (!isPlayerPhotoUrl(body.photoUrl, id, cfg.cloudName)) {
        throw new HttpError(400, "photoUrl must be the photo you just uploaded for this player.");
      }
      apply("photoUrl", body.photoUrl);
    }
  }
  if (Object.keys($set).length + Object.keys($unset).length === 0) {
    throw new HttpError(400, "Send at least one of: photoUrl, heightCm, weightKg, nationality.");
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  const result = await Player.updateOne({ _id: id }, update);
  if (result.matchedCount === 0) throw new HttpError(404, "Player not found.");

  const [player] = await getPlayerStats({ _id: id });
  res.json({ player });
});

// Everything the browser needs to upload one photo straight to Cloudinary.
router.post("/:id/photo-signature", canEdit, async (req, res) => {
  const id = ownedPlayerId(req);
  const cfg = cloudinaryConfig();
  if (!cfg) throw new HttpError(503, "Photo upload is not set up yet. Ask the coach to add the Cloudinary keys.");
  if (!(await Player.exists({ _id: id }))) throw new HttpError(404, "Player not found.");
  res.json({ ticket: createUploadTicket(id, cfg) });
});

export default router;
