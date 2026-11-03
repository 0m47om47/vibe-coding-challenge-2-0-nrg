import jwt from "jsonwebtoken";
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
  return jwt.sign(
    { sub: String(user._id), username: user.username, role: user.role, playerId: user.playerId ? String(user.playerId) : undefined },
    secret(),
    { expiresIn: "7d" }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

// Sets req.user = SessionUser (AGENTS.md §4) or throws 401.
export function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new HttpError(401, "Please log in.");
  let payload;
  try {
    payload = jwt.verify(token, secret());
  } catch {
    throw new HttpError(401, "Your login has expired. Please log in again.");
  }
  req.user = {
    id: payload.sub,
    username: payload.username,
    role: payload.role,
    ...(payload.playerId ? { playerId: payload.playerId } : {}),
  };
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
