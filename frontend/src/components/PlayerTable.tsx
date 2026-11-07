"use client";

import { CaretRight } from "@phosphor-icons/react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ReadyBadge, SportTag, cx } from "@/components/ui";
import { pctLabel } from "@/lib/format";
import type { PlayerStats } from "@/types";

/** Attendance bar. The amber line at 75% is the level a player needs to be Ready. */
export function Meter({ pct, ready }: { pct: number; ready?: boolean }) {
  return (
    <div
      role="meter"
      aria-label="Attendance"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="relative h-2 w-full rounded-sm bg-raised"
    >
      <div
        className={cx("h-full rounded-sm", ready ? "bg-accent" : "bg-accent")}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
      <div aria-hidden title="75% needed to be Ready" className="absolute -inset-y-1 left-3/4 w-0.5 bg-highlight-ink" />
    </div>
  );
}

const sessionsText = (p: PlayerStats) =>
  p.sessionsHeld === 0 ? "No sessions yet" : `${p.sessionsPresent} of ${p.sessionsHeld} sessions`;

/** Table once the screen is wide enough for it beside the sidebar (1024px and up), stacked cards below that. Choosing a player calls onSelect (the profile opens there). */
export function PlayerTable({ players, onSelect }: { players: PlayerStats[]; onSelect: (p: PlayerStats) => void }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface lg:block">
        <table className="w-full text-left">
          <caption className="sr-only">Players with attendance, matches and Ready status</caption>
          <thead>
            <tr className="caption-4 text-muted">
              <th scope="col" className="px-4 py-3">Player</th>
              <th scope="col" className="px-4 py-3">Sport</th>
              <th scope="col" className="px-4 py-3">Attendance</th>
              <th scope="col" className="px-4 py-3">Matches</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Open profile</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr
                key={p.id}
                onClick={() => onSelect(p)}
                className="motion-base cursor-pointer border-t border-line hover:bg-raised"
              >
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar player={p} size="sm" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(p);
                        }}
                        aria-label={`Open profile of ${p.name}`}
                        className="body-4 block cursor-pointer rounded-sm text-left text-ink hover:underline"
                      >
                        {p.name}
                      </button>
                      <span className="caption-5 text-muted">Age {p.age}</span>
                    </div>
                  </div>
                </th>
                <td className="px-4 py-3"><SportTag sport={p.sport} /></td>
                <td className="w-56 px-4 py-3">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="body-4 text-ink">{pctLabel(p.attendancePct)}</span>
                    <span className="caption-5 text-muted">{sessionsText(p)}</span>
                  </div>
                  <Meter pct={p.attendancePct} ready={p.ready} />
                </td>
                <td className="px-4 py-3 body-4 text-ink">{p.matchesPlayed}</td>
                <td className="px-4 py-3">
                  <ReadyBadge ready={p.ready} />
                </td>
                <td className="px-4 py-3 text-right text-muted">
                  <CaretRight size={16} aria-hidden />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 lg:hidden">
        {players.map((p) => (
          <li key={p.id} onClick={() => onSelect(p)} className="motion-base cursor-pointer rounded-xl border border-line bg-surface p-4 hover:bg-raised">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar player={p} size="md" />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(p);
                    }}
                    aria-label={`Open profile of ${p.name}`}
                    className="title-3 block max-w-full cursor-pointer truncate rounded-sm text-left text-ink"
                  >
                    {p.name}
                  </button>
                  <p className="caption-5 text-muted">
                    {p.sport}, age {p.age}
                  </p>
                </div>
              </div>
              <ReadyBadge ready={p.ready} />
            </div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="body-4 text-ink">{pctLabel(p.attendancePct)} attendance</span>
              <span className="caption-5 text-muted">{sessionsText(p)}</span>
            </div>
            <Meter pct={p.attendancePct} ready={p.ready} />
            <p className="caption-4 mt-3 text-ink-2">
              {p.matchesPlayed} {p.matchesPlayed === 1 ? "match" : "matches"}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
