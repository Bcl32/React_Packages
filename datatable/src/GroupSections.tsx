import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@bcl32/utils/cn";

/**
 * The shared vocabulary of packed section grids.
 *
 * Two packing systems grew up separately — the app pages' hand-curated section
 * grids (Print-Tracker's `sectionViewConfig`) and the attribute-grouped
 * sections layout here — and both answer the same two questions: *how many
 * tracks does a section claim* and *what does its header row look like*. This
 * module is the single answer; the curated system keeps its own hand-tuned
 * per-shape thresholds where it wants them, but the tier names, the grid
 * classes, and the header anatomy come from here.
 */

/** How wide a section is, as a rung: xs ≈ one track, s two, m three, l the
 *  whole row. The tier is the shared currency — resolvers can differ on *when*
 *  a section earns a tier, but a tier always means the same width. */
export type SpanTier = "xs" | "s" | "m" | "l";

/**
 * Tier → six-track grid class. Written out as whole class names because
 * Tailwind's scanner only sees literals.
 *
 * xs stays two tracks until xl: below ~1280px a single ~240px track is too
 * narrow to hold even one card plus the section header.
 */
export const SPAN_TIER_CLASS: Record<SpanTier, string> = {
  xs: "md:col-span-2 xl:col-span-1",
  s: "md:col-span-2",
  m: "md:col-span-3",
  l: "md:col-span-6",
};

/**
 * The same tiers against the two tracks a *nested* section divides among its
 * own children. The ladder collapses — everything below full width pairs up,
 * and only a section that asked for the whole row takes the parent's width.
 *
 * Kept for the curated section grids (Print-Tracker re-exports it as
 * `NARROW_SPAN_CLASS`), which really do divide a fixed two tracks. The
 * attribute-grouped sections view no longer uses it: its nested grids take
 * their track count from the parent's span and map the tiers onto it with
 * `spanTierTracks`, which is what stops xs, s and m all meaning "half".
 */
export const NARROW_SPAN_TIER_CLASS: Record<SpanTier, string> = {
  xs: "md:col-span-1",
  s: "md:col-span-1",
  m: "md:col-span-1",
  l: "md:col-span-2",
};

/**
 * The same tier ladder as a TRACK COUNT against a grid of `tracks` tracks —
 * the numeric form of `SPAN_TIER_CLASS`, and what a *nested* grid needs.
 *
 * A sub-section grid gets as many tracks as its parent claimed columns (see
 * `SECTION_INNER_GRID_CLASS`), so the tier has to be mapped onto that number
 * rather than onto a fixed two. The proportions are the six-track ladder's:
 * a sixth, a third, a half, the lot. On K = 6 it reproduces
 * `SPAN_TIER_CLASS` exactly (1 / 2 / 3 / 6) — which is the point, since a
 * nested track is then the same width as an outer one and "Narrow" means one
 * thing at every depth. On a narrow parent the rungs degrade by collapsing
 * into each other from the bottom, never below one track.
 */
export function spanTierTracks(tier: SpanTier, tracks: number): number {
  const k = Math.max(1, Math.round(tracks));
  const share = tier === "xs" ? k / 6 : tier === "s" ? k / 3 : tier === "m" ? k / 2 : k;
  return Math.max(1, Math.min(k, Math.round(share)));
}

/**
 * Which tier a section earns from how many cards it holds and how wide a card
 * is. The thresholds aim every section at one or two rows of cards, scaled by
 * how many of these cards fit where a full-size (~320px) one does — so small
 * groups sit beside each other instead of each stretching a band across the
 * page.
 *
 * Card-width-scaled rather than per-shape tables (the curated sections keep
 * those): a grouped layout's card width is continuous — size presets, custom
 * `cardMinWidth` — so the resolver has to be too.
 */
export function spanTierForCards(count: number, cardWidth: number): SpanTier {
  const scale = Math.max(1, Math.round(320 / cardWidth));
  if (count <= 2 * scale) return "s";
  if (count <= 4 * scale) return "m";
  return "l";
}

