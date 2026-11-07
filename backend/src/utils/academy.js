import { SPORTS } from "../constants.js";
import { HttpError } from "./httpError.js";
import { assertSport, assertString } from "./validate.js";

export const academyJSON = (a) => ({
  id: String(a._id),
  name: a.name,
  ...(a.town ? { town: a.town } : {}),
  sports: SPORTS.filter((s) => a.sports.includes(s)), // always in the standard order
});

// A sport the signed-in user's academy runs. Use for anything that creates data (players, sessions, matches).
export function assertAcademySport(req, v, name = "sport") {
  const sport = assertSport(v, name);
  if (!req.academy.sports.includes(sport)) {
    throw new HttpError(400, `${req.academy.name} does not run ${sport}. Add it in Academy settings first.`);
  }
  return sport;
}

// A non-empty list of known sports, without repeats, returned in the standard order.
export function assertSportList(v, name = "sports") {
  if (!Array.isArray(v) || v.length === 0) throw new HttpError(400, "Choose at least one sport.");
  for (const s of v) assertSport(s, name);
  return SPORTS.filter((s) => v.includes(s));
}

export function assertAcademyName(v) {
  return assertString(v, "academy name", { min: 3, max: 60 });
}

export function assertTown(v) {
  if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) return undefined;
  return assertString(v, "town", { min: 2, max: 60 });
}

export const USERNAME_RE = /^[a-z0-9_.-]+$/;

export function assertUsername(v) {
  const username = assertString(v, "username", { min: 3, max: 30 }).toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(400, "username may only use letters, numbers, dot, dash and underscore.");
  }
  return username;
}
