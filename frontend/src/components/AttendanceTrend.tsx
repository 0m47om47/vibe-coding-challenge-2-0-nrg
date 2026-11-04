"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, pctLabel } from "@/lib/format";
import type { PlayerHistory } from "@/types";

// Colours checked with the dataviz validator against the card surface (#FFFFFF): all checks pass.
const LINE = "#4758d6";
const THRESHOLD = "#ea3a3a";
const SURFACE = "#FFFFFF";
const GRID = "#e2e1e1";
const INK_MUTED = "#5f5a5a";
const INK = "#201c1c";

const H = 200;
const PAD = { l: 40, r: 52, t: 12, b: 28 };

const shortDate = (iso: string) => formatDate(iso).replace(/ \d{4}$/, "");

/**
 * Attendance after each closed session (running total, the same number the Ready rule uses),
 * against the 75% a player needs. The session list on the page is the table view of this chart.
 */
export function AttendanceTrend({ sessions }: { sessions: PlayerHistory["sessions"] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => {
    let present = 0;
    return sessions.map((s, i) => {
      if (s.mark === "present") present++;
      return { ...s, pct: Math.round((present / (i + 1)) * 1000) / 10 };
    });
  }, [sessions]);

  if (points.length === 0) {
    return <p className="body-5 text-muted">No closed sessions yet. The trend starts after the first session is closed.</p>;
  }

  const n = points.length;
  const iw = Math.max(0, width - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v: number) => PAD.t + ih - (v / 100) * ih;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.pct)}`).join(" ");
  const last = points[n - 1];

  // Thin the date labels so they never collide (about one per 72px), always keeping the last one.
  const step = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 72))));
  const labelled = new Set(points.map((_, i) => i).filter((i) => (i % step === 0 && n - 1 - i >= step) || i === n - 1));

  function nearest(clientX: number) {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect || n === 1) return 0;
    const i = Math.round(((clientX - rect.left - PAD.l) / iw) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  const a = active === null ? null : points[active];
  const summary = `Attendance after each closed session, from ${pctLabel(points[0].pct)} on ${formatDate(points[0].date)} to ${pctLabel(last.pct)} on ${formatDate(last.date)}. 75% is needed to be Ready.`;

  return (
    <div>
      <div
        ref={wrap}
        tabIndex={0}
        role="group"
        aria-label={`${summary} Use the left and right arrow keys to read each session.`}
        onPointerMove={(e) => setActive(nearest(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? n - 1) - 1));
          else if (e.key === "ArrowRight") setActive((i) => Math.min(n - 1, (i ?? n - 1) + 1));
          else return;
          e.preventDefault();
        }}
        className="relative h-[200px] w-full touch-pan-y rounded-lg"
      >
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={summary} className="block">
            {[0, 25, 50, 100].map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={PAD.l + iw} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
                <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
                  {v}%
                </text>
              </g>
            ))}

            {/* The Ready threshold. Dashed because it is a target, not a gridline. */}
            <line x1={PAD.l} x2={PAD.l + iw} y1={y(75)} y2={y(75)} stroke={THRESHOLD} strokeWidth={1} strokeDasharray="4 4" />
            <text x={PAD.l - 8} y={y(75) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
              75%
            </text>

            {points.map((p, i) =>
              labelled.has(i) ? (
                <text key={p.id} x={x(i)} y={H - 8} textAnchor={n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={11} fill={INK_MUTED}>
                  {shortDate(p.date)}
                </text>
              ) : null
            )}

            {a && <line x1={x(active!)} x2={x(active!)} y1={PAD.t} y2={PAD.t + ih} stroke={INK_MUTED} strokeWidth={1} />}

            <path d={path} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={x(i)}
                cy={y(p.pct)}
                r={i === active ? 6 : 4.5}
                fill={p.mark === "present" ? LINE : SURFACE}
                stroke={p.mark === "present" ? SURFACE : LINE}
                strokeWidth={2}
              />
            ))}

            {/* Value at the end of the line */}
            <text x={x(n - 1) + 10} y={y(last.pct) + 4} fontSize={12} fontWeight={600} fill={INK}>
              {pctLabel(last.pct)}
            </text>
          </svg>
        )}

        {a && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-44 rounded-lg border border-line bg-raised px-3 py-2"
            // Beside the point, on the side with room, so the tooltip never covers what it describes.
            style={{
              left: x(active!) > width / 2 ? Math.max(0, x(active!) - 176 - 12) : Math.min(width - 176, x(active!) + 12),
              top: Math.max(0, Math.min(H - 76, y(a.pct) - 38)),
            }}
          >
            <p className="caption-3 text-ink">{formatDate(a.date)}</p>
            <p className="caption-5 text-ink-2">{a.mark === "present" ? "Present" : "Absent"}</p>
            <p className="caption-5 text-ink-2">Attendance after this: {pctLabel(a.pct)}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 caption-5 text-muted">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4" fill={LINE} /></svg>
          Present
        </span>
        <span className="flex items-center gap-1">
          <svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4" fill={SURFACE} stroke={LINE} strokeWidth="2" /></svg>
          Absent
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="12" aria-hidden><line x1="0" x2="16" y1="6" y2="6" stroke={THRESHOLD} strokeDasharray="4 4" /></svg>
          75% needed to be Ready
        </span>
      </div>
    </div>
  );
}
