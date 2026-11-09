// ── The legend: a key and a label per series ─────────────────────────────────
// Ported from the dev dashboard's `components/viz/Legend.tsx`. Always present
// for two or more series; identity is never colour alone. A categorical item
// shows a swatch; a STATUS item shows its icon in the tone's colour — the
// icon-plus-label pairing every status cue owes. Text stays in ink, never in
// the series colour.

import type { ReactNode } from "react";

import { cx } from "./_cx";
import { MUTED, NEUTRAL, seriesColor, type StatusTone } from "./palette";
import { StatusIcon } from "./StatusIcon";

export interface LegendItem {
  label: ReactNode;
  /** React key; defaults to `label` when that is a string. */
  key?: string;
  slot?: number;
  /** An explicit colour; wins over `slot`. */
  color?: string;
  neutral?: boolean;
  /** A state rather than an identity: drawn as the tone's icon. */
  tone?: StatusTone;
  /** Diagonal stripes in the colour, outlined: a state of the series rather than another series. */
  hatch?: boolean;
  value?: ReactNode;
  title?: string;
}

function swatchStyle(it: LegendItem) {
  const c = it.color ?? (it.neutral ? NEUTRAL : seriesColor(it.slot ?? 1));
  return it.hatch
    ? { background: `repeating-linear-gradient(45deg, ${c} 0 2px, transparent 2px 4px)`, outline: `1px solid ${c}` }
    : { background: c };
}

export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cx("flex flex-wrap gap-x-4 gap-y-1 text-[11px]", className)}>
      {items.map((it, i) => (
        <li
          key={it.key ?? (typeof it.label === "string" ? it.label : i)}
          className="flex items-center gap-1.5"
          title={it.title}
        >
          {it.tone ? (
            <StatusIcon tone={it.tone} size={12} />
          ) : (
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-[2px]" style={swatchStyle(it)} />
          )}
          <span>{it.label}</span>
          {it.value != null && (
            <span className="viz-tabular" style={{ color: MUTED }}>
              {it.value}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