/**
 * The vertical half of the packing: the row module a packed grid quantizes
 * section heights onto.
 *
 * `grid-auto-flow: dense` only back-fills holes along the *inline* axis —
 * with auto-sized rows every grid row is a full-width strip as tall as its
 * tallest member, so one tall section strands every pixel below its shorter
 * neighbours and nothing can ever move up into them. Give the grid a fixed
 * row module and every section an explicit `grid-row-end: span N`, and the
 * same dense placement suddenly back-fills in BOTH axes: two small sections
 * stack beside a tall one.
 *
 * The module is coarse on purpose. Heights snap to 1/2/3… multiples, so a
 * hole is always exactly the shape of something that can fill it — a fine
 * module (say 4px) packs tighter in theory and in practice just reproduces
 * the ragged heights it was meant to quantize. 48px is picked so a COLLAPSED
 * section — border + p-3 + one header line — is exactly one module; a rung
 * that fits the smallest thing the layout can hold is the one that never
 * leaves a sliver behind.
 */
export const SECTION_ROW_MODULE_PX = 48;

/** The grid's row gap, in px — `gap-3`. Part of the arithmetic, not decor: N
 *  modules stack to `N * MODULE + (N - 1) * GAP`, so the gaps a span swallows
 *  are height the section doesn't need a further module for. */
export const SECTION_ROW_GAP_PX = 12;

/** The row module as a grid class, md+ only. Below md the grids are a single
 *  column with auto rows, where a span is already a no-op — and a fixed module
 *  there would fight the one-column stack instead of packing it. Written out
 *  as a literal because Tailwind's scanner only sees literals; it must stay in
 *  step with `SECTION_ROW_MODULE_PX` above. */
export const SECTION_ROW_MODULE_CLASS = "md:[grid-auto-rows:48px]";

/**
 * The fine row module — the same machinery, quantized as small as it goes.
 *
 * The coarse module trades a little vertical slack (up to `MODULE + GAP - 1`
 * px under a section) for holes shaped like the things that can fill them.
 * Turn the module down and that trade inverts: the slack all but vanishes —
 * neighbouring sections sit as close as their content allows, masonry-style —
 * at the cost of holes too fine for anything to land in, so the sideways
 * back-fill does less. Which of those is the better layout depends on the
 * collection, so it is a mode (`"tight"`), not a new constant.
 *
 * 8px is the floor worth having: below it the span numbers grow without the
 * geometry changing (the row gap, not the module, then dominates the pitch).
 */
export const SECTION_ROW_MODULE_TIGHT_PX = 8;

/** The fine row module as a grid class — the literal twin of
 *  `SECTION_ROW_MODULE_TIGHT_PX`, for Tailwind's scanner. */
export const SECTION_ROW_MODULE_TIGHT_CLASS = "md:[grid-auto-rows:8px]";

/** How many row modules a section of `height` px claims:
 *  `N * MODULE + (N - 1) * GAP >= height`. The 1px slack absorbs sub-pixel
 *  measurement (fractional device pixels, a border that rounds up) — without
 *  it a section measuring 48.02px would claim a second module and open a
 *  module-sized hole under every one of them.
 *
 *  The module is a parameter rather than a constant read: a packing mode may
 *  quantize finer (see `SECTION_ROW_MODULE_TIGHT_PX`), and the arithmetic is
 *  the same arithmetic — a second copy of it is how the class and the span
 *  drift apart. */
export function sectionRowSpan(height: number, modulePx: number = SECTION_ROW_MODULE_PX): number {
  const module = Math.max(1, modulePx) + SECTION_ROW_GAP_PX;
  return Math.max(1, Math.ceil((height - 1 + SECTION_ROW_GAP_PX) / module));
}

/**
 * How far below its nominal width a tile may be squeezed to win the row one
 * more column. `auto-fill` treats the size preset as a hard MINIMUM, which is
 * why a section that should show six tiles shows five: the section's own
 * chrome — a 1px border and p-3, doubled again inside a nested sub-section —
 * takes the row just under `6 × nominal + 5 × gap`, the sixth track fails to
 * fit, and its width is handed to the five survivors, which stretch far
 * further past nominal than the sixth would have pulled them under it.
 *
 * Treating the preset as a TARGET instead asks the better question: is the
 * row closer to N tiles or to N+1? 12% is the answer that fixes the observed
 * off-by-ones (a large tile lands at ~183px instead of 208) while a tile two
 * sizes down never sneaks a whole extra column in.
 */
export const SECTION_TILE_SHRINK_TOL = 0.12;

/**
 * How many tile columns a card grid of `available` px should draw for a
 * `nominal`-wide tile — the count that makes rows fill edge to edge instead
 * of stretching whatever survived `auto-fill`.
 *
 * Measured per grid rather than reasoned about from the section's span, which
 * is what makes it correct at every nesting depth: the chrome between the
 * section's width and its cards' width is already subtracted from what we
 * measured.
 */
