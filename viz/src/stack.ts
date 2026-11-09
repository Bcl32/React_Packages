// Layout arithmetic for the stacked and segmented marks, pure so it is
// unit-tested without a DOM. `niceScale` and `placeStack` are ported from the
// dev dashboard's `components/viz/stack.ts`.

import type { StatusTone } from "./palette";

/**
 * A clean axis for values up to `max`: the top tick is the smallest 1 / 2 / 2.5
 * / 5 × 10ⁿ at or above `max`, and `count` + 1 evenly spaced ticks run from 0.
 * `{ top: 0, ticks: [0] }` for an empty series.
 */
export function niceScale(max: number, count = 4): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 0, ticks: [0] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s * count >= max) ?? 10 * mag;
  return { top: step * count, ticks: Array.from({ length: count + 1 }, (_, i) => step * i) };
}

/**
 * One part of a whole. Coloured by exactly one of: a categorical `slot` (the
 * part is an identity), `neutral` (an "other" bucket), or a status `tone` (the
 * part IS a state — and then the bar prints its icon and label).
 */
export interface Part {
  key: string;
  label: string;
  value: number;
  slot?: number;
  neutral?: boolean;
  tone?: StatusTone;
  /** The part's tooltip, whole; without it the bar says `label: value (share)`. */
  tip?: string;
}

export type PlacedPart<P extends Part = Part> = P & {
  /** Fraction of the whole, 0–1. */
  share: number;
  /** Offset from the bar's start, 0–1. */
  offset: number;
};

/**
 * Lay out a 100 % bar, dropping zero, negative and non-finite parts so the bar
 * never carries a 0-width sliver that the 2 px gap would render as a stray
 * line. `[]` when nothing has a value — the caller says "no data" in words.
 */
export function placeStack<P extends Part>(parts: readonly P[]): PlacedPart<P>[] {
  const live = parts.filter((p) => Number.isFinite(p.value) && p.value > 0);
  const total = live.reduce((n, p) => n + p.value, 0);
  if (total <= 0) return [];
  let offset = 0;
  return live.map((p) => {
    const share = p.value / total;
    const placed = { ...p, share, offset };
    offset += share;
    return placed;
  });
}

/**
 * Whether a label of `chars` characters fits inside a block `px` wide with
 * comfortable padding on both sides. Measured from an average glyph width so
 * it needs no DOM; a label that does not fit is not printed (never clipped) —
 * the value stays in the legend's tooltip and the table twin.
 */
export function labelFits(chars: number, px: number, glyphPx = 7, padPx = 8): boolean {
  if (!(px > 0)) return false;
  return chars * glyphPx + padPx * 2 <= px;
}
