import { formatDate } from "@/lib/format";
import { SPORT_STATS } from "@/lib/sportStats";
import type { PlayerHistory, Sport } from "@/types";

const BAR = "bg-accent"; // #4758d6, checked with the dataviz validator against the card surface
const MAX_MATCHES = 8;
const PLOT_H = 96;

const shortDate = (iso: string) => formatDate(iso).replace(/ \d{4}$/, "");

/**
 * One small bar chart per stat of the sport, one bar per match, oldest on the left.
 * Every chart starts at 0 and has its own scale, because goals and runs are not comparable.
 * The "Recent matches" list on the page is the table view of these numbers.
 */
export function MatchStatsChart({ sport, matches }: { sport: Sport; matches: PlayerHistory["matches"] }) {
  const shown = [...matches].reverse().slice(-MAX_MATCHES); // matches arrive newest first
  if (shown.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
      {SPORT_STATS[sport].map((f) => {
        const values = shown.map((m) => m.stats[f.key] ?? 0);
        const max = Math.max(...values, 1);
        return (
          <figure key={f.key} className="rounded-lg border border-line bg-canvas p-4">
            <figcaption className="mb-3 flex items-baseline justify-between gap-2">
              <span className="title-3 text-ink">{f.label}</span>
              <span className="caption-5 text-muted">
                best {Math.max(...values)} · {values.reduce((a, b) => a + b, 0)} in total
              </span>
            </figcaption>
            <ul className="flex items-end gap-2" style={{ height: PLOT_H + 44 }}>
              {shown.map((m, i) => {
                const v = values[i];
                const h = v === 0 ? 2 : Math.max(4, Math.round((v / max) * PLOT_H));
                const label = `${f.label} against ${m.opponent} on ${formatDate(m.date)}: ${v}`;
                return (
                  <li key={m.id} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <span className="body-5 text-ink">{v}</span>
                    <div
                      tabIndex={0}
                      role="img"
                      aria-label={label}
                      style={{ height: h }}
                      className={`${BAR} w-full max-w-10 rounded-t-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-white ${v === 0 ? "opacity-60" : ""}`}
                    />
                    <span className="caption-5 truncate text-muted">{shortDate(m.date)}</span>
                    <span
                      role="status"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max max-w-44 -translate-x-1/2 rounded-lg border border-line bg-raised px-3 py-2 group-focus-within:block group-hover:block"
                    >
                      <span className="caption-3 block text-ink">Against {m.opponent}</span>
                      <span className="caption-5 block text-ink-2">
                        {formatDate(m.date)}: {v} {f.label.toLowerCase()}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </figure>
        );
      })}
    </div>
  );
}
