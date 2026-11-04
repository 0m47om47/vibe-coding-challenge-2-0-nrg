// npm run seed        -> wipes the database, loads coach, scout, 16 players in 7 sports with sessions and matches
// npm run seed:empty  -> wipes the database, loads only the coach and scout accounts
// Data matches AGENTS.md §9.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../src/db.js";
import User from "../src/models/User.js";
import Player from "../src/models/Player.js";
import Session from "../src/models/Session.js";
import Match from "../src/models/Match.js";

let seeded = "";
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
  // Same four practice days for every sport. P = present, A = absent.
  const DAYS = ["2026-10-25", "2026-10-27", "2026-10-29", "2026-11-01"];
  // Each match: [dayIndex, opponent, { player: stats }]. Only players present that day may be listed.
  const SQUADS = {
    Football: {
      players: [
        ["Aarav", 16, 172, 61, "PPPP"],
        ["Bina", 15, 165, 54, "APPP"],
        ["Chandan", 17, 176, 66, "PPAA"],
      ],
      matches: [
        [2, "Dumka Strikers", { Aarav: { goals: 2, assists: 0 }, Bina: { goals: 1, assists: 1 } }],
        [3, "Santhal Pargana FC", { Aarav: { goals: 1, assists: 1 }, Bina: { goals: 0, assists: 0 } }],
      ],
    },
    Cricket: {
      players: [
        ["Dev", 16, 175, 64, "PPPP"],
        ["Esha", 15, 160, 50, "PPPA"],
        ["Farhan", 17, 178, 70, "APAP"],
      ],
      matches: [
        [1, "Deoghar Blasters", { Dev: { runs: 48, wickets: 1, catches: 1 }, Esha: { runs: 22, wickets: 3, catches: 0 }, Farhan: { runs: 0, wickets: 0, catches: 0 } }],
        [2, "Godda Giants", { Dev: { runs: 71, wickets: 0, catches: 2 }, Esha: { runs: 9, wickets: 2, catches: 1 } }],
      ],
    },
    Badminton: {
      players: [
        ["Gita", 15, 158, 48, "PPPP"],
        ["Harsh", 16, 172, 60, "PPPA"],
      ],
      matches: [
        [1, "Dumka Smashers", { Gita: { gamesWon: 2, pointsWon: 42 }, Harsh: { gamesWon: 1, pointsWon: 37 } }],
        [3, "Jamtara Shuttlers", { Gita: { gamesWon: 2, pointsWon: 44 } }],
      ],
    },
    Volleyball: {
      players: [
        ["Indu", 16, 170, 56, "PPPP"],
        ["Jay", 17, 183, 72, "PAPP"],
      ],
      matches: [
        [2, "Pakur Spikers", { Indu: { points: 14, spikes: 9, blocks: 2, aces: 1 }, Jay: { points: 18, spikes: 12, blocks: 4, aces: 0 } }],
        [3, "Sahibganj Net Club", { Indu: { points: 11, spikes: 6, blocks: 3, aces: 2 }, Jay: { points: 15, spikes: 10, blocks: 2, aces: 1 } }],
      ],
    },
    Kabaddi: {
      players: [
        ["Kiran", 17, 174, 69, "PPPP"],
        ["Lakshmi", 16, 163, 55, "PPAA"],
      ],
      matches: [
        [1, "Santhal Raiders", { Kiran: { raidPoints: 9, tacklePoints: 2 }, Lakshmi: { raidPoints: 4, tacklePoints: 5 } }],
        [3, "Rajmahal Bulls", { Kiran: { raidPoints: 12, tacklePoints: 1 } }],
      ],
    },
    Hockey: {
      players: [
        ["Manoj", 16, 176, 65, "PPPP"],
        ["Nisha", 15, 161, 52, "PPPP"],
      ],
      matches: [
        [2, "Ranchi Sticks", { Manoj: { goals: 1, assists: 2 }, Nisha: { goals: 2, assists: 0 } }],
        [3, "Bokaro Hawks", { Manoj: { goals: 0, assists: 1 }, Nisha: { goals: 1, assists: 1 } }],
      ],
    },
    "Table Tennis": {
      players: [
        ["Omkar", 14, 160, 47, "PPAP"],
        ["Pooja", 15, 155, 45, "PPPP"],
      ],
      matches: [
        [1, "Dumka TT Club", { Omkar: { gamesWon: 3, pointsWon: 41 }, Pooja: { gamesWon: 2, pointsWon: 35 } }],
        [3, "Giridih Paddles", { Omkar: { gamesWon: 1, pointsWon: 22 }, Pooja: { gamesWon: 3, pointsWon: 39 } }],
      ],
    },
  };

  let playerCount = 0;
  let sessionCount = 0;
  let matchCount = 0;
  for (const [sport, squad] of Object.entries(SQUADS)) {
    const created = {};
    for (const [name, age, heightCm, weightKg] of squad.players) {
      const p = await Player.create({ name, age, sport, heightCm, weightKg, nationality: "India" });
      created[name] = p;
      playerCount++;
      const username = name.toLowerCase();
      await User.create({ username, passwordHash: await hash(`${username}123`), role: "player", playerId: p._id });
    }
    for (const [i, date] of DAYS.entries()) {
      await Session.create({
        date,
        sport,
        status: "closed",
        attendance: squad.players.map(([name, , , , pattern]) => ({
          player: created[name]._id,
          mark: pattern[i] === "P" ? "present" : "absent",
        })),
      });
      sessionCount++;
    }
    for (const [dayIndex, opponent, lines] of squad.matches) {
      await Match.create({
        date: DAYS[dayIndex],
        sport,
        opponent,
        scores: Object.entries(lines).map(([name, stats]) => ({ player: created[name]._id, stats })),
      });
      matchCount++;
    }
  }
  seeded = `Seeded accounts, ${playerCount} players in 7 sports, ${sessionCount} sessions, ${matchCount} matches.`;
}

console.log(emptyOnly ? "Seeded accounts only (coach, scout)." : seeded);
await disconnectDB();
