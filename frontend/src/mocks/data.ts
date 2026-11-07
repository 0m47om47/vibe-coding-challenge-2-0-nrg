// Mock data matching AGENTS.md §9. Used only when NEXT_PUBLIC_USE_MOCKS=true.
import type { Mark, Player, Role, Sport } from "@/types";

export interface MockUser {
  id: string;
  username: string;
  password: string;
  role: Role;
  playerId?: string;
  email?: string; // scouts sign in with their email
  status?: "active" | "pending"; // pending scouts wait for the coach
  createdAt?: string;
}

export interface MockSession {
  id: string;
  date: string;
  sport: Sport;
  status: "open" | "closed";
  attendance: { playerId: string; mark: Mark | null }[];
}

export interface MockMatch {
  id: string;
  date: string;
  sport: Sport;
  opponent: string;
  scores: { playerId: string; stats: Record<string, number> }[];
}

export interface MockDb {
  users: MockUser[];
  players: Player[];
  sessions: MockSession[];
  matches: MockMatch[];
  seq: number;
}

type Squad = {
  players: [string, number, number, number, string][]; // name, age, height cm, weight kg, attendance over the 4 days (P/A)
  matches: [number, string, Record<string, Record<string, number>>][]; // day index, opponent, stats per player
};

// Same data as backend/scripts/seed.js (AGENTS.md §9).
const DAYS = ["2026-10-25", "2026-10-27", "2026-10-29", "2026-11-01"];
const SQUADS: Record<Sport, Squad> = {
  Football: {
    players: [["Aarav", 16, 172, 61, "PPPP"], ["Bina", 15, 165, 54, "APPP"], ["Chandan", 17, 176, 66, "PPAA"]],
    matches: [
      [2, "Dumka Strikers", { Aarav: { goals: 2, assists: 0 }, Bina: { goals: 1, assists: 1 } }],
      [3, "Santhal Pargana FC", { Aarav: { goals: 1, assists: 1 }, Bina: { goals: 0, assists: 0 } }],
    ],
  },
  Cricket: {
    players: [["Dev", 16, 175, 64, "PPPP"], ["Esha", 15, 160, 50, "PPPA"], ["Farhan", 17, 178, 70, "APAP"]],
    matches: [
      [1, "Deoghar Blasters", { Dev: { runs: 48, wickets: 1, catches: 1 }, Esha: { runs: 22, wickets: 3, catches: 0 }, Farhan: { runs: 0, wickets: 0, catches: 0 } }],
      [2, "Godda Giants", { Dev: { runs: 71, wickets: 0, catches: 2 }, Esha: { runs: 9, wickets: 2, catches: 1 } }],
    ],
  },
  Badminton: {
    players: [["Gita", 15, 158, 48, "PPPP"], ["Harsh", 16, 172, 60, "PPPA"]],
    matches: [
      [1, "Dumka Smashers", { Gita: { gamesWon: 2, pointsWon: 42 }, Harsh: { gamesWon: 1, pointsWon: 37 } }],
      [3, "Jamtara Shuttlers", { Gita: { gamesWon: 2, pointsWon: 44 } }],
    ],
  },
  Volleyball: {
    players: [["Indu", 16, 170, 56, "PPPP"], ["Jay", 17, 183, 72, "PAPP"]],
    matches: [
      [2, "Pakur Spikers", { Indu: { points: 14, spikes: 9, blocks: 2, aces: 1 }, Jay: { points: 18, spikes: 12, blocks: 4, aces: 0 } }],
      [3, "Sahibganj Net Club", { Indu: { points: 11, spikes: 6, blocks: 3, aces: 2 }, Jay: { points: 15, spikes: 10, blocks: 2, aces: 1 } }],
    ],
  },
  Kabaddi: {
    players: [["Kiran", 17, 174, 69, "PPPP"], ["Lakshmi", 16, 163, 55, "PPAA"]],
    matches: [
      [1, "Santhal Raiders", { Kiran: { raidPoints: 9, tacklePoints: 2 }, Lakshmi: { raidPoints: 4, tacklePoints: 5 } }],
      [3, "Rajmahal Bulls", { Kiran: { raidPoints: 12, tacklePoints: 1 } }],
    ],
  },
  Hockey: {
    players: [["Manoj", 16, 176, 65, "PPPP"], ["Nisha", 15, 161, 52, "PPPP"]],
    matches: [
      [2, "Ranchi Sticks", { Manoj: { goals: 1, assists: 2 }, Nisha: { goals: 2, assists: 0 } }],
      [3, "Bokaro Hawks", { Manoj: { goals: 0, assists: 1 }, Nisha: { goals: 1, assists: 1 } }],
    ],
  },
  "Table Tennis": {
    players: [["Omkar", 14, 160, 47, "PPAP"], ["Pooja", 15, 155, 45, "PPPP"]],
    matches: [
      [1, "Dumka TT Club", { Omkar: { gamesWon: 3, pointsWon: 41 }, Pooja: { gamesWon: 2, pointsWon: 35 } }],
      [3, "Giridih Paddles", { Omkar: { gamesWon: 1, pointsWon: 22 }, Pooja: { gamesWon: 3, pointsWon: 39 } }],
    ],
  },
};

export function seedDb(): MockDb {
  const players: Player[] = [];
  const users: MockUser[] = [
    { id: "u1", username: "coach", password: "coach123", role: "coach" },
    { id: "u2", username: "scout", password: "scout123", role: "scout" },
    // Signed up by email, waiting for the coach (Profiles > Scout access)
    { id: "u3", username: "new.scout@example.com", email: "new.scout@example.com", password: "scout123", role: "scout", status: "pending", createdAt: "2026-11-05T09:00:00.000Z" },
  ];
  const sessions: MockSession[] = [];
  const matches: MockMatch[] = [];

  for (const sport of Object.keys(SQUADS) as Sport[]) {
    const squad = SQUADS[sport];
    const byName: Record<string, Player> = {};
    for (const [name, age, heightCm, weightKg] of squad.players) {
      const p: Player = { id: `p${players.length + 1}`, name, age, sport, heightCm, weightKg, nationality: "India" };
      players.push(p);
      byName[name] = p;
      const username = name.toLowerCase();
      users.push({ id: `u${users.length + 1}`, username, password: `${username}123`, role: "player", playerId: p.id });
    }
    DAYS.forEach((date, i) => {
      sessions.push({
        id: `s${sessions.length + 1}`,
        date,
        sport,
        status: "closed",
        attendance: squad.players.map(([name, , , , pattern]) => ({
          playerId: byName[name].id,
          mark: pattern[i] === "P" ? "present" : "absent",
        })),
      });
    });
    for (const [day, opponent, lines] of squad.matches) {
      matches.push({
        id: `m${matches.length + 1}`,
        date: DAYS[day],
        sport,
        opponent,
        scores: Object.entries(lines).map(([name, stats]) => ({ playerId: byName[name].id, stats })),
      });
    }
  }

  return { users, players, sessions, matches, seq: 100 };
}
