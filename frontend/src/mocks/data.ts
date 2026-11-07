// Mock data matching AGENTS.md §9. Used only when NEXT_PUBLIC_USE_MOCKS=true.
import { SPORTS, type Mark, type Player, type Role, type Sport } from "@/types";

export interface MockUser {
  id: string;
  username: string;
  password: string;
  role: Role;
  academyId: string;
  playerId?: string;
  email?: string; // scouts sign in with their email
  status?: "active" | "pending"; // pending scouts wait for the coach
  createdAt?: string;
}

export interface MockAcademy {
  id: string;
  name: string;
  nameKey: string; // lower case, so names are unique ignoring case
  town?: string;
  sports: Sport[];
}

export type MockPlayer = Player & { academyId: string };

export interface MockSession {
  id: string;
  academyId: string;
  date: string;
  sport: Sport;
  status: "open" | "closed";
  attendance: { playerId: string; mark: Mark | null }[];
}

export interface MockMatch {
  id: string;
  academyId: string;
  date: string;
  sport: Sport;
  opponent: string;
  scores: { playerId: string; stats: Record<string, number> }[];
}

export interface MockDb {
  academies: MockAcademy[];
  users: MockUser[];
  players: MockPlayer[];
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
    players: [["Aarav", 19, 172, 61, "PPPP"], ["Bina", 18, 165, 54, "APPP"], ["Chandan", 20, 176, 66, "PPAA"]],
    matches: [
      [2, "Dumka Strikers", { Aarav: { goals: 2, assists: 0 }, Bina: { goals: 1, assists: 1 } }],
      [3, "Santhal Pargana FC", { Aarav: { goals: 1, assists: 1 }, Bina: { goals: 0, assists: 0 } }],
    ],
  },
  Cricket: {
    players: [["Dev", 19, 175, 64, "PPPP"], ["Esha", 18, 160, 50, "PPPA"], ["Farhan", 21, 178, 70, "APAP"]],
    matches: [
      [1, "Deoghar Blasters", { Dev: { runs: 48, wickets: 1, catches: 1 }, Esha: { runs: 22, wickets: 3, catches: 0 }, Farhan: { runs: 0, wickets: 0, catches: 0 } }],
      [2, "Godda Giants", { Dev: { runs: 71, wickets: 0, catches: 2 }, Esha: { runs: 9, wickets: 2, catches: 1 } }],
    ],
  },
  Badminton: {
    players: [["Gita", 18, 158, 48, "PPPP"], ["Harsh", 19, 172, 60, "PPPA"]],
    matches: [
      [1, "Dumka Smashers", { Gita: { gamesWon: 2, pointsWon: 42 }, Harsh: { gamesWon: 1, pointsWon: 37 } }],
      [3, "Jamtara Shuttlers", { Gita: { gamesWon: 2, pointsWon: 44 } }],
    ],
  },
  Volleyball: {
    players: [["Indu", 19, 170, 56, "PPPP"], ["Jay", 20, 183, 72, "PAPP"]],
    matches: [
      [2, "Pakur Spikers", { Indu: { points: 14, spikes: 9, blocks: 2, aces: 1 }, Jay: { points: 18, spikes: 12, blocks: 4, aces: 0 } }],
      [3, "Sahibganj Net Club", { Indu: { points: 11, spikes: 6, blocks: 3, aces: 2 }, Jay: { points: 15, spikes: 10, blocks: 2, aces: 1 } }],
    ],
  },
  Kabaddi: {
    players: [["Kiran", 21, 174, 69, "PPPP"], ["Lakshmi", 19, 163, 55, "PPAA"]],
    matches: [
      [1, "Santhal Raiders", { Kiran: { raidPoints: 9, tacklePoints: 2 }, Lakshmi: { raidPoints: 4, tacklePoints: 5 } }],
      [3, "Rajmahal Bulls", { Kiran: { raidPoints: 12, tacklePoints: 1 } }],
    ],
  },
  Hockey: {
    players: [["Manoj", 20, 176, 65, "PPPP"], ["Nisha", 18, 161, 52, "PPPP"]],
    matches: [
      [2, "Ranchi Sticks", { Manoj: { goals: 1, assists: 2 }, Nisha: { goals: 2, assists: 0 } }],
      [3, "Bokaro Hawks", { Manoj: { goals: 0, assists: 1 }, Nisha: { goals: 1, assists: 1 } }],
    ],
  },
  "Table Tennis": {
    players: [["Omkar", 18, 160, 47, "PPAP"], ["Pooja", 19, 155, 45, "PPPP"]],
    matches: [
      [1, "Dumka TT Club", { Omkar: { gamesWon: 3, pointsWon: 41 }, Pooja: { gamesWon: 2, pointsWon: 35 } }],
      [3, "Giridih Paddles", { Omkar: { gamesWon: 1, pointsWon: 22 }, Pooja: { gamesWon: 3, pointsWon: 39 } }],
    ],
  },
};

export function seedDb(): MockDb {
  const A = "a1"; // Dumka Sports Academy
  const academies: MockAcademy[] = [
    { id: A, name: "Dumka Sports Academy", nameKey: "dumka sports academy", town: "Dumka", sports: [...SPORTS] },
    // A second academy, so it is easy to see that each coach only sees their own academy
    { id: "a2", name: "Ranchi Hockey Academy", nameKey: "ranchi hockey academy", town: "Ranchi", sports: ["Football", "Hockey"] },
  ];
  const players: MockPlayer[] = [];
  const users: MockUser[] = [
    { id: "u1", username: "coach", password: "coach123", role: "coach", academyId: A },
    { id: "u2", username: "scout", password: "scout123", role: "scout", academyId: A },
    // Signed up by email, waiting for the coach (Profiles > Scouts)
    { id: "u3", username: "new.scout@example.com", email: "new.scout@example.com", password: "scout123", role: "scout", status: "pending", createdAt: "2026-11-05T09:00:00.000Z", academyId: A },
  ];
  const sessions: MockSession[] = [];
  const matches: MockMatch[] = [];

  for (const sport of Object.keys(SQUADS) as Sport[]) {
    const squad = SQUADS[sport];
    const byName: Record<string, MockPlayer> = {};
    for (const [name, age, heightCm, weightKg] of squad.players) {
      const p: MockPlayer = { id: `p${players.length + 1}`, academyId: A, name, age, sport, heightCm, weightKg, nationality: "India" };
      players.push(p);
      byName[name] = p;
      const username = name.toLowerCase();
      users.push({ id: `u${users.length + 1}`, username, password: `${username}123`, role: "player", playerId: p.id, academyId: A });
    }
    DAYS.forEach((date, i) => {
      sessions.push({
        id: `s${sessions.length + 1}`,
        academyId: A,
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
        academyId: A,
        date: DAYS[day],
        sport,
        opponent,
        scores: Object.entries(lines).map(([name, stats]) => ({ playerId: byName[name].id, stats })),
      });
    }
  }

  // Ranchi Hockey Academy: a coach and two players, nothing else yet
  users.push({ id: "u90", username: "ranchi", password: "ranchi123", role: "coach", academyId: "a2" });
  for (const [i, [name, age]] of ([["Sahil", 19], ["Tanvi", 20]] as [string, number][]).entries()) {
    players.push({ id: `p9${i}`, academyId: "a2", name, age, sport: "Hockey", nationality: "India" });
    users.push({ id: `u9${i + 1}`, username: name.toLowerCase(), password: `${name.toLowerCase()}123`, role: "player", playerId: `p9${i}`, academyId: "a2" });
  }

  return { academies, users, players, sessions, matches, seq: 100 };
}
