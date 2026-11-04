import type { Sport } from "@/types";

export interface StatField {
  key: string;
  label: string;
}

// What the coach records per player in a match, for each sport. Same table as backend/src/constants.js (AGENTS.md §4).
export const SPORT_STATS: Record<Sport, StatField[]> = {
  Football: [{ key: "goals", label: "Goals" }, { key: "assists", label: "Assists" }],
  Cricket: [{ key: "runs", label: "Runs" }, { key: "wickets", label: "Wickets" }, { key: "catches", label: "Catches" }],
  Badminton: [{ key: "gamesWon", label: "Games won" }, { key: "pointsWon", label: "Points won" }],
  Volleyball: [{ key: "points", label: "Points" }, { key: "spikes", label: "Spikes" }, { key: "blocks", label: "Blocks" }, { key: "aces", label: "Aces" }],
  Kabaddi: [{ key: "raidPoints", label: "Raid points" }, { key: "tacklePoints", label: "Tackle points" }],
  Hockey: [{ key: "goals", label: "Goals" }, { key: "assists", label: "Assists" }],
  "Table Tennis": [{ key: "gamesWon", label: "Games won" }, { key: "pointsWon", label: "Points won" }],
};

export type StatLine = Record<string, number>;

/** Sum each stat of the sport over the given match lines. */
export function totalStats(sport: Sport, lines: StatLine[]): { field: StatField; total: number; average: number }[] {
  return SPORT_STATS[sport].map((field) => {
    const total = lines.reduce((n, l) => n + (l[field.key] ?? 0), 0);
    return { field, total, average: lines.length ? Math.round((total / lines.length) * 10) / 10 : 0 };
  });
}