export function sectionColumnCount(
  available: number,
  nominal: number,
  tolerance: number = SECTION_TILE_SHRINK_TOL
): number {
  if (!(available > 0) || !(nominal > 0)) return 1;
  const gap = SECTION_ROW_GAP_PX;
  // Below one nominal tile the answer is one column, however narrow — the
  // old `minmax(min(nominal, 100%), 1fr)` said the same thing.
  const base = Math.max(1, Math.floor((available + gap) / (nominal + gap)));
  const widthAt = (count: number) => (available - (count - 1) * gap) / count;
  // `tolerance: 0` is the uniform packing's question: how many tiles fit at
  // exactly their nominal width, no squeeze admitted. It reduces to the floor
  // above, since an extra column can only make each one narrower.
  return widthAt(base + 1) >= nominal * (1 - tolerance) ? base + 1 : base;
}

/**
 * The tile block a section of `count` cards should aim for, as a column count.
 *
 * Square-to-portrait on purpose: `ceil(sqrt(n))` — 1→1, 2→2, 4→2, 6→3, 9→3,
 * 12→4. A packed grid has two ways to give a small section the room it needs,
 * and they are not equally cheap. Growing it WIDE spends tracks, which is the
 * scarce axis: a six-photo sub-section laid out in one row claims the whole
 * parent and pushes every sibling onto a row of its own, which is the stranded
 * layout this packing exists to end. Growing it DOWN spends rows, which the
 * measured row span already quantizes and which the dense flow then fills
 * beside it — two narrow sections stack in one column while a third sits
 * alongside. So the default bias is narrow, and the section wraps.
 *
 * `capacity` is how many columns the enclosing grid could hold at all — the
 * answer is never more than that, since a section cannot claim width that does
 * not exist.
 *
 * The `"wide"` bias makes the opposite trade, and it is a real preference
 * rather than a worse one: laid out wide a sub-section reads as ONE strip of
 * photos in reading order (six shots of the back yard in a single row), which
 * is what a viewer scanning a gallery wants, at the cost of the tracks its
 * siblings would have packed into. It spends the fewest ROWS the capacity
 * allows — the smallest row count `r` whose `ceil(n / r)` columns still fit —
 * so it collapses to a single row whenever one is available, and degrades to
 * balanced blocks (8 photos into 6 tracks → 2 rows of 4, not 6 + 2) rather
 * than a full row plus a stub.
 */
export function sectionShapeColumns(
  count: number,
  capacity: number = Infinity,
  bias: "narrow" | "wide" = "narrow"
): number {
  const n = Math.max(1, count);
  const cap = Math.max(1, Math.floor(Math.min(capacity, n)));
  if (bias === "wide") {
    const rows = Math.max(1, Math.ceil(n / cap));
    return Math.max(1, Math.min(cap, Math.ceil(n / rows)));
  }
  return Math.max(1, Math.min(cap, Math.ceil(Math.sqrt(n))));
}

/**
 * How many tracks a section needs to hold `columns` tiles of `tileWidth`,
 * on a grid whose track pitch is `pitch` and which has `tracks` of them.
 *
 * `chrome` is the section's own border + padding, measured rather than
 * assumed: it is the difference between the track width the grid hands out and
 * the width the cards actually get, and it is exactly what makes the naive
 * "columns × tile" answer one track short at every nesting depth.
 *
 * The tile floor is `SECTION_TILE_SHRINK_TOL` below nominal — the same
 * admission rule `sectionColumnCount` applies when it decides how many columns
 * the resulting box will draw. Sharing it is what keeps the two answers
 * consistent: a span picked against a stricter rule than the renderer's would
 * buy a track the renderer then refuses to use.
 */
export function sectionTrackSpanForColumns(
  columns: number,
  tileWidth: number,
  chrome: number,
  pitch: number,
  tracks: number,
  tolerance: number = SECTION_TILE_SHRINK_TOL
): number {
  const k = Math.max(1, Math.round(tracks));
  if (!(pitch > 0) || !(tileWidth > 0)) return k;
  const gap = SECTION_ROW_GAP_PX;
  const floor = tileWidth * (1 - tolerance);
  const contentPx = chrome + columns * (floor + gap) - gap;
  return Math.max(1, Math.min(k, Math.ceil((contentPx + gap) / (pitch + gap))));
}

