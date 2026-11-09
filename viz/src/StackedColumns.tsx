// ── Stacked columns over an ordered axis (crawls, days) ─────────────────────
// Ported from the dev dashboard's `components/viz/StackedColumns.tsx`. One
// column per position, segments stacked from a shared zero baseline: ≤ 24 px
// wide (the band's leftover is air), a 4 px rounded data end and a square
// baseline, a 2 px gap between segments, hairline gridlines at clean ticks.
//
// CSS boxes rather than SVG, so a column keeps its pixel width and rounded top
// at any container width. Each column is ONE hit target, full plot height and
// band wide; its `title` lists every segment with the total, so a reader never
// aims at a thin slice. The caller renders the `Legend` and the `TableTwin`.

import { NoData } from "./BarSet";
import { AXIS, GRID, MUTED, NEUTRAL, seriesColor, statusColor, type StatusTone } from "./palette";
import { niceScale } from "./stack";

export interface ColumnSegment {
  key: string;
  label: string;
  value: number;
  /** A palette slot; `neutral` for an "other" bucket; `tone` for a state. */
  slot?: number;
  neutral?: boolean;
  tone?: StatusTone;
}

export interface Column {
  key: string;
  /** The tooltip's heading — a full date, say. */
  label: string;
  /** The axis label; empty to leave this position unlabelled. */
  tick?: string;
  segments: ColumnSegment[];
}

const fillOf = (s: ColumnSegment) => (s.tone ? statusColor(s.tone) : s.neutral ? NEUTRAL : seriesColor(s.slot ?? 1));

export interface StackedColumnsProps {
  columns: Column[];
  format: (v: number) => string;
  /** The y axis's labels; defaults to `format`. */
  tickFormat?: (v: number) => string;
  /** The chart's accessible name. */
  title: string;
  height?: number;
  empty?: string;
  /** Called with a column's key when it is clicked (drill-down). */
  onSelect?: (key: string) => void;
}

export function StackedColumns({
  columns,
  format,
  tickFormat = format,
  title,
  height = 160,
  empty = "Nothing recorded in this range.",
  onSelect,
}: StackedColumnsProps) {
  const totals = columns.map((c) => c.segments.reduce((n, s) => n + Math.max(0, s.value), 0));
  const { top, ticks } = niceScale(Math.max(0, ...totals));
  if (columns.length === 0 || top === 0) return <NoData>{empty}</NoData>;
  return (
    <div role="img" aria-label={title} className="flex gap-2">
      {/* The y axis: clean ticks in muted ink, never the series colour. */}
      <div className="viz-tabular relative w-10 shrink-0 text-right text-[10px]" style={{ height, color: MUTED }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: height - (t / top) * height }}>
            {tickFormat(t)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className="absolute inset-x-0 h-px"
              style={{ top: height - (t / top) * height, background: t === 0 ? AXIS : GRID }}
            />
          ))}
          <div className="absolute inset-0 flex items-end">
            {columns.map((c, i) => {
              const live = c.segments.filter((s) => s.value > 0);
              const tip = [`${c.label}: ${format(totals[i])}`, ...live.map((s) => `  ${s.label}: ${format(s.value)}`)].join("\n");
              return (
                <div
                  key={c.key}
                  title={tip}
                  onClick={onSelect ? () => onSelect(c.key) : undefined}
                  className={["group flex h-full min-w-0 flex-1 items-end justify-center", onSelect ? "cursor-pointer" : ""].join(" ")}
                >
                  <div
                    className="flex w-[70%] max-w-[24px] flex-col-reverse gap-[2px] overflow-hidden transition-opacity group-hover:opacity-80"
                    style={{ height: `${(totals[i] / top) * 100}%`, borderRadius: "4px 4px 0 0" }}
                  >
                    {live.map((s) => (
                      <div
                        key={s.key}
                        className="w-full shrink-0"
                        style={{
                          // Each segment's share of the column, less its share of the gaps.
                          height: `calc(${(s.value / totals[i]) * 100}% - ${((live.length - 1) * 2 * s.value) / totals[i]}px)`,
                          background: fillOf(s),
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div aria-hidden="true" className="mt-1 flex text-[10px]" style={{ color: MUTED }}>
          {columns.map((c) => (
            <span key={c.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
              {c.tick ?? ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
