import { SPORT_STATS } from "@/lib/sportStats";
import type { PlayerHistory, PlayerStats } from "@/types";

export interface Axis {
  key: string;
  label: string;
  value: number; // 0 to 100
  detail: string; // what the number is made of, for readers who cannot see the shape
}

const pct = (v: number, of: number) => (of > 0 ? Math.min(100, Math.round((v / of) * 1000) / 10) : 0);
const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The profile radar. Each axis is 0 to 100:
 *  - Attendance: the player's attendance percentage.
 *  - Matches: matches played, against the most any player of the sport has played.
 *  - Each stat of the sport: per-match average, against the best per-match average in the academy.
 * Nothing is invented: every axis comes from recorded sessions and match sheets.
 */
export function radarAxes(player: PlayerStats, history: PlayerHistory): Axis[] {
  const n = history.matches.length;
  const axes: Axis[] = [
    { key: "attendance", label: "Attendance", value: Math.min(100, player.attendancePct), detail: `${player.attendancePct}% of sessions` },
    {
      key: "matches",
      label: "Matches",
      value: pct(player.matchesPlayed, history.peers.matches),
      detail: `${player.matchesPlayed} played, academy most ${history.peers.matches}`,
    },
  ];
  for (const f of SPORT_STATS[player.sport]) {
    const total = history.matches.reduce((a, m) => a + (m.stats[f.key] ?? 0), 0);
    const avg = n ? total / n : 0;
    const best = history.peers.best[f.key] ?? 0;
    axes.push({
      key: f.key,
      label: f.label,
      value: pct(avg, best),
      detail: `${round1(avg)} per match, academy best ${round1(best)}`,
    });
  }
  return axes;
}

/** The rating is the plain average of the axes, so anyone can check it by hand. */
export const rating = (axes: Axis[]) => round1(axes.reduce((a, x) => a + x.value, 0) / axes.length);

/** Longest and current run of "present" over the closed sessions, oldest first. */
export function streaks(sessions: PlayerHistory["sessions"]) {
  let best = 0;
  let run = 0;
  for (const s of sessions) {
    run = s.mark === "present" ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}