/** The width of one track on a `tracks`-track grid `width` px wide. */
export function sectionTrackPitch(width: number, tracks: number): number {
  const k = Math.max(1, Math.round(tracks));
  return (width - (k - 1) * SECTION_ROW_GAP_PX) / k;
}

/**
 * The nested sub-section grid's column template, and a child's column span,
 * as CSS custom properties.
 *
 * Custom properties rather than plain inline styles because both numbers are
 * md-and-up ONLY: below md the packed grids collapse to a single column, and
 * an inline `grid-template-columns` (or a `grid-column-end: span 3` against a
 * one-track grid, which would conjure implicit columns) beats every media
 * query there is. A variable can be set inline while the media query stays in
 * the stylesheet, which is the one arrangement that lets a computed value be
 * responsive.
 *
 * Written as literal class strings for Tailwind's scanner, and as a pair of
 * arbitrary properties rather than `grid-cols-1` + an arbitrary override, so
 * the base and the md rung sort against each other predictably.
 */
export const SECTION_TRACKS_VAR = "--sec-tracks";
export const SECTION_COL_SPAN_VAR = "--sec-col-span";
export const SECTION_INNER_GRID_CLASS =
  "[grid-template-columns:repeat(1,minmax(0,1fr))] md:[grid-template-columns:var(--sec-tracks)]";
export const SECTION_COL_SPAN_CLASS = "md:[grid-column-end:var(--sec-col-span)]";

/**
 * Which packing the sections view applies — the layout's one taste knob.
 *
 * The pieces below (row modules, content-sized spans, integer tile columns)
 * arrived as successive improvements, and each of them trades something real:
 * dense 2D packing buys back stranded vertical space but scatters reading
 * order; content-sized sub-sections hug what they hold but make sibling
 * widths uneven; a fine row module minimises gaps but coarsens nothing, so
 * holes stop being shaped like their fillers. Which trade is right is a
 * property of the collection on screen, not of the code — so the modes are
 * offered rather than picked here, and a consumer can put them in front of the
 * user.
 *
 * - `rows` — no vertical packing at all: sections flow as full-width grid rows
 *   the way they did before any of this, sub-sections split their parent down
 *   the middle. The baseline the others are judged against.
 * - `packed` — measured row spans against the coarse module, so dense
 *   placement back-fills both axes; sub-sections stay uniform halves.
 * - `fit-wide` — as `packed`, plus sub-sections sized to their contents with a
 *   single-row bias: a group reads as one strip of tiles where the width
 *   exists.
 * - `fit-narrow` — content-sized with the square-ish bias, which spends rows
 *   (cheap, the dense flow fills beside them) instead of tracks (scarce).
 * - `uniform` — every tile at exactly its nominal width, no stretching to fill
 *   a row: the mode for comparing photographs, where a tile that grew because
 *   its section happened to be wide is the thing you were trying to avoid.
 * - `tight` — `fit-narrow` against the fine row module: minimal vertical
 *   slack, masonry-ish, at the cost of coarse holes worth back-filling.
 */
export type SectionsPacking =
  | "rows"
  | "packed"
  | "fit-wide"
  | "fit-narrow"
  | "uniform"
  | "tight";

/** What a packing mode actually switches on. One record per mode rather than a
 *  chain of `mode === …` tests at each decision, so a new mode is a row here
 *  and the renderer keeps saying *what* it is doing rather than *for whom*. */
export interface SectionsPackingBehaviour {
  /** Row module in px; 0 disables row-span packing entirely. */
  rowModulePx: number;
  /** The matching `grid-auto-rows` class — empty when there is no module. */
  rowModuleClass: string;
  /** Size sub-sections to their contents (tracks for the tiles they hold)
   *  instead of to a rung of the tier ladder. */
  contentSized: boolean;
  /** Which shape a content-sized sub-section aims for. */
  shapeBias: "narrow" | "wide";
  /** How far a tile may be squeezed to win a column. 0 pins it at nominal. */
  shrinkTol: number;
  /** Draw tiles at their nominal width instead of stretching them to fill the
   *  row — the section keeps the leftover as slack. */
  fixedTileWidth: boolean;
  /** Nested grids are a fixed two tracks with the collapsed tier ladder (the
   *  original shape) rather than as many tracks as the parent claimed. */
  legacyNestedGrid: boolean;
}

