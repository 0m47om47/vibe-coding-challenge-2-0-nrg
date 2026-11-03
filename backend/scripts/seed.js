// npm run seed        -> wipes the database, loads coach, scout, 3 players, 4 sessions, 2 matches
// npm run seed:empty  -> wipes the database, loads only the coach and scout accounts
// Data matches AGENTS.md §9.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../src/db.js";
import User from "../src/models/User.js";
import Player from "../src/models/Player.js";
import Session from "../src/models/Session.js";
import Match from "../src/models/Match.js";

const emptyOnly = process.argv.includes("--empty");
const hash = (pw) => bcrypt.hash(pw, 10);

await connectDB();
await Promise.all([User.deleteMany({}), Player.deleteMany({}), Session.deleteMany({}), Match.deleteMany({})]);
await Promise.all([User.init(), Session.init()]); // make sure unique indexes exist

await User.create([
  { username: "coach", passwordHash: await hash("coach123"), role: "coach" },
  { username: "scout", passwordHash: await hash("scout123"), role: "scout" },
]);

if (!emptyOnly) {
  const [aarav, bina, chandan] = await Player.create([
    { name: "Aarav", age: 16, sport: "Football" },
    { name: "Bina", age: 15, sport: "Football" },
    { name: "Chandan", age: 17, sport: "Football" },
  ]);
  const players = { aarav, bina, chandan };
  for (const [username, p] of Object.entries(players)) {
    await User.create({ username, passwordHash: await hash(`${username}123`), role: "player", playerId: p._id });
  }

  // P = present, A = absent. Order: aarav, bina, chandan.
  const sessions = [
    ["2026-10-25", ["present", "absent", "present"]],
    ["2026-10-27", ["present", "present", "present"]],
    ["2026-10-29", ["present", "present", "absent"]],
    ["2026-11-01", ["present", "present", "absent"]],
  ];
  const order = [aarav, bina, chandan];
  for (const [date, marks] of sessions) {
    await Session.create({
      date,
      sport: "Football",
      status: "closed",
      attendance: order.map((p, i) => ({ player: p._id, mark: marks[i] })),
    });
  }

  await Match.create([
    { date: "2026-10-29", sport: "Football", opponent: "Dumka Strikers", scores: [{ player: aarav._id, score: 2 }, { player: bina._id, score: 1 }] },
    { date: "2026-11-01", sport: "Football", opponent: "Santhal Pargana FC", scores: [{ player: aarav._id, score: 1 }, { player: bina._id, score: 0 }] },
  ]);
}

console.log(emptyOnly ? "Seeded accounts only (coach, scout)." : "Seeded accounts, 3 players, 4 sessions, 2 matches.");
await disconnectDB();
