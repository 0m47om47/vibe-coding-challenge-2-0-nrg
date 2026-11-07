import { Router } from "express";
import Academy from "../models/Academy.js";
import Player from "../models/Player.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { HttpError } from "../utils/httpError.js";
import { assertBody } from "../utils/validate.js";
import { academyJSON, assertAcademyName, assertSportList, assertTown } from "../utils/academy.js";

const router = Router();

// Public: the list a scout picks from when asking for access. Names and towns only.
router.get("/academies", async (_req, res) => {
  const academies = await Academy.find().sort({ name: 1 }).select("name town").lean();
  res.json({ academies: academies.map((a) => ({ id: String(a._id), name: a.name, ...(a.town ? { town: a.town } : {}) })) });
});

// The signed-in user's academy.
router.get("/academy", requireAuth, (req, res) => {
  res.json({ academy: academyJSON(req.academy) });
});

// Coach only: rename the academy, change the town, add or remove sports.
// A sport that still has players cannot be removed, so no player is left in a sport the academy no longer runs.
router.patch("/academy", requireAuth, requireRole("coach"), async (req, res) => {
  const body = assertBody(req);
  const $set = {};
  const $unset = {};
  if (body.name !== undefined) {
    const name = assertAcademyName(body.name);
    const nameKey = name.toLowerCase().replace(/\s+/g, " ");
    if (await Academy.exists({ nameKey, _id: { $ne: req.academy._id } })) {
      throw new HttpError(409, `An academy called "${name}" is already registered.`);
    }
    Object.assign($set, { name, nameKey });
  }
  if (body.town !== undefined) {
    const town = assertTown(body.town);
    if (town) $set.town = town;
    else $unset.town = "";
  }
  if (body.sports !== undefined) {
    const sports = assertSportList(body.sports);
    const removed = req.academy.sports.filter((s) => !sports.includes(s));
    const stillUsed = [];
    for (const s of removed) if (await Player.exists({ academyId: req.academy._id, sport: s })) stillUsed.push(s);
    if (stillUsed.length > 0) {
      throw new HttpError(409, `${stillUsed.join(" and ")} still ${stillUsed.length === 1 ? "has" : "have"} players, so it cannot be removed.`, { stillUsed });
    }
    $set.sports = sports;
  }
  if (Object.keys($set).length + Object.keys($unset).length === 0) {
    throw new HttpError(400, "Send at least one of: name, town, sports.");
  }
  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  const academy = await Academy.findByIdAndUpdate(req.academy._id, update, { new: true });
  res.json({ academy: academyJSON(academy) });
});

export default router;
