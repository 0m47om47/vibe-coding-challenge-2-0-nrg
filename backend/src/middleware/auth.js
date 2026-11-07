import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Academy from "../models/Academy.js";
import { HttpError } from "../utils/httpError.js";

export const COOKIE_NAME = "token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn: "7d" });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/**
 * Sets req.user = { id, username, role, playerId?, academyId } and req.academy, or throws 401.
 * The account and its academy are read from the database on every request, so a coach removing a scout
 * or another coach takes effect at once, and every query can be scoped to req.user.academyId.
 */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new HttpError(401, "Please log in.");
  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch {
    throw new HttpError(401, "Your login has expired. Please log in again.");
  }
  const user = await User.findById(payload.sub).select("username role status playerId academyId").lean();
  if (!user || user.status === "pending") {
    throw new HttpError(401, payload.role === "scout" ? "Your scout access is no longer active." : "Your account is no longer active.");
  }
  const academy = user.academyId ? await Academy.findById(user.academyId).lean() : null;
  if (!academy) throw new HttpError(401, "Please log in again.");

  req.user = {
    id: String(user._id),
    username: user.username,
    role: user.role,
    ...(user.playerId ? { playerId: String(user.playerId) } : {}),
    academyId: String(academy._id),
  };
  req.academy = academy;
  next();
}

// Use after requireAuth. Throws 403 when the role is not allowed.
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new HttpError(403, "You are not allowed to do this.");
    }
    next();
  };
