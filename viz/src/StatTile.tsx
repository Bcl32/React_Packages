// ── One stat tile ────────────────────────────────────────────────────────────
// The dataviz stat-tile contract: `label` (sentence case, no trailing colon) ·
// `value` (semibold, auto-compact: 1,284 / 12.9K / 4.2M) · `delta` (signed, vs
// a NAMED period, coloured by direction × whether up is good) · `trend` (a
// 12-point sparkline in the de-emphasis hue, the current period in the accent).
//
// Ported from the dev dashboard's `components/viz/Tile.tsx`, which coloured the
// figure by threshold. Here the figure stays in ink: colour belongs to the
// delta, and the delta's sign and arrow say the direction without it.

import type { ReactNode } from "react";

import { cx } from "./_cx";
import { deltaSense, formatValue, signed, type GoodWhen, type ValueFormat } from "./format";
import { DELTA_BAD, DELTA_GOOD, MUTED } from "./palette";
import { Spark } from "./Spark";
import { lastN } from "./sparkline";

export interface StatDelta {
  value: number;
  /** The named comparison period: "previous crawl", "last 28 days". */
  vs: string;
  goodWhen?: GoodWhen;
  /** The delta's own format; the tile's by default. */
  format?: ValueFormat | ((v: number) => string);
}

export interface StatTileProps {
  label: ReactNode;
  value: number | null | undefined;
  /** How the figure is spelled: a named format or a function. `compact` by default. */
  format?: ValueFormat | ((v: number) => string);
  /** Replaces the formatted figure entirely (a status word, say). */
  display?: ReactNode;
  delta?: StatDelta | null;
  /** History, oldest first; the last 12 finite points are drawn. */
  trend?: readonly (number | null | undefined)[] | null;
  /** The sparkline's accessible name; derived from the label when it is a string. */
  trendLabel?: string;
  /** A supporting line under the figure — a second number, never a repeat. */
  sub?: ReactNode;
  /** `card` is bordered; `bare` sits inside a panel that already is one. */
  variant?: "card" | "bare";
  size?: "sm" | "md";
  title?: string;
  className?: string;
}

const run = (fmt: StatTileProps["format"], v: number) => (typeof fmt === "function" ? fmt(v) : formatValue(v, fmt ?? "compact"));

export function StatTile({
  label,
  value,
  format = "compact",
  display,
  delta,
  trend,
  trendLabel,
  sub,
  variant = "card",
  size = "md",
  title,
  className,
}: StatTileProps) {
  const has = typeof value === "number" && Number.isFinite(value);
  const points = lastN(trend ?? [], 12);
  const sense = delta ? deltaSense(delta.value, delta.goodWhen ?? "up") : "flat";
  const deltaColor = sense === "good" ? DELTA_GOOD : sense === "bad" ? DELTA_BAD : MUTED;
  const arrow = delta && delta.value > 0 ? "▲" : delta && delta.value < 0 ? "▼" : "";
  return (
    <div
      title={title}
      className={cx(
        "flex min-w-0 flex-col gap-1",
        variant === "card" && "rounded-lg border px-4 py-3",
        className,
      )}
    >
      <div className="truncate text-xs font-medium" style={{ color: MUTED }}>
        {label}
      </div>
      <div className={cx("font-semibold leading-tight tracking-tight", size === "md" ? "text-2xl" : "text-lg")}>
        {display ?? (has ? run(format, value as number) : "—")}
      </div>
      {delta && Number.isFinite(delta.value) && (
        <div className="viz-tabular text-xs" data-delta={sense}>
          <span style={{ color: deltaColor }}>
            {arrow && <span aria-hidden="true">{arrow} </span>}
            {signed(delta.value, (v) => run(delta.format ?? format, v))}
          </span>
          <span style={{ color: MUTED }}> vs {delta.vs}</span>
        </div>
      )}
      {sub != null && (
        <div className="text-xs" style={{ color: MUTED }}>
          {sub}
        </div>
      )}
      {trend && (
        <div className="mt-auto pt-1">
          <Spark
            data={points}
            h={size === "md" ? 28 : 20}
            label={trendLabel ?? (typeof label === "string" ? `${label}, last ${points.length} runs` : "Trend")}
            empty="No history yet"
          />
        </div>
      )}
    </div>
  );
}
