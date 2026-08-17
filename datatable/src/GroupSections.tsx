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
  /** The enclosing section's lane value, `null` at the top level. A drag
   *  payload wants this — it is the dragged section's parent. */
  parentValue: string | null;
  isNone: boolean;
  collapsed: boolean;
  count: number;
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
