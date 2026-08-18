import React from "react";
import type {
  Row,
  Table as TanstackTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, useReducedMotion } from "framer-motion";

import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";
import type { RowData } from "@bcl32/data-utils";

import { cn } from "@bcl32/utils/cn";

import { RowCard } from "./RowCard";
import type {
  CardRenderOptions,
  CardSlotOverrides,
  CardViewVariant,
  CardWrapperProps,
  RenderCardContext,
} from "./RowCard";
import { GALLERY_SIZE_WIDTHS } from "./GalleryCard";
import type {
  RenderSectionWrapper,
  SectionTone,
  SectionWrapperInfo,
  SectionsPacking,
} from "./GroupSections";
import {
  ROW_INDEX_ATTR,
  ROW_SCOPE_ATTR,
  ensureVisibleWithin,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";

/**
 * The layouts a DataTable can render its rows in.
 *
 *   table     the classic grid of columns
 *   cards     one card per row, fields placed by their `meta.card` slot
 *   gallery   media-only tiles, dense — for rows whose thumbnail is the content
 *   detail    compact list on the left, the expansion panel docked on the right
 *   board     the cards again, dealt into lanes by a group-by attribute
 *   sections  the cards again, packed into group sections sized by population
 *
 * Kept as a const array as well as a union so a persisted string can be
 * validated against it — the stored preference outlives the code that wrote it.
 */
export const DATA_TABLE_VIEWS = [
  "table",
  "cards",
  "gallery",
  "detail",
  "board",
  "sections",
] as const;

export type DataTableView = (typeof DATA_TABLE_VIEWS)[number];

export function isDataTableView(value: unknown): value is DataTableView {
  return (
    typeof value === "string" &&
    (DATA_TABLE_VIEWS as readonly string[]).includes(value)
  );
}

/**
 * A view a consumer declares for itself, rather than one of the five built in.
 *
 * The five layouts above are *renderers*; this is a **shape**, and a page can
 * have more shapes than there are renderers. Three card sizes over the same
 * rows are three shapes drawn by one renderer, and a slim column preset and the
 * full table are two more drawn by another. Before this existed a table could
 * hold exactly one `renderCard` and one column preset, so a page wanting four
 * shapes had to mount four tables and remount on every switch — which is also
 * what stopped row selection from surviving a switch.
 *
 * `key` is what gets stored and reported, `base` is which renderer draws it.
 * The built-in five are normalised into this shape internally with `key === base`,
 * so a stored `"cards"` still resolves and `views={["table","cards"]}` still
 * means what it always meant.
 *
 * Every other field overrides the `DataTable` prop of the same name **for this
 * view only**, which is the point: the props that differ between shapes are
 * exactly these.
 */
export interface DataTableViewDef<TData extends RowData = RowData> {
  /** Stable identity — persisted, and reported by `onViewChange`. */
  key: string;
  /** Which of the five renderers draws it. */
  base: DataTableView;
  /** Toolbar tooltip / aria-label. */
  label: string;
  /** Toolbar toggle icon. Falls back to the base layout's icon. */
  icon?: React.ReactNode;
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => React.ReactNode;
  /** Per-view drag seam. See `CardRenderOptions.renderCardWrapper`. */
  renderCardWrapper?: (
    row: Row<TData>,
    wrapperProps: CardWrapperProps,
    children: React.ReactNode
  ) => React.ReactNode;
  /** Per-view section-level drag seam (sections base only). See
   *  `RenderSectionWrapper` for the contract. */
  renderSectionWrapper?: RenderSectionWrapper;
  /** Per-view trailing section header furniture (sections base only). */
  sectionHeaderActions?: (section: SectionWrapperInfo) => React.ReactNode;
  /** Per-view leading section header furniture — the grip (sections base only). */
  sectionHeaderLeading?: (section: SectionWrapperInfo) => React.ReactNode;
  /** Per-view section backdrop palette (sections base only). See `SectionTone`. */
  sectionTone?: SectionTone;
  /** Per-view packing strategy (sections base only). See `SectionsPacking`. */
  sectionsPacking?: SectionsPacking;
  /**
   * Which tile the card-shaped renderers draw, independent of `base`. Until
   * this existed the tile was welded to the layout — `base: "gallery"` was the
   * only way to get the media-only tile, so a *sections* view could never pack
   * photo tiles into its groups. A photo wall grouped by category is
   * `{ base: "sections", variant: "gallery" }`. Defaults to the base's own
   * tile: gallery for `gallery`, the full card for everything else.
   */
  variant?: CardViewVariant;
  cardMinWidth?: number;
  estimatedCardHeight?: number;
  /**
   * Column preset for this view. Re-applied on every switch *into* it — the
   * table's own visibility state is seeded once, so without that a preset
   * would only ever take on the mount that happened to start here.
   */
  columnVisibility?: VisibilityState;
  cellClassName?: string;
  maxCellHeight?: number;
  /**
   * Per-view card slot remapping, merged over each column's own `meta.card`.
   * Lets two views place the same columns differently without either of them
   * needing a bespoke card.
   */
  cardSlots?: CardSlotOverrides;
}

/** What a consumer may pass to `views` — built-in names, declarations, or both. */
export type DataTableViewOption<TData extends RowData = RowData> =
  | DataTableView
  | DataTableViewDef<TData>;

// The card contract lives in RowCard now (the board draws the same card, and
// the gallery a stripped-back one), but it is still part of this module's
// public surface — DataTable and every consumer import it from here.
//
// `CardSlotOverrides` is deliberately NOT re-exported: it originates in
// ColumnLabels, which the barrel already `export *`s, and a second star-export
// of the same name is ambiguous (see the note at the top of index.ts).
export type { CardRenderOptions, CardViewVariant, CardWrapperProps, RenderCardContext };

/** Toolbar select-all shown while a card-based layout is active. Cards have no
 *  header row, so without this the header checkbox — the only select-all in the
 *  table layout — has no card-mode equivalent and a filtered set can't be
 *  bulk-selected. */
export function CardSelectAllControl<TData extends RowData>(props: {
  table: TanstackTable<TData>;
}): JSX.Element | null {
  // Selection is opt-in per table: no visible select column, no select-all.
  const selectColumn = props.table.getColumn("select");
  if (!selectColumn?.getIsVisible()) return null;

  // Match what toggleAllRowsSelected actually acts on (pre-grouping, and so
  // pre-pagination) — the count has to name the rows the click will select.
  const count = props.table.getPreGroupedRowModel().rows.length;
  const allSelected = props.table.getIsAllRowsSelected();

  return (
    <label
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-accent px-2 text-xs hover:bg-accent/90"
      title={allSelected ? "Clear selection" : "Select every row"}
    >
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) => props.table.toggleAllRowsSelected(!!checked)}
        className="h-4 w-4"
      />
      {/* The wording stays put whatever the state — the checkbox already says
          which way it is, and swapping in a shorter "Clear" would resize the
          control and shuffle its neighbours on the click that toggled it. */}
      <span>Select all ({count})</span>
    </label>
  );
}

