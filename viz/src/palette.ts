// ── The chart palette every viz atom draws with ─────────────────────────────
// Ported from the dev dashboard's `components/viz/palette.tsx` (2026-11-08).
//
// The categorical slots are the validated default from the dataviz skill's
// `references/palette.md`: worst adjacent CVD ΔE 9.1 light / 8.4 dark, worst
// adjacent normal-vision ΔE 19.6 / 19.3. Three light slots (aqua, yellow,
// magenta) sit under 3:1 on a light surface, so every chart drawn with them
// ships visible labels or a table twin — the "relief rule".
//
// Colour follows the ENTITY, never its rank: a series owns a fixed slot, so a
// filter that drops one never repaints the survivors. Slots are 1-based and
// never cycled; a ninth series folds into "Other".
//
// Status colours (good / warning / serious / critical) are RESERVED for state.
// They are never a ninth series, and they never appear without an icon and a
// label — see `StatusIcon` and the `tone` props on `SegmentedBar`/`Legend`.
//
// Everything is a `--viz-*` custom property, so declaring the set page-wide
// restyles nothing that does not ask for it. `VizStyles` mounts `VIZ_CSS` once.
//
// THE TWO-SCOPE RULE. Dark is a SELECTED palette (its own steps), not a flip:
//   1. `:root`                         — light, the default
//   2. the OS media query              — dark, unless the page stamped light
//   3. `:root[data-viz-scheme="dark"]` — dark, the page's own choice, which
//                                        beats the OS both ways
// The stamp is written by `VizStyles` from its `scheme` prop, so an app whose
// themes are not simply "light" and "dark" (the fleet's tw-colors themes are
// classified by background lightness) tells the palette which it is showing.

export const VIZ_LIGHT = {
  s1: "#2a78d6",
  s2: "#eb6834",
  s3: "#1baf7a",
  s4: "#eda100",
  s5: "#e87ba4",
  s6: "#008300",
  s7: "#6250d6",
  s8: "#e34948",
  neutral: "#9ca3af",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#fcfcfb",
  muted: "#898781",
  deltaGood: "#006300",
  deltaBad: "#d03b3b",
} as const;

export const VIZ_DARK = {
  s1: "#3987e5",
  s2: "#d95926",
  s3: "#199e70",
  s4: "#c98500",
  s5: "#d55181",
  s6: "#008300",
  s7: "#9085e9",
  s8: "#e66767",
  neutral: "#4b5563",
  grid: "#2c2c2a",
  axis: "#383835",
  surface: "#1a1a19",
  muted: "#898781",
  deltaGood: "#0ca30c",
  deltaBad: "#e66767",
} as const;

/** Fixed in both modes — status is never themed. */
export const STATUS_HEX = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export type StatusTone = keyof typeof STATUS_HEX;
export const STATUS_TONES: readonly StatusTone[] = ["good", "warning", "serious", "critical"];

type Mode = { [K in keyof typeof VIZ_LIGHT]: string };

function declarations(mode: Mode): string {
  const slots = [1, 2, 3, 4, 5, 6, 7, 8]
    .map((n) => `--viz-s${n}: ${mode[`s${n}` as keyof Mode]};`)
    .join(" ");
  return [
    slots,
    `--viz-neutral: ${mode.neutral};`,
    `--viz-grid: ${mode.grid};`,
    `--viz-axis: ${mode.axis};`,
    `--viz-surface: ${mode.surface};`,
    `--viz-muted: ${mode.muted};`,
    `--viz-delta-good: ${mode.deltaGood};`,
    `--viz-delta-bad: ${mode.deltaBad};`,
  ].join(" ");
}

const STATUS_DECLS = (Object.keys(STATUS_HEX) as StatusTone[])
  .map((t) => `--viz-${t}: ${STATUS_HEX[t]};`)
  .join(" ");

/** The stylesheet `VizStyles` mounts: light default, OS dark, explicit stamp. */
export const VIZ_CSS = `
:root { ${declarations(VIZ_LIGHT)} ${STATUS_DECLS} }
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-viz-scheme="light"])) { ${declarations(VIZ_DARK)} }
}
:root[data-viz-scheme="dark"] { ${declarations(VIZ_DARK)} }
.viz-tabular { font-variant-numeric: tabular-nums; }
`;

/** Categorical slot → its CSS variable. Slots are 1-based and clamped, never cycled. */
export function seriesColor(slot: number): string {
  const n = Math.min(8, Math.max(1, Math.round(Number.isFinite(slot) ? slot : 1)));
  return `var(--viz-s${n})`;
}

/** A status tone → its CSS variable. Only ever drawn beside an icon and a label. */
export function statusColor(tone: StatusTone): string {
  return `var(--viz-${tone})`;
}

/** The one non-categorical fill: "other", "nothing was happening". */
export const NEUTRAL = "var(--viz-neutral)";
/** Hairline gridlines and empty tracks. */
export const GRID = "var(--viz-grid)";
/** The baseline / axis rule. */
export const AXIS = "var(--viz-axis)";
/** Muted ink for axis ticks and secondary labels (the same step in both modes). */
export const MUTED = "var(--viz-muted)";
export const DELTA_GOOD = "var(--viz-delta-good)";
export const DELTA_BAD = "var(--viz-delta-bad)";

/**
 * The ink for a label printed INSIDE a fill: near-black on the yellow slot and
 * the warning tone (both too light for white), white on everything else. The
 * same two inks in both modes — the fill's own luminance decides.
 */
export function inkOn(fill: { slot?: number; tone?: StatusTone; neutral?: boolean }): string {
  if (fill.tone === "warning") return "#0b0b0b";
  if (!fill.tone && !fill.neutral && Math.round(fill.slot ?? 1) === 4) return "#0b0b0b";
  return "#ffffff";
}

/**
 * A meter's unfilled track: a lighter step of the fill's own ramp, mixed toward
 * the chart surface, so blue sits on pale blue and red on pale red in either
 * mode and the state reads across the whole bar.
 */
export function trackFor(fill: string): string {
  return `color-mix(in oklab, ${fill} 22%, var(--viz-surface))`;
}
