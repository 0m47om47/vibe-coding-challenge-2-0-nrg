import type { Axis } from "@/lib/rating";

const FILL = "#4F46E5"; // indigo data accent from DESIGN.md
const GRID = "#E2E8F0";
const INK = "#1E293B";
const MUTED = "#64748B";
const SURFACE = "#FFFFFF";
const SIZE = 300;
const C = SIZE / 2;
const R = 92;

const point = (i: number, n: number, r: number) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};

/** One shape, 0 to 100 on every axis, rings at 25/50/75/100. The list next to it gives every value as text. */
export function RadarChart({ axes }: { axes: Axis[] }) {
  const n = axes.length;
  const ring = (f: number) => axes.map((_, i) => point(i, n, R * f).join(",")).join(" ");
  const shape = axes.map((a, i) => point(i, n, (R * a.value) / 100).join(",")).join(" ");
  const summary = `Radar of ${axes.map((a) => `${a.label} ${a.value}`).join(", ")}. Each axis is 0 to 100.`;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={summary} className="mx-auto block w-full max-w-[340px]">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke={GRID} strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, n, R);
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke={GRID} strokeWidth={1} />;
      })}
      <polygon points={shape} fill={FILL} fillOpacity={0.22} stroke={FILL} strokeWidth={2} strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = point(i, n, (R * a.value) / 100);
        return <circle key={a.key} cx={x} cy={y} r={4} fill={FILL} stroke={SURFACE} strokeWidth={2} />;
      })}
      {axes.map((a, i) => {
        const [x, y] = point(i, n, R + 16);
        const anchor = Math.abs(x - C) < 6 ? "middle" : x > C ? "start" : "end";
        return (
          <text key={a.key} x={x} y={y} textAnchor={anchor} fontSize={11} fill={MUTED}>
            <tspan x={x} dy={y < C ? "-0.2em" : "0.6em"}>
              {a.label}
            </tspan>
            <tspan x={x} dy="1.2em" fill={INK} fontWeight={600} fontSize={12}>
              {a.value}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
