// npm run migrate:academies -> for a database filled before academies existed. Changes nothing that already has an
// academy and deletes nothing: creates "Dumka Sports Academy" (all sports) if there is no academy yet, links every
// user, player, session and match without an academy to it, and swaps the old one-session-per-sport-per-date index
// for the per-academy one.
import "dotenv/config";
import { connectDB, disconnectDB } from "../src/db.js";
import Academy from "../src/models/Academy.js";
import User from "../src/models/User.js";
import Player from "../src/models/Player.js";
import Session from "../src/models/Session.js";
import Match from "../src/models/Match.js";
import { SPORTS } from "../src/constants.js";

await connectDB();
let academy = await Academy.findOne().sort({ createdAt: 1 });
if (!academy) {
  academy = await Academy.create({ name: "Dumka Sports Academy", nameKey: "dumka sports academy", town: "Dumka", sports: SPORTS });
  console.log("Created Dumka Sports Academy.");
}
const missing = { academyId: { $exists: false } };
for (const [label, Model] of [["users", User], ["players", Player], ["sessions", Session], ["matches", Match]]) {
  const r = await Model.updateMany(missing, { $set: { academyId: academy._id } });
  console.log(`${label}: linked ${r.modifiedCount}`);
}
const indexes = await Session.collection.indexes().catch(() => []);
if (indexes.some((i) => i.name === "sport_1_date_1")) {
  await Session.collection.dropIndex("sport_1_date_1");
  console.log("Dropped the old sessions index sport_1_date_1.");
}
await Promise.all([Academy.syncIndexes(), User.syncIndexes(), Player.syncIndexes(), Session.syncIndexes(), Match.syncIndexes()]);
console.log(`Done. Everything without an academy now belongs to ${academy.name}.`);
await disconnectDB();
