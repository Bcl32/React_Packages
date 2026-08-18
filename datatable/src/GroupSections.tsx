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
 */
export const NARROW_SPAN_TIER_CLASS: Record<SpanTier, string> = {
  xs: "md:col-span-1",
  s: "md:col-span-1",
  m: "md:col-span-1",
  l: "md:col-span-2",
};

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
 *  collapses. */
export interface SectionWrapperProps {
  className: string;
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
 *   its `className` is the grid item's span geometry, so append to it, never
 *   replace it.
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
        "flex items-center gap-2",
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
          className="truncate text-left hover:underline"
          title={props.labelTitle}
          onClick={props.onLabelClick}
        >
          {props.label}
        </button>
      ) : (
        <span className="truncate">{props.label}</span>
      )}
      <span className="ml-auto flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
        {props.aggregate != null && <span>{props.aggregate}</span>}
        <span>({props.count})</span>
        {props.actions}
      </span>
    </div>
  );
}
