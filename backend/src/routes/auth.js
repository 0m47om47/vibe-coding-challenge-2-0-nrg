import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import {
  requireAuth,
  signToken,
  setAuthCookie,
  clearAuthCookie,
} from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { assertBody, assertString } from "../utils/validate.js";

const router = Router();

// Compared against when the username is unknown, so both failures take similar time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const sessionUser = (u) => ({
  id: String(u._id),
  username: u.username,
  role: u.role,
  ...(u.playerId ? { playerId: String(u.playerId) } : {}),
});

router.post("/login", async (req, res) => {
  const body = assertBody(req);
  const username = assertString(body.username, "username", { max: 40 }).toLowerCase();
  const password = assertString(body.password, "password", { max: 100 });

  const user = await User.findOne({ username });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Wrong username or password.");

  setAuthCookie(res, signToken(user));
  res.json({ user: sessionUser(user) });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
