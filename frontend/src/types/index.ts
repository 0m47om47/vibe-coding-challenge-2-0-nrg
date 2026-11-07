// Copy of the contract in AGENTS.md §4. Change it there first, with the backend owner.

export type Role = "coach" | "player" | "scout";
export type Mark = "present" | "absent";
export const SPORTS = ["Football", "Cricket", "Badminton", "Volleyball", "Kabaddi", "Hockey", "Table Tennis"] as const;
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
  photoUrl?: string; // https Cloudinary URL, or a data URL in mock mode. Absent when no photo
  heightCm?: number; // whole number, 50 to 250. Absent when not set
  weightKg?: number; // whole number, 10 to 250. Absent when not set
  nationality?: string; // 2 to 56 characters. Absent when not set
}

// Sent to PATCH /api/players/:id. Every field is optional. null clears the value.
export interface PlayerProfileUpdate {
  photoUrl?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  nationality?: string | null;
}

// Returned by GET /api/players/:id/history. Same visibility as GET /api/players/:id.
export interface PlayerHistory {
  sessions: { id: string; date: string; sport: Sport; mark: Mark }[]; // closed sessions, oldest first
  matches: { id: string; date: string; opponent: string; stats: Record<string, number> }[]; // newest first
  // The academy's best in this sport, no names: most matches by one player, and the highest per-match average of each stat.
  peers: { matches: number; best: Record<string, number> };
}

// Returned by POST /api/players/:id/photo-signature: what the browser needs to upload to Cloudinary.
export interface PhotoUploadTicket {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  overwrite: "true";
  invalidate: "true";
  allowedFormats: string;
}

// A scout account, as the coach sees it (GET /api/users/scouts).
export interface ScoutAccount {
  id: string;
  email: string;
  status: "pending" | "active"; // pending = signed up by email, waiting for the coach
  createdAt: string; // ISO date-time
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
  stats: Record<string, number>; // keys from the sport's stat table (AGENTS.md §4)
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