export const SECTIONS_PACKING: Record<SectionsPacking, SectionsPackingBehaviour> = {
  rows: {
    rowModulePx: 0,
    rowModuleClass: "",
    contentSized: false,
    shapeBias: "narrow",
    shrinkTol: SECTION_TILE_SHRINK_TOL,
    fixedTileWidth: false,
    legacyNestedGrid: true,
  },
  packed: {
    rowModulePx: SECTION_ROW_MODULE_PX,
    rowModuleClass: SECTION_ROW_MODULE_CLASS,
    contentSized: false,
    shapeBias: "narrow",
    shrinkTol: SECTION_TILE_SHRINK_TOL,
    fixedTileWidth: false,
    legacyNestedGrid: true,
  },
  "fit-wide": {
    rowModulePx: SECTION_ROW_MODULE_PX,
    rowModuleClass: SECTION_ROW_MODULE_CLASS,
    contentSized: true,
    shapeBias: "wide",
    shrinkTol: SECTION_TILE_SHRINK_TOL,
    fixedTileWidth: false,
    legacyNestedGrid: false,
  },
  "fit-narrow": {
    rowModulePx: SECTION_ROW_MODULE_PX,
    rowModuleClass: SECTION_ROW_MODULE_CLASS,
    contentSized: true,
    shapeBias: "narrow",
    shrinkTol: SECTION_TILE_SHRINK_TOL,
    fixedTileWidth: false,
    legacyNestedGrid: false,
  },
  uniform: {
    rowModulePx: SECTION_ROW_MODULE_PX,
    rowModuleClass: SECTION_ROW_MODULE_CLASS,
    contentSized: true,
    shapeBias: "narrow",
    // Exact, not tolerant: the tiles cannot shrink, so a span bought at a
    // squeezed floor would buy a track the grid then leaves empty.
    shrinkTol: 0,
    fixedTileWidth: true,
    legacyNestedGrid: false,
  },
  tight: {
    rowModulePx: SECTION_ROW_MODULE_TIGHT_PX,
    rowModuleClass: SECTION_ROW_MODULE_TIGHT_CLASS,
    contentSized: true,
    shapeBias: "narrow",
    shrinkTol: SECTION_TILE_SHRINK_TOL,
    fixedTileWidth: false,
    legacyNestedGrid: false,
  },
};

/** The packing a sections view uses when nothing asks for one. */
export const DEFAULT_SECTIONS_PACKING: SectionsPacking = "fit-narrow";

/** What a section wrapper (or header-actions renderer) learns about the
 *  section it decorates. `value` is the lane value — a tree board's node id
 *  or one of its sentinels; `path` is unique per rendered section and stable
 *  across re-bucketing (collapse state keys off it). */
export interface SectionWrapperInfo {
  value: string;
  label: string;
  path: string;
  /** 0 = top-level, 1 = nested sub-section. */
  depth: number;
  /** Position of this section's TOP-LEVEL ancestor in render order — its own
   *  position when `depth === 0`. What the default backdrop resolver keys off,
   *  so a sub-section wears its parent's hue rather than a hue of its own:
   *  a group is a top-level section *and everything under it*. */
  rootIndex: number;
  /** The enclosing section's lane value, `null` at the top level. A drag
   *  payload wants this — it is the dragged section's parent. */
  parentValue: string | null;
  isNone: boolean;
  collapsed: boolean;
  count: number;
}

/** Upper bound on the probe below. Not a palette size — just a stop condition,
 *  set far above any plausible number of backdrops. */
const MAX_SURFACE_PROBE = 32;

/** Memo keyed by the theme it was measured under — see `themeSurfaceCount`. */
let cachedSurfaceCount = 0;
let cachedSurfaceTheme: string | null = null;

