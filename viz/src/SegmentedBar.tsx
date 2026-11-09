// ── The segmented bar: one whole, split into parts ───────────────────────────
// The dataviz "Figures" spec. No baseline, so no end is square. Widths are
// proportional to the values; a part at zero draws nothing.
//
//   thin  8 px (4 px dense), fully rounded ends, no text.
//   tall  28 px and never more; each part its own block with 4 px corners and
//         its amount (or share) printed inside at the leading edge, in white or
//         near-black by the fill (`inkOn`). A block too narrow for its label
//         prints none — never a clipped label; the value stays in the tooltip,
//         the accessible name and the table twin.
//
// Colour: a part is an identity (`slot`), an "other" (`neutral`), or a STATE
// (`tone`: good / warning / serious / critical). A toned part is the only way a
// status colour reaches this bar, and the legend then draws that part's icon
// beside its label — the colour never carries the meaning alone.
//
// Hover, keyboard focus and the bar's accessible name give every part's name,
// amount and share. The legend lists the names in block order and repeats no
// numbers.

import { useEffect, useRef, useState } from "react";

import { cx } from "./_cx";
import { NoData } from "./BarSet";
import { formatInt } from "./format";
import { Legend } from "./Legend";
import { GRID, inkOn, NEUTRAL, seriesColor, statusColor } from "./palette";
import { labelFits, placeStack, type Part, type PlacedPart } from "./stack";

export type SegmentPart = Part;

const fillOf = (p: Part): string => (p.tone ? statusColor(p.tone) : p.neutral ? NEUTRAL : seriesColor(p.slot ?? 1));

const GAP = 2;

export interface SegmentedBarProps {
  parts: SegmentPart[];
  /** The bar's accessible name — "Status codes, last crawl". */
  title: string;
  variant?: "tall" | "thin";
  /** Thin only: 4 px for dense rows. */
  dense?: boolean;
  /** What a tall block prints inside: its amount (default) or its share. */
  show?: "value" | "share";
  format?: (value: number) => string;
  /** Draw the legend under the bar (default true). */
  legend?: boolean;
  /** Keep an empty track rather than "no data" when nothing has a value. */
  track?: boolean;
  empty?: string;
  /** A part was clicked or activated from the keyboard. */
  onSelect?: (key: string) => void;
  /** Keys of the parts currently chosen (a filter): ringed, and `aria-pressed`. */
  selected?: readonly string[];
  /** Width assumed before (or without) measuring — SSR and jsdom. */
  assumeWidth?: number;
  className?: string;
}

/** Every part in words — the bar's description and the screen-reader summary. */
export function describeParts(placed: PlacedPart[], format: (v: number) => string = formatInt): string {
  return placed.map((p) => `${p.label} ${format(p.value)} (${Math.round(p.share * 100)}%)`).join(", ");
}

function useWidth(assume: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(assume);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function SegmentedBar({
  parts,
  title,
  variant = "tall",
  dense = false,
  show = "value",
  format = formatInt,
  legend = true,
  track = false,
  empty = "Nothing recorded.",
  onSelect,
  selected = [],
  assumeWidth = 480,
  className,
}: SegmentedBarProps) {
  const placed = placeStack(parts);
  const [ref, width] = useWidth(assumeWidth);
  const tall = variant === "tall";
  const height = tall ? 28 : dense ? 4 : 8;

  if (placed.length === 0 && !track) return <NoData>{empty}</NoData>;

  const usable = Math.max(0, width - GAP * Math.max(0, placed.length - 1));
  const summary = describeParts(placed, format);

  return (
    <div className={cx("min-w-0", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={placed.length ? `${title}: ${summary}` : `${title}: nothing recorded`}
        className={cx("flex w-full", !tall && "overflow-hidden")}
        style={{
          height,
          gap: GAP,
          borderRadius: tall ? undefined : height,
          background: placed.length === 0 ? GRID : undefined,
        }}
      >
        {placed.map((p) => {
          const text = show === "share" ? `${Math.round(p.share * 100)}%` : format(p.value);
          const tip = p.tip ?? `${p.label}: ${format(p.value)} (${(p.share * 100).toFixed(1)}%)`;
          const fits = tall && labelFits(text.length, p.share * usable);
          const chosen = selected.includes(p.key);
          return (
            <div
              key={p.key}
              data-part={p.key}
              title={tip}
              aria-label={tip}
              tabIndex={0}
              role={onSelect ? "button" : undefined}
              aria-pressed={onSelect ? chosen : undefined}
              onClick={onSelect ? () => onSelect(p.key) : undefined}
              onKeyDown={
                onSelect
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(p.key);
                      }
                    }
                  : undefined
              }
              className={cx(
                "flex min-w-[2px] items-center outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                onSelect && "cursor-pointer",
              )}
              style={{
                flexGrow: p.value,
                flexBasis: 0,
                background: fillOf(p),
                borderRadius: tall ? 4 : 0,
                // Inset so the ring never needs room the 2 px gap does not have.
                boxShadow: chosen ? "inset 0 0 0 2px var(--viz-surface), inset 0 0 0 3px currentColor" : undefined,
              }}
            >
              {fits && (
                <span
                  aria-hidden="true"
                  className="viz-tabular whitespace-nowrap pl-2 text-xs font-medium"
                  style={{ color: inkOn(p) }}
                >
                  {text}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {legend && placed.length > 0 && (
        <Legend
          className="mt-2"
          items={placed.map((p) => ({
            key: p.key,
            label: p.label,
            slot: p.slot,
            neutral: p.neutral,
            tone: p.tone,
          }))}
        />
      )}
    </div>
  );
}
