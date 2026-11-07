import type { PlayerStats, Role } from "@/types";

// "2026-11-01" -> "1 Nov 2026". Built from the parts so the timezone can never shift the day.
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Today as YYYY-MM-DD in the browser's own timezone.
export function todayISO(): string {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

export const homeFor = (role: Role) =>
  role === "coach" ? "/coach" : role === "scout" ? "/scout" : "/me";

export const pctLabel = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// What is still missing for Ready (75% attendance and 2 matches). Empty list means Ready.
export function readyGaps(p: PlayerStats): string[] {
  const gaps: string[] = [];
  if (p.sessionsHeld === 0) {
    gaps.push("No sessions have been held yet");
  } else {
    // Attending the next k sessions lifts present/held to 3/4 when k >= 3*held - 4*present.
    const k = Math.max(0, 3 * p.sessionsHeld - 4 * p.sessionsPresent);
    if (k > 0) gaps.push(`Attend the next ${plural(k, "session")} to reach 75% attendance`);
  }
  const m = Math.max(0, 2 - p.matchesPlayed);
  if (m > 0) gaps.push(`Play ${plural(m, "more match", "more matches")}`);
  return gaps;
}

// "Olivier Giroud" -> first "Olivier", last "Giroud". A single name has no first part.
export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() ?? name;
  return { first: parts.join(" "), last };
}

// Whether this person may change this player's profile and photo (AGENTS.md §3).
export function canEditProfile(user: { role: Role; playerId?: string } | null, playerId: string): boolean {
  return !!user && (user.role === "coach" || (user.role === "player" && user.playerId === playerId));
}

// Where a player's profile page lives for each role.
export const profileHref = (role: Role, playerId: string) =>
  role === "coach" ? `/coach/players/${playerId}` : role === "scout" ? `/scout/players/${playerId}` : "/me";