/**
 * How many card backdrops the running theme actually defines — `surface-1 …
 * surface-N` from @bcl32/themes.
 *
 * **Read off the live CSS rather than declared here, and that is the whole
 * point.** A constant in this file would be a second copy of a number that
 * lives in themes.json, and the two would drift the first time the palette
 * grew: sections would keep cycling through eight while the theme shipped ten.
 * Probing the same custom properties the backdrop is about to *use* means the
 * count cannot disagree with reality by construction — including when it is
 * zero, in an app on an older @bcl32/themes, where it degrades to the neutral
 * frame instead of painting sections with a token that doesn't exist.
 *
 * Cost is one `getComputedStyle` on `<html>` plus N property reads, memoized
 * per theme. Called once per sections render, never per section.
 *
 * Two things the memo has to get right:
 *
 * - It is keyed on `data-theme`, not global. Nothing *guarantees* every theme
 *   defines the same number — the seeder writes them uniformly, but themes.json
 *   is hand-editable, which is the whole reason @bcl32/themes reports the
 *   minimum. A global memo would carry one theme's count into another and hand
 *   back an index whose variable doesn't exist there — and a `var()` with no
 *   definition is invalid at computed-value time, so the background resolves to
 *   transparent (measured) rather than falling back to anything. The section
 *   would simply lose its backdrop on a theme switch.
 * - Only a positive result is cached. Zero can also mean the stylesheet has not
 *   landed yet on the very first paint, and caching that would leave the page
 *   permanently untinted.
 */
export function themeSurfaceCount(): number {
  if (typeof document === "undefined") return 0;

  const theme = document.documentElement.getAttribute("data-theme");
  if (cachedSurfaceCount > 0 && cachedSurfaceTheme === theme) return cachedSurfaceCount;

  const style = getComputedStyle(document.documentElement);
  let n = 0;
  // Stops at the first gap, so a partially defined palette reports what it can
  // actually deliver rather than the highest number present.
  while (n < MAX_SURFACE_PROBE && style.getPropertyValue(`--surface-${n + 1}`).trim() !== "") {
    n++;
  }

  if (n > 0) {
    cachedSurfaceCount = n;
    cachedSurfaceTheme = theme;
  }
  return n;
}

/**
 * Backdrop for a tone index at a depth, as an inline style.
 *
 * A style rather than a Tailwind class because a class would have to be a
 * literal (the scanner sees nothing else), and a literal map is exactly the
 * hard-coded palette size this avoids. `hsl(var(--surface-N))` needs no build
 * step and works for whatever N the theme defines.
 *
 * The nested rung is the same hue at 60%, not a different token: it composites
 * against its *parent's own* backdrop, so a sub-section reads as an inset of
 * its group rather than as a new colour. That is also why the palette is stored
 * opaque — two nested alpha tints would multiply.
 *
 * Cycles, so a resolver may hand back any integer — a hash, a category ordinal
 * — without knowing the palette size.
 */
export function sectionToneStyle(
  tone: number,
  depth: number,
  count: number = themeSurfaceCount()
): React.CSSProperties | undefined {
  if (count <= 0) return undefined;
  const i = (((Math.trunc(tone) % count) + count) % count) + 1;
  return {
    background: depth === 0 ? `hsl(var(--surface-${i}))` : `hsl(var(--surface-${i}) / 0.6)`,
  };
}

/**
 * Which backdrop a section wears.
 *
 *   "none"   every section keeps the neutral card/background frame (default —
 *            an existing consumer sees no change until it opts in)
 *   "index"  by top-level position, sub-sections inheriting their parent's hue
 *   fn       a caller-owned mapping, for when the *value* should pick the
 *            colour rather than the position — so "Kitchen" is the same hue on
 *            every listing, and reordering sections doesn't reshuffle the page.
 *            Return `null` for "no backdrop"; any integer otherwise, cycled.
 */
export type SectionTone = "none" | "index" | ((section: SectionWrapperInfo) => number | null);

/**
 * The backdrop for one section, or `undefined` to keep the neutral frame.
 *
 * Takes `count` so a caller can probe once per render and pass it down, rather
 * than paying a `getComputedStyle` per section on the first paint.
 *
 * The "no value" bucket is never tinted, whatever the resolver says: it already
 * signals itself with muted text and a dashed border, and giving it a colour of
 * its own would make absence look like just another group.
 */
export function resolveSectionTone(
  tone: SectionTone | undefined,
  section: SectionWrapperInfo,
  count: number = themeSurfaceCount()
): React.CSSProperties | undefined {
  if (!tone || tone === "none" || section.isNone) return undefined;
  const index = tone === "index" ? section.rootIndex : tone(section);
  return index == null ? undefined : sectionToneStyle(index, section.depth, count);
}

/** The geometry the sections grid computed for a wrapped section. `className`
 *  is the span-tier grid class — the wrapper must carry it or the packing
 *  collapses — and `style` is the measured row span (`gridRowEnd`), the
 *  vertical half of the same answer. A wrapper with a style of its own (a dnd
 *  transform, say) must MERGE rather than replace: dropping the row span
 *  drops the section back onto one module and it overlaps its neighbour.
 *  Absent until the first measurement lands, which is one layout pass, before
 *  paint. */