/** Card size presets, in px of minimum card width. The grid's column count is
 *  purely width-driven, so picking a size *is* picking how many columns fit.
 *  The board reuses them as its lane width. */
export const CARD_SIZE_WIDTHS = {
  compact: 260,
  comfortable: 320,
  large: 400,
} as const;

export type CardSize = keyof typeof CARD_SIZE_WIDTHS;

export const DEFAULT_CARD_SIZE: CardSize = "comfortable";

/** The min-width preset table for a layout. The size *names* are shared so the
 *  toolbar control and the stored preference carry across a view switch, but a
 *  "comfortable" gallery tile is less than half a "comfortable" card. */
export function sizeWidthsForVariant(
  variant: CardViewVariant
): Record<CardSize, number> {
  return variant === "gallery" ? GALLERY_SIZE_WIDTHS : CARD_SIZE_WIDTHS;
}

const CARD_SIZE_LABELS: Record<CardSize, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  large: "Large",
};

/** Toolbar card-density control — feeds `cardMinWidth`, which the grid turns
 *  into a column count and the board turns into a lane width. */
export function CardSizeControl(props: {
  value: CardSize;
  onChange: (size: CardSize) => void;
}): JSX.Element {
  return (
    <Select
      aria-label="Card size"
      title="Card size"
      className="h-8 w-[124px] shrink-0 px-2 py-0 text-xs"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as CardSize)}
    >
      {(Object.keys(CARD_SIZE_WIDTHS) as CardSize[]).map((size) => (
        <option key={size} value={size}>
          {CARD_SIZE_LABELS[size]}
        </option>
      ))}
    </Select>
  );
}

export interface CardViewProps<TData extends RowData> extends CardRenderOptions<TData> {
  table: TanstackTable<TData>;
  scrollRef: React.RefObject<HTMLDivElement>;
  virtualized?: boolean;
  estimatedCardHeight?: number;
  cardMinWidth?: number;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  restoreRowIndex?: ScrollRestoreRef;
  /** Enter/exit + reflow animation on the cards. Forced off while virtualized. */
  animate?: boolean;
}

const GRID_GAP_PX = 12; // Tailwind gap-3, shared by the column-count math below.

