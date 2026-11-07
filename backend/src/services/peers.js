import { SPORT_STATS } from "../constants.js";

/**
 * The academy's best in one sport, used as the 100% mark of the profile radar.
 * No names or rows, only two anonymous maxima:
 *   matches: most matches any one player has played
 *   best:    for each stat, the highest per-match average any one player has
 *
 * matches: that sport's matches, [{ scores: [{ player, stats }] }]
 */
export function academyBest(sport, matches) {
  const perPlayer = new Map(); // id -> { n, sums }
  for (const m of matches) {
    for (const e of m.scores) {
      const id = String(e.player);
      const row = perPlayer.get(id) ?? { n: 0, sums: {} };
      row.n++;
      for (const f of SPORT_STATS[sport]) row.sums[f.key] = (row.sums[f.key] ?? 0) + (e.stats?.[f.key] ?? 0);
      perPlayer.set(id, row);
    }
  }
  const best = Object.fromEntries(SPORT_STATS[sport].map((f) => [f.key, 0]));
  let most = 0;
  for (const { n, sums } of perPlayer.values()) {
    most = Math.max(most, n);
    for (const f of SPORT_STATS[sport]) best[f.key] = Math.max(best[f.key], sums[f.key] / n);
  }
  return { matches: most, best };
}
