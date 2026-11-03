// Copy of the contract in AGENTS.md §4. Change it there first, with the backend owner.

export type Role = "coach" | "player" | "scout";
export type Mark = "present" | "absent";
export const SPORTS = ["Football", "Cricket", "Hockey", "Athletics", "Kabaddi"] as const;
export type Sport = (typeof SPORTS)[number];

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  playerId?: string; // only for role "player"
}

export interface Player {
  id: string;
  name: string;
  age: number;
  sport: Sport;
}

export interface PlayerStats extends Player {
  sessionsHeld: number;
  sessionsPresent: number;
  attendancePct: number; // 0 to 100, rounded to 1 decimal
  matchesPlayed: number;
  ready: boolean;
}

export interface AttendanceEntry {
  playerId: string;
  playerName: string;
  mark: Mark | null; // null = not marked yet
}

export interface PracticeSession {
  id: string;
  date: string; // YYYY-MM-DD
  sport: Sport;
  status: "open" | "closed";
  attendance: AttendanceEntry[];
}

export interface ScoreEntry {
  playerId: string;
  playerName: string;
  score: number;
}

export interface Match {
  id: string;
  date: string; // YYYY-MM-DD
  sport: Sport;
  opponent: string;
  scores: ScoreEntry[];
}

export interface ApiError {
  error: string; // human readable message, shown to the user as is
  details?: unknown; // e.g. { refused: [{ playerId, playerName, reason }] }
}

export interface RefusedPlayer {
  playerId: string;
  playerName: string;
  reason: string;
}