function Chunk<TData extends RowData>(props: {
  rows: Row<TData>[];
  /** Row-model index of `rows[0]`, so each card knows its absolute coordinate. */
  startIndex: number;
  cols: number;
  focusedIndex: number | null;
  /** Which card holds the single tab stop while nothing is focused yet. */
  fallbackTabIndex: number;
  animated: boolean;
  onCardFocus: (index: number) => void;
  view: CardViewProps<TData>;
}): JSX.Element {
  const cards = props.rows.map((row, i) => {
    const index = props.startIndex + i;
    return (
      <RowCard
        key={row.id}
        row={row}
        index={index}
        // Roving tabindex: exactly one card sits in the tab order, so Tab moves
        // past the grid instead of through every card in it.
        tabIndex={index === (props.focusedIndex ?? props.fallbackTabIndex) ? 0 : -1}
        animated={props.animated}
        onFocus={() => props.onCardFocus(index)}
        view={props.view}
      />
    );
  });

  return (
    <div
      role="row"
      // The horizontal gap must stay at GRID_GAP_PX in both variants — the
      // column-count math below is what decides the chunk size, and a grid that
      // disagreed with it would wrap a card onto a line of its own.
      className={cn(
        "grid",
        props.view.variant === "gallery" ? "gap-x-3 gap-y-4 pb-4" : "gap-3 pb-3"
      )}
      style={{ gridTemplateColumns: `repeat(${props.cols}, minmax(0, 1fr))` }}
    >
      {props.animated ? <AnimatePresence initial={false}>{cards}</AnimatePresence> : cards}
      {/* Expansion panels come after the cards so CSS grid auto-placement
          can't split the card row; col-span-full puts each below it. */}
      {props.rows
        .filter((row) => row.getIsExpanded())
        .map((row) => (
          <div key={`${row.id}-expanded`} className="col-span-full">
            {props.view.renderSubComponent({ row })}
          </div>
        ))}
    </div>
  );
}

/**
 * Card-grid rendering of a DataTable's rows over the same TanStack table
 * instance as TableView — sorting, selection, expansion, and filtering state
 * all carry over. The card itself is `RowCard`, shared with the board layout:
 * control columns get fixed positions and the rest place themselves via
 * `meta.card` slot hints (default: labeled body fields).
 *
 * Virtualization chunks the sorted rows into grid rows of `cols` cards and
 * virtualizes one chunk per item, reusing the measureElement pattern from
 * TableView against the same external scroll region.
 */
