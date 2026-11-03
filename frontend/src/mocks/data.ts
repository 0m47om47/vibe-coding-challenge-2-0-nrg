// Mock data matching AGENTS.md §9. Used only when NEXT_PUBLIC_USE_MOCKS=true.
import type { Mark, Player, Role, Sport } from "@/types";

export interface MockUser {
  id: string;
  username: string;
  password: string;
  role: Role;
  playerId?: string;
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
  scores: { playerId: string; score: number }[];
}

export interface MockDb {
  users: MockUser[];
  players: Player[];
  sessions: MockSession[];
  matches: MockMatch[];
  seq: number;
}

export function seedDb(): MockDb {
  const players: Player[] = [
    { id: "p1", name: "Aarav", age: 16, sport: "Football" },
    { id: "p2", name: "Bina", age: 15, sport: "Football" },
    { id: "p3", name: "Chandan", age: 17, sport: "Football" },
  ];
  const users: MockUser[] = [
    { id: "u1", username: "coach", password: "coach123", role: "coach" },
    { id: "u2", username: "scout", password: "scout123", role: "scout" },
    { id: "u3", username: "aarav", password: "aarav123", role: "player", playerId: "p1" },
    { id: "u4", username: "bina", password: "bina123", role: "player", playerId: "p2" },
    { id: "u5", username: "chandan", password: "chandan123", role: "player", playerId: "p3" },
  ];

  // Order of marks: Aarav, Bina, Chandan
  const days: [string, Mark[]][] = [
    ["2026-10-25", ["present", "absent", "present"]],
    ["2026-10-27", ["present", "present", "present"]],
    ["2026-10-29", ["present", "present", "absent"]],
    ["2026-11-01", ["present", "present", "absent"]],
  ];
  const sessions: MockSession[] = days.map(([date, marks], i) => ({
    id: `s${i + 1}`,
    date,
    sport: "Football",
    status: "closed",
    attendance: players.map((p, j) => ({ playerId: p.id, mark: marks[j] })),
  }));

  const matches: MockMatch[] = [
    {
      id: "m1",
      date: "2026-10-29",
      sport: "Football",
      opponent: "Dumka Strikers",
      scores: [
        { playerId: "p1", score: 2 },
        { playerId: "p2", score: 1 },
      ],
    },
    {
      id: "m2",
      date: "2026-11-01",
      sport: "Football",
      opponent: "Santhal Pargana FC",
      scores: [
        { playerId: "p1", score: 1 },
        { playerId: "p2", score: 0 },
      ],
    },
  ];

  return { users, players, sessions, matches, seq: 100 };
}
