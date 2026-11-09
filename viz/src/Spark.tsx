// ── A sparkline: one series as a thin line over a pale wash ──────────────────
// The stat-tile spec: the history in the de-emphasis hue, the current period
// (the last point) as an accent end-dot. 2 px line, ~10 % area wash, an 8 px
// end-dot with a 2 px surface ring. One series, so no legend: the tile's label
// names it. The geometry is pure and tested on its own (`sparkline.ts`).

import { cx } from "./_cx";
import { NEUTRAL, seriesColor } from "./palette";
import { sparkline } from "./sparkline";

export interface SparkProps {
  data: readonly (number | readonly [number, number])[];
  w?: number;
  h?: number;
  /** The accessible name — what the line shows, in words. */
  label: string;
  /** What to say when there is no point to draw. */
  empty?: string;
  /** The line's colour; the de-emphasis neutral by default. */
  color?: string;
  /** The current-period dot's colour; categorical slot 1 by default. `null` drops the dot. */
  accent?: string | null;
  /** Vertical marks (a previous run, a deploy), each with its own tooltip. */
  marks?: { x: number; title: string }[];
  className?: string;
}

/**
 * The line and the area through `data` in a `w × h` box. Says `empty` in words
 * when there is no point to draw — "no data" is never drawn as a flat zero.
 */
export function Spark({
  data,
  w = 120,
  h = 28,
  label,
  empty = "No history yet",
  color = NEUTRAL,
  accent = seriesColor(1),
  marks = [],
  className,
}: SparkProps) {
  // Inset by the dot's radius + ring so the end-dot is never clipped.
  const R = 4;
  const s = sparkline(data, w - R - 2, h, R + 1);
  if (!s) {
    return (
      <span className={cx("text-xs", className)} style={{ color: "var(--viz-muted)" }}>
        {empty}
      </span>
    );
  }
  const last = s.points[s.points.length - 1];
  return (
    // The svg stretches to the container (preserveAspectRatio none), which
    // would squash a <circle> into an ellipse — so the end-dot is an HTML box
    // placed at the same fraction of the width, and stays round at any size.
    <div className={cx("relative", className)} style={{ height: h }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="block overflow-visible"
      >
        <title>{label}</title>
        <path d={s.area} fill={color} fillOpacity={0.12} />
        <path
          d={s.line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {marks.map((m, i) => (
          <line key={i} x1={m.x} x2={m.x} y1={0} y2={h} stroke="var(--viz-axis)" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <title>{m.title}</title>
          </line>
        ))}
      </svg>
      {accent && (
        <span
          aria-hidden="true"
          data-spark-dot=""
          className="pointer-events-none absolute block rounded-full"
          style={{
            width: R * 2,
            height: R * 2,
            left: `${(last[0] / w) * 100}%`,
            top: last[1],
            transform: "translate(-50%, -50%)",
            background: accent,
            boxShadow: "0 0 0 2px var(--viz-surface)",
          }}
        />
      )}
    </div>
  );
}
