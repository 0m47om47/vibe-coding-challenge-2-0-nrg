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
import { assertBody, assertEmail, assertString } from "../utils/validate.js";

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

  // Players and the coach use a username, scouts use their email.
  const user = await User.findOne({ $or: [{ username }, { email: username }] });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Wrong username or password.");
  // Checked after the password, so a stranger cannot learn which emails are waiting.
  if (user.status === "pending") {
    throw new HttpError(403, "Your request is waiting for the coach to approve it. Try again after they do.");
  }

  setAuthCookie(res, signToken(user));
  res.json({ user: sessionUser(user) });
});

// A scout asks for access with their email. The account stays pending until the coach approves it,
// so signing up alone gives no access to any player data.
router.post("/register-scout", async (req, res) => {
  const body = assertBody(req);
  const email = assertEmail(body.email);
  const password = assertString(body.password, "password", { min: 6, max: 100 });

  const taken = () => new HttpError(409, "An account with this email already exists.");
  if (await User.exists({ $or: [{ email }, { username: email }] })) throw taken();
  try {
    await User.create({ username: email, email, passwordHash: await bcrypt.hash(password, 10), role: "scout", status: "pending" });
  } catch (err) {
    throw err.code === 11000 ? taken() : err;
  }
  res.status(201).json({ ok: true, message: "Request sent. The coach has to approve it before you can sign in." });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
