import { Badge, ReadyBadge, cx } from "@/components/ui";
import { pctLabel } from "@/lib/format";
import type { PlayerStats } from "@/types";

/** Attendance bar with a marker at the 75% line that decides Ready. */
export function Meter({ pct, ready }: { pct: number; ready?: boolean }) {
  return (
    <div
      role="meter"
      aria-label="Attendance"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative h-2 w-full rounded-full bg-hover"
    >
      <div
        className={cx("motion-slow h-full origin-left rounded-full", ready ? "bg-ok" : "bg-white")}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
      <div aria-hidden className="absolute -top-1 bottom-[-4px] left-3/4 w-0.5 bg-muted" />
    </div>
  );
}

const sessionsText = (p: PlayerStats) =>
  p.sessionsHeld === 0 ? "No sessions yet" : `${p.sessionsPresent} of ${p.sessionsHeld} sessions`;

/** Table on wide screens, stacked cards on phones (no sideways scrolling at 390px). */
export function PlayerTable({ players }: { players: PlayerStats[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-left">
          <caption className="sr-only">Players with attendance, matches and Ready status</caption>
          <thead>
            <tr className="caption-4 text-muted">
              <th scope="col" className="px-4 py-3">Player</th>
              <th scope="col" className="px-4 py-3">Sport</th>
              <th scope="col" className="px-4 py-3">Attendance</th>
              <th scope="col" className="px-4 py-3">Matches</th>
              <th scope="col" className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="motion-base border-t border-line hover:bg-raised">
                <th scope="row" className="px-4 py-3 text-left">
                  <span className="body-4 block">{p.name}</span>
                  <span className="caption-5 text-muted">Age {p.age}</span>
                </th>
                <td className="px-4 py-3 body-5 text-muted">{p.sport}</td>
                <td className="w-56 px-4 py-3">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="body-5">{pctLabel(p.attendancePct)}</span>
                    <span className="caption-5 text-muted">{sessionsText(p)}</span>
                  </div>
                  <Meter pct={p.attendancePct} ready={p.ready} />
                </td>
                <td className="px-4 py-3 body-5">{p.matchesPlayed}</td>
                <td className="px-4 py-3">
                  <ReadyBadge ready={p.ready} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {players.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="title-3 truncate">{p.name}</p>
                <p className="caption-5 text-muted">
                  {p.sport} · Age {p.age}
                </p>
              </div>
              <ReadyBadge ready={p.ready} />
            </div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="body-5">{pctLabel(p.attendancePct)} attendance</span>
              <span className="caption-5 text-muted">{sessionsText(p)}</span>
            </div>
            <Meter pct={p.attendancePct} ready={p.ready} />
            <p className="caption-4 mt-3 text-muted">
              <Badge>{p.matchesPlayed} {p.matchesPlayed === 1 ? "match" : "matches"}</Badge>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