export interface SectionWrapperProps {
  className: string;
  style?: React.CSSProperties;
}

/**
 * The section-level drag seam — `renderCardWrapper`'s sibling one rung up.
 * Takes over the outermost grid element of each rendered section so a
 * consumer can make sections droppable (a destination ring) and sortable
 * (drag the section tile itself). The inner `<section>` chrome — border,
 * header, body — stays package-rendered as `children`.
 *
 * The contract, mirroring the card seam:
 * - Render exactly ONE outermost element and spread `sectionProps` onto it —
 *   its `className` is the grid item's column geometry and its `style` the row
 *   span, so append/merge into both, never replace either.
 * - A drop ring must be inset (`ring-inset`): under `MeasuringStrategy.Always`
 *   a ring that grows the element invalidates the rects the drop is being
 *   resolved against, mid-drag.
 * - Callbacks can't call hooks — return a component instance (e.g. a
 *   `<SortableSection>`) and let it own `useSortable`/`useDroppable`.
 */
export type RenderSectionWrapper = (
  section: SectionWrapperInfo,
  sectionProps: SectionWrapperProps,
  children: React.ReactNode
) => React.ReactNode;

/**
 * The header row of a packed section — collapse chevron, visual, label,
 * count, optional aggregate. One anatomy for every depth: `size="sm"` is the
 * nested rung's quieter type scale.
 *
 * Slotted rather than configured: the label is a button when clicking it means
 * something (`onLabelClick`), inert text otherwise, and everything to the right
 * of the label rides in `aggregate`/`count` so a consumer with extra header
 * furniture can pass `actions`.
 *
 * `leading` is the mirror slot, and it exists for one thing in particular: a
 * reorder grip belongs at the head of the row it drags, ahead of the collapse
 * chevron — where the curated section cards have always put it — not filed
 * among the trailing menus, where the thing you grab to move a section moves
 * itself every time the aggregate's width changes.
 */
/** The section label: still truncates, but not past a legible stub — the
 *  floor is what makes the row wrap instead of ellipsing the name away. */
const LABEL_CLASS = "min-w-[5rem] flex-1 truncate";

export function GroupSectionHeader(props: {
  label: string;
  count: number;
  visual?: React.ReactNode;
  aggregate?: React.ReactNode;
  /** The "no value" bucket — muted, to match its dashed section frame. */
  isNone?: boolean;
  size?: "md" | "sm";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Clicking the label itself — the grouped layouts drill into a filter. */
  onLabelClick?: () => void;
  labelTitle?: string;
  /** Leading extras, before the collapse chevron — a drag grip. */
  leading?: React.ReactNode;
  /** Trailing extras after the count — menus, edit affordances. */
  actions?: React.ReactNode;
}): JSX.Element {
  const { collapsed, onToggleCollapse } = props;
  return (
    <div
      className={cn(
        // Wraps, and the label carries a floor. Both exist for the same
        // reason: a content-sized section can be one track wide, and a header
        // row that only ever shrinks spends every pixel on the furniture —
        // grip, chevron, count, whatever menus the consumer hung off it — and
        // ellipses the one part that says which section this is. Given a floor
        // the label can't shrink past, the furniture wraps to a second line
        // instead, which costs height (the axis a packed grid has to spare)
        // rather than meaning. Wide sections never reach the floor and lay out
        // exactly as before.
        "flex flex-wrap items-center gap-x-2 gap-y-1",
        props.size === "sm" ? "text-xs font-medium" : "text-sm font-medium",
        props.isNone && "text-muted-foreground"
      )}
    >
      {props.leading}
      {onToggleCollapse && (
        <button
          type="button"
          className="-m-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          title={collapsed ? "Expand section" : "Collapse section"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
      {props.visual}
      {props.onLabelClick ? (
        <button
          type="button"
          className={cn(LABEL_CLASS, "text-left hover:underline")}
          title={props.labelTitle}
          onClick={props.onLabelClick}
        >
          {props.label}
        </button>
      ) : (
        <span className={LABEL_CLASS} title={props.label}>
          {props.label}
        </span>
      )}
      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
        {props.aggregate != null && <span>{props.aggregate}</span>}
        <span>({props.count})</span>
        {props.actions}
      </span>
    </div>
  );
}
