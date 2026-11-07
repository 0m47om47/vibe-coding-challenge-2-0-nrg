import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Academy from "../models/Academy.js";
import { requireAuth, signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { assertBody, assertEmail, assertString, isObjectId } from "../utils/validate.js";
import { academyJSON, assertAcademyName, assertSportList, assertTown, assertUsername } from "../utils/academy.js";

const router = Router();

// Compared against when the username is unknown, so both failures take similar time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// SessionUser (AGENTS.md §4): who is signed in, and the academy they belong to.
export const sessionUser = (u, academy) => ({
  id: String(u._id ?? u.id),
  username: u.username,
  role: u.role,
  ...(u.playerId ? { playerId: String(u.playerId) } : {}),
  academy: academyJSON(academy),
});

router.post("/login", async (req, res) => {
  const body = assertBody(req);
  const username = assertString(body.username, "username", { max: 120 }).toLowerCase();
  const password = assertString(body.password, "password", { max: 100 });

  // Players and coaches use a username, scouts use their email.
  const user = await User.findOne({ $or: [{ username }, { email: username }] });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Wrong username or password.");
  // Checked after the password, so a stranger cannot learn which emails are waiting.
  if (user.status === "pending") {
    throw new HttpError(403, "Your request is waiting for the coach to approve it. Try again after they do.");
  }
  const academy = await Academy.findById(user.academyId);
  if (!academy) throw new HttpError(401, "This account is not linked to an academy.");

  setAuthCookie(res, signToken(user));
  res.json({ user: sessionUser(user, academy) });
});

// A new academy signs up: the academy, the sports it runs and its first coach, in one step. The coach is signed in.
router.post("/register-academy", async (req, res) => {
  const body = assertBody(req);
  const name = assertAcademyName(body.academyName);
  const town = assertTown(body.town);
  const sports = assertSportList(body.sports);
  const username = assertUsername(body.username);
  const password = assertString(body.password, "password", { min: 6, max: 100 });

  const nameKey = name.toLowerCase().replace(/\s+/g, " ");
  if (await Academy.exists({ nameKey })) throw new HttpError(409, `An academy called "${name}" is already registered.`);
  if (await User.exists({ $or: [{ username }, { email: username }] })) {
    throw new HttpError(409, `The username "${username}" is already taken.`);
  }

  let academy;
  try {
    academy = await Academy.create({ name, nameKey, ...(town ? { town } : {}), sports });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, `An academy called "${name}" is already registered.`);
    throw err;
  }
  let coach;
  try {
    coach = await User.create({ username, passwordHash: await bcrypt.hash(password, 10), role: "coach", academyId: academy._id });
  } catch (err) {
    await Academy.deleteOne({ _id: academy._id }); // never leave an academy without its coach
    if (err.code === 11000) throw new HttpError(409, `The username "${username}" is already taken.`);
    throw err;
  }

  setAuthCookie(res, signToken(coach));
  res.status(201).json({ user: sessionUser(coach, academy) });
});

// A scout asks one academy for access with their email. The account stays pending until a coach of that
// academy approves it, so signing up alone gives no access to any player data.
router.post("/register-scout", async (req, res) => {
  const body = assertBody(req);
  const email = assertEmail(body.email);
  const password = assertString(body.password, "password", { min: 6, max: 100 });
  if (!isObjectId(body.academyId)) throw new HttpError(400, "Choose the academy you want to scout.");
  const academy = await Academy.findById(body.academyId);
  if (!academy) throw new HttpError(400, "Choose the academy you want to scout.");

  const taken = () => new HttpError(409, "An account with this email already exists.");
  if (await User.exists({ $or: [{ email }, { username: email }] })) throw taken();
  try {
    await User.create({
      username: email,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "scout",
      status: "pending",
      academyId: academy._id,
    });
  } catch (err) {
    throw err.code === 11000 ? taken() : err;
  }
  res.status(201).json({ ok: true, message: `Request sent to ${academy.name}. A coach there has to approve it before you can sign in.` });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: sessionUser(req.user, req.academy) });
});

export default router;