export function CardView<TData extends RowData>(props: CardViewProps<TData>): JSX.Element {
  const rows = props.table.getRowModel().rows;
  const variant = props.variant ?? "cards";
  const cardMinWidth =
    props.cardMinWidth ?? sizeWidthsForVariant(variant)[DEFAULT_CARD_SIZE];

  // Column count derives from measured width, not Tailwind breakpoints — the
  // grid must agree exactly with the chunking math, and runtime
  // `grid-cols-${n}` classes would never be generated anyway. 0 means "not
  // measured yet", a state the scroll restore has to be able to wait for:
  // acting on the placeholder single column would land on the wrong chunk.
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [measuredCols, setMeasuredCols] = React.useState(0);
  const cols = measuredCols || 1;
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = (width: number) =>
      Math.max(1, Math.floor((width + GRID_GAP_PX) / (cardMinWidth + GRID_GAP_PX)));
    setMeasuredCols(compute(el.clientWidth));
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setMeasuredCols(compute(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardMinWidth]);

  const chunks = React.useMemo(() => {
    const out: Row<TData>[][] = [];
    for (let i = 0; i < rows.length; i += cols) {
      out.push(rows.slice(i, i + cols));
    }
    return out;
  }, [rows, cols]);

  const virtualizer = useVirtualizer({
    count: props.virtualized ? chunks.length : 0,
    getScrollElement: () => props.scrollRef.current,
    // A gallery tile is a square plus two lines of caption, so its height
    // tracks the tile width rather than sitting at a card's fixed guess.
    estimateSize: () =>
      props.estimatedCardHeight ??
      (variant === "gallery" ? cardMinWidth + 44 : 220),
    overscan: 4,
    measureElement: (el) => el.getBoundingClientRect().height,
  });
  // A width change reflows every chunk; cached measurements are stale.
  React.useEffect(() => {
    if (props.virtualized) virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols]);

  // Animation stays off while virtualized: cards mount and unmount as the
  // scroll position moves, so enter/exit would fire on scrolling rather than
  // on the row set actually changing.
  const reduceMotion = useReducedMotion();
  const animated = (props.animate ?? true) && !props.virtualized && !reduceMotion;

  // ---- Scroll hand-off to and from the other layouts -----------------------
  const scrollToRowIndex = (index: number) => {
    if (props.virtualized) {
      virtualizer.scrollToIndex(Math.floor(index / cols), { align: "start" });
    } else {
      scrollRenderedRowToTop(containerRef.current, props.scrollRef.current, index);
    }
  };
  const handleRef = props.scrollHandleRef;
  // Reassigned every render so the handle closes over the current virtualizer,
  // column count and row model rather than the mount-time ones.
  React.useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getFirstVisibleRowIndex: () =>
        firstVisibleRowIndex(containerRef.current, props.scrollRef.current),
      scrollToRowIndex,
    };
    return () => {
      handleRef.current = null;
    };
  });
  React.useEffect(() => {
    if (measuredCols === 0) return; // the chunk index isn't knowable yet
    const pending = props.restoreRowIndex?.current;
    if (pending == null) return;
    props.restoreRowIndex!.current = null;
    // One frame of slack: the virtualizer can't place an index until it has
    // measured the scroll element, which only happens after this commit paints.
    const raf = requestAnimationFrame(() => scrollToRowIndex(pending));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuredCols]);

  // ---- Keyboard navigation -------------------------------------------------
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
  // Set when a key moved the focus, cleared once the target node exists — under
  // virtualization the card being moved to is often a commit or two away.
  const wantFocusRef = React.useRef(false);

  const rowCount = rows.length;
  React.useEffect(() => {
    // A filter can shrink the row set out from under the focus ring.
    setFocusedIndex((i) =>
      i == null ? i : rowCount === 0 ? null : Math.min(i, rowCount - 1)
    );
  }, [rowCount]);

  React.useEffect(() => {
    if (!wantFocusRef.current || focusedIndex == null) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[${ROW_INDEX_ATTR}="${focusedIndex}"]`
    );
    if (!el) return; // retry after the commit that renders it
    wantFocusRef.current = false;
    // The scroll is ours to do: the browser's own would walk up and drag every
    // ancestor scroller, including the page.
    el.focus({ preventScroll: true });
    if (!props.virtualized) ensureVisibleWithin(el, props.scrollRef.current);
  });

  const moveFocus = (next: number) => {
    if (rows.length === 0) return;
    const clamped = Math.max(0, Math.min(next, rows.length - 1));
    setFocusedIndex(clamped);
    wantFocusRef.current = true;
    if (props.virtualized) {
      virtualizer.scrollToIndex(Math.floor(clamped / cols), { align: "auto" });
    }
  };

  // Where the tab stop sits before the grid has been focused. Index 0 would be
  // wrong under virtualization: scrolled down the list it isn't rendered, so
  // the grid would have no tab stop at all and Tab would skip straight past it.
  const virtualItems = props.virtualized ? virtualizer.getVirtualItems() : [];
  const fallbackTabIndex = props.virtualized ? (virtualItems[0]?.index ?? 0) * cols : 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only a card root drives navigation. A keystroke inside a card — typing in
    // an inline editor, space on its checkbox — belongs to that control.
    const target = e.target as HTMLElement;
    if (!target.hasAttribute(ROW_INDEX_ATTR)) return;
    const index = Number(target.getAttribute(ROW_INDEX_ATTR));
    if (!Number.isFinite(index)) return;
    const row = rows[index];

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moveFocus(index + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(index - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(index + cols);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(index - cols);
        break;
      case "Home":
        e.preventDefault();
        moveFocus(0);
        break;
      case "End":
        e.preventDefault();
        moveFocus(rows.length - 1);
        break;
      case " ":
        // Space scrolls the page by default, which is exactly the wrong answer
        // to "tick this card".
        if (row?.getCanSelect()) {
          e.preventDefault();
          row.toggleSelected();
        }
        break;
      case "Enter":
        if (!row) break;
        e.preventDefault();
        if (props.expandOnRowClick) row.toggleExpanded();
        props.rowClickFunction?.(row.original);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-colcount={cols}
      aria-rowcount={Math.ceil(rows.length / cols)}
      onKeyDown={onKeyDown}
      {...{ [ROW_SCOPE_ATTR]: "" }}
    >
      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-center">No results.</div>
      ) : props.virtualized ? (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualItems.map((vi) => (
            <div
              key={vi.key}
              // This wrapper exists only to position the chunk; an unlabelled
              // element between grid and row would break the role chain.
              role="presentation"
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <Chunk
                rows={chunks[vi.index]}
                startIndex={vi.index * cols}
                cols={cols}
                focusedIndex={focusedIndex}
                fallbackTabIndex={fallbackTabIndex}
                animated={animated}
                onCardFocus={setFocusedIndex}
                view={props}
              />
            </div>
          ))}
        </div>
      ) : (
        chunks.map((chunk, i) => (
          <Chunk
            key={chunk[0]?.id ?? i}
            rows={chunk}
            startIndex={i * cols}
            cols={cols}
            focusedIndex={focusedIndex}
            fallbackTabIndex={fallbackTabIndex}
            animated={animated}
            onCardFocus={setFocusedIndex}
            view={props}
          />
        ))
      )}
    </div>
  );
}
