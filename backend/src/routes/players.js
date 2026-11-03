import { Router } from "express";
import bcrypt from "bcryptjs";
import Player from "../models/Player.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getPlayerStats } from "../services/stats.js";
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

router.get("/:id", async (req, res) => {
  const { role, playerId } = req.user;
  const { id } = req.params;
  const notFound = new HttpError(404, "Player not found.");

  if (!isObjectId(id)) throw notFound;
  if (role === "player" && id !== playerId) throw notFound;

  const [player] = await getPlayerStats({ _id: id });
  if (!player || (role === "scout" && !player.ready)) throw notFound;
  res.json({ player });
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

export default router;
