export const SPORTS = ["Football", "Cricket", "Badminton", "Volleyball", "Kabaddi", "Hockey", "Table Tennis"];

// What the coach records for each player in a match, per sport (AGENTS.md §4). Same table in frontend/src/lib/sportStats.ts.
export const SPORT_STATS = {
  Football: [{ key: "goals", label: "Goals" }, { key: "assists", label: "Assists" }],
  Cricket: [{ key: "runs", label: "Runs" }, { key: "wickets", label: "Wickets" }, { key: "catches", label: "Catches" }],
  Badminton: [{ key: "gamesWon", label: "Games won" }, { key: "pointsWon", label: "Points won" }],
  Volleyball: [{ key: "points", label: "Points" }, { key: "spikes", label: "Spikes" }, { key: "blocks", label: "Blocks" }, { key: "aces", label: "Aces" }],
  Kabaddi: [{ key: "raidPoints", label: "Raid points" }, { key: "tacklePoints", label: "Tackle points" }],
  Hockey: [{ key: "goals", label: "Goals" }, { key: "assists", label: "Assists" }],
  "Table Tennis": [{ key: "gamesWon", label: "Games won" }, { key: "pointsWon", label: "Points won" }],
};
export const ROLES = ["coach", "player", "scout"];
export const USER_STATUSES = ["active", "pending"]; // a scout who signed up by email is "pending" until the coach approves
export const MARKS = ["present", "absent"];
export const SESSION_STATUSES = ["open", "closed"];

// Ready rule (AGENTS.md Â§3): attendance >= 3/4 and at least 2 matches
export const READY_ATTENDANCE_NUM = 3;
export const READY_ATTENDANCE_DEN = 4;
export const READY_MIN_MATCHES = 2;
