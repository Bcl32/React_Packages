// ── Ranked horizontal bars, and the small bar furniture around them ──────────
// Ported from the dev dashboard's `components/viz/bars.tsx` (BarSet, CellBar,
// NoData). Bars are CSS boxes rather than SVG: each row carries real text that
// must wrap and be selectable. One axis, length from zero, a 4 px rounded data
// end and a square baseline, ≤ 24 px thick.

import type { ReactNode } from "react";

import { cx } from "./_cx";
import { GRID, seriesColor } from "./palette";

/** What a chart shows when its feed produced nothing — "no data", never "zero". */
export function NoData({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("py-3 text-xs", className)} style={{ color: "var(--viz-muted)" }}>
      {children}
    </p>
  );
}

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  /** A palette slot, when each row is its own identity. */
  slot?: number;
  /** Rendered at the row's right edge — the direct label. Defaults to the value. */
  valueLabel?: ReactNode;
  sub?: ReactNode;
  tip?: string;
}

export interface BarSetProps {
  rows: BarRow[];
  /** The shared axis maximum; the largest row by default. */
  max?: number;
  /**
   * One colour for every bar, winning over each row's slot: a leaderboard of
   * one measure is not a set of identities, so it takes no categorical hue.
   * Categorical slot 1 when neither is given.
   */
  color?: string;
  /** Sort by value, largest first (default true — the set is ranked). */
  ranked?: boolean;
  /** Keep only the first `limit` rows after ranking. */
  limit?: number;
  /** The set's accessible name. */
  title: string;
  empty?: ReactNode;
  /** Bar thickness in px (capped at 24). */
  thickness?: number;
  className?: string;
}

/** A ranked set of horizontal bars sharing one axis, each directly labelled. */
export function BarSet({
  rows,
  max,
  color,
  ranked = true,
  limit,
  title,
  empty = "Nothing recorded.",
  thickness = 8,
  className,
}: BarSetProps) {
  const ordered = (ranked ? [...rows].sort((a, b) => b.value - a.value) : rows).slice(0, limit ?? rows.length);
  const scale = max ?? ordered.reduce((n, r) => Math.max(n, r.value), 0);
  if (ordered.length === 0) return <NoData>{empty}</NoData>;
  const t = Math.min(24, Math.max(2, thickness));
  return (
    <ul aria-label={title} className={cx("space-y-2", className)}>
      {ordered.map((r) => (
        <li key={r.key} className="min-w-0" title={r.tip}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="viz-tabular shrink-0">{r.valueLabel ?? r.value}</span>
          </div>
          <div className="mt-1 w-full" style={{ height: t, background: GRID, borderRadius: 2 }}>
            <div
              style={{
                height: t,
                width: scale > 0 ? `${Math.max(r.value > 0 ? 1 : 0, (r.value / scale) * 100)}%` : "0%",
                background: color ?? seriesColor(r.slot ?? 1),
                // Square at the baseline (left), rounded at the data end.
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>
          {r.sub != null && (
            <div className="mt-0.5 text-[11px]" style={{ color: "var(--viz-muted)" }}>
              {r.sub}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The in-table bar: a magnitude cue beside a number already printed in the
 * cell, so it carries no label of its own.
 */
export function CellBar({ value, max, slot = 1, color }: { value: number; max: number; slot?: number; color?: string }) {
  return (
    <span aria-hidden="true" className="inline-block h-1.5 w-full min-w-[24px] align-middle" style={{ background: GRID, borderRadius: 2 }}>
      <span
        className="block h-1.5"
        style={{
          width: max > 0 ? `${Math.max(value > 0 ? 2 : 0, (value / max) * 100)}%` : "0%",
          background: color ?? seriesColor(slot),
          borderRadius: "0 3px 3px 0",
        }}
      />
    </span>
  );
}
