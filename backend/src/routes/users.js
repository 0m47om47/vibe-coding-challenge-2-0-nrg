import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { assertBody, assertEmail, assertString, isObjectId } from "../utils/validate.js";

const router = Router();
router.use(requireAuth, requireRole("coach"));

const scoutJSON = (u) => ({
  id: String(u._id),
  email: u.email ?? u.username,
  status: u.status,
  createdAt: u.createdAt.toISOString(),
});

// Scouts only, newest first. Pending requests come first so the coach sees them.
router.get("/scouts", async (_req, res) => {
  const scouts = await User.find({ role: "scout" }).sort({ createdAt: -1 });
  const pending = scouts.filter((s) => s.status === "pending");
  const active = scouts.filter((s) => s.status !== "pending");
  res.json({ scouts: [...pending, ...active].map(scoutJSON) });
});

// The coach creates a scout directly. That account is active at once.
router.post("/scouts", async (req, res) => {
  const body = assertBody(req);
  const email = assertEmail(body.email);
  const password = assertString(body.password, "password", { min: 6, max: 100 });
  const taken = () => new HttpError(409, "An account with this email already exists.");
  if (await User.exists({ $or: [{ email }, { username: email }] })) throw taken();
  let user;
  try {
    user = await User.create({ username: email, email, passwordHash: await bcrypt.hash(password, 10), role: "scout", status: "active" });
  } catch (err) {
    throw err.code === 11000 ? taken() : err;
  }
  res.status(201).json({ scout: scoutJSON(user) });
});

async function findScout(req) {
  const { id } = req.params;
  const user = isObjectId(id) ? await User.findOne({ _id: id, role: "scout" }) : null;
  if (!user) throw new HttpError(404, "Scout not found.");
  return user;
}

router.patch("/scouts/:id/approve", async (req, res) => {
  const user = await findScout(req);
  user.status = "active";
  await user.save();
  res.json({ scout: scoutJSON(user) });
});

// Rejects a pending request or removes an active scout. Only scout accounts can be deleted here.
router.delete("/scouts/:id", async (req, res) => {
  const user = await findScout(req);
  await user.deleteOne();
  res.json({ ok: true });
});

export default router;
