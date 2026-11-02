import { SPORTS, MARKS } from "../constants.js";
import { HttpError } from "./httpError.js";

const bad = (message) => new HttpError(400, message);

export const isObjectId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

export function isDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function assertDate(v, name = "date") {
  if (!isDate(v)) throw bad(`${name} must be a real date in YYYY-MM-DD format.`);
  return v;
}

export function assertSport(v, name = "sport") {
  if (!SPORTS.includes(v)) throw bad(`${name} must be one of: ${SPORTS.join(", ")}.`);
  return v;
}

export function assertMark(v) {
  if (!MARKS.includes(v)) throw bad(`mark must be one of: ${MARKS.join(", ")}.`);
  return v;
}

export function assertString(v, name, { min = 1, max = 80 } = {}) {
  if (typeof v !== "string") throw bad(`${name} is required.`);
  const s = v.trim();
  if (s.length < min || s.length > max) {
    throw bad(`${name} must be ${min}-${max} characters.`);
  }
  return s;
}

export function assertInt(v, name, { min = 0, max = 1000 } = {}) {
  if (!Number.isInteger(v) || v < min || v > max) {
    throw bad(`${name} must be a whole number between ${min} and ${max}.`);
  }
  return v;
}

export function assertObjectId(v, name = "id") {
  if (!isObjectId(v)) throw bad(`${name} is not a valid id.`);
  return v;
}

export function assertBody(req) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    throw bad("A JSON body is required.");
  }
  return req.body;
}
