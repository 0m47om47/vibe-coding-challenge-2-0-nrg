import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { assertBody, assertEmail, assertString, isObjectId } from "../utils/validate.js";
import { assertUsername } from "../utils/academy.js";

// Coach only. Scout and coach accounts of the coach's own academy. Nothing here reaches another academy.
const router = Router();
router.use(requireAuth, requireRole("coach"));

const mine = (req) => ({ academyId: req.user.academyId });

// ---------------------------------------------------------------- scouts
const scoutJSON = (u) => ({
  id: String(u._id),
  email: u.email ?? u.username,
  status: u.status,
  createdAt: u.createdAt.toISOString(),
});

// Pending requests first so the coach sees them, then active scouts. Newest first in each group.
router.get("/scouts", async (req, res) => {
  const scouts = await User.find({ ...mine(req), role: "scout" }).sort({ createdAt: -1 });
  const pending = scouts.filter((s) => s.status === "pending");
  const active = scouts.filter((s) => s.status !== "pending");
  res.json({ scouts: [...pending, ...active].map(scoutJSON) });
});

// The coach creates a scout directly for this academy. That account is active at once.
router.post("/scouts", async (req, res) => {
  const body = assertBody(req);
  const email = assertEmail(body.email);
  const password = assertString(body.password, "password", { min: 6, max: 100 });
  const taken = () => new HttpError(409, "An account with this email already exists.");
  if (await User.exists({ $or: [{ email }, { username: email }] })) throw taken();
  let user;
  try {
    user = await User.create({
      username: email,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "scout",
      status: "active",
      academyId: req.user.academyId,
    });
  } catch (err) {
    throw err.code === 11000 ? taken() : err;
  }
  res.status(201).json({ scout: scoutJSON(user) });
});

async function findMine(req, role, notFound) {
  const { id } = req.params;
  const user = isObjectId(id) ? await User.findOne({ _id: id, role, ...mine(req) }) : null;
  if (!user) throw new HttpError(404, notFound);
  return user;
}

router.patch("/scouts/:id/approve", async (req, res) => {
  const user = await findMine(req, "scout", "Scout not found.");
  user.status = "active";
  await user.save();
  res.json({ scout: scoutJSON(user) });
});

// Rejects a pending request or removes an active scout. Only scout accounts of this academy.
router.delete("/scouts/:id", async (req, res) => {
  const user = await findMine(req, "scout", "Scout not found.");
  await user.deleteOne();
  res.json({ ok: true });
});

// ---------------------------------------------------------------- coaches
const coachJSON = (u, meId) => ({ id: String(u._id), username: u.username, you: String(u._id) === meId, createdAt: u.createdAt.toISOString() });

router.get("/coaches", async (req, res) => {
  const coaches = await User.find({ ...mine(req), role: "coach" }).sort({ createdAt: 1 });
  res.json({ coaches: coaches.map((c) => coachJSON(c, req.user.id)) });
});

// Another coach for the same academy. Same powers as the first one.
router.post("/coaches", async (req, res) => {
  const body = assertBody(req);
  const username = assertUsername(body.username);
  const password = assertString(body.password, "password", { min: 6, max: 100 });
  const taken = () => new HttpError(409, `The username "${username}" is already taken.`);
  if (await User.exists({ $or: [{ username }, { email: username }] })) throw taken();
  let user;
  try {
    user = await User.create({ username, passwordHash: await bcrypt.hash(password, 10), role: "coach", academyId: req.user.academyId });
  } catch (err) {
    throw err.code === 11000 ? taken() : err;
  }
  res.status(201).json({ coach: coachJSON(user, req.user.id) });
});

// A coach can remove another coach of the same academy, never themselves, so an academy always keeps one.
router.delete("/coaches/:id", async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, "You cannot remove your own coach account.");
  const user = await findMine(req, "coach", "Coach not found.");
  await user.deleteOne();
  res.json({ ok: true });
});

export default router;
