import React from "react";
import type { Cell, Row, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@bcl32/utils/cn";
import { Card } from "@bcl32/utils/Card";
import { Button } from "@bcl32/utils/Button";
import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";
import type { ModelData, RowData } from "@bcl32/data-utils";

import { columnCardLabel, getCardMeta } from "./ColumnLabels";
import {
  ROW_INDEX_ATTR,
  ROW_SCOPE_ATTR,
  ensureVisibleWithin,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import type { ToolbarAction } from "./ToolbarAction";

export type DataTableView = "table" | "cards";


/** Toolbar select-all shown while the card view is active. Cards have no
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
 *  purely width-driven, so picking a size *is* picking how many columns fit. */
export const CARD_SIZE_WIDTHS = {
  compact: 260,
  comfortable: 320,
  large: 400,
} as const;

export type CardSize = keyof typeof CARD_SIZE_WIDTHS;

export const DEFAULT_CARD_SIZE: CardSize = "comfortable";

const CARD_SIZE_LABELS: Record<CardSize, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  large: "Large",
};

/** Toolbar card-density control — feeds `cardMinWidth`, which the grid turns
 *  into a column count. */
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

/**
 * What a bespoke card gets besides the row. Everything here is a control the
 * default card would otherwise have placed for it: without them a `renderCard`
 * consumer has to re-implement selection and the row-actions menu from scratch,
 * which is how an escape hatch turns into a fork.
 */
export interface RenderCardContext {
  /** The row's quick actions, already rendered. Empty when no toolbar action
   *  opted in with `card`. */
  quickActions: React.ReactNode;
  /** The select checkbox cell, or null when the table has no select column. */
  select: React.ReactNode;
  /** The row-actions (⋯) menu cell, or null when the table has none. */
  actions: React.ReactNode;
}

export interface CardViewProps<TData extends RowData> {
  table: TanstackTable<TData>;
  ModelData: ModelData;
  scrollRef: React.RefObject<HTMLDivElement>;
  virtualized?: boolean;
  estimatedCardHeight?: number;
  cardMinWidth?: number;
  maxCellHeight?: number;
  rowClickFunction?: (data: TData) => void;
  expandOnRowClick?: boolean;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  /**
   * Escape hatch: replaces the default card entirely. CardView still supplies
   * the grid slot, click handling, keyboard navigation, and the expansion panel.
   *
   * A bespoke card has replaced the footer the quick actions would have gone
   * in, so they are handed over ready-rendered in `ctx.quickActions` — place
   * them wherever the card's design wants them, or drop them.
   */
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => React.ReactNode;
  /** Toolbar actions that opted in with `card`, rendered per card in the
   *  default card's footer. */
  cardActions?: ToolbarAction<TData>[];
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  restoreRowIndex?: ScrollRestoreRef;
  /** Enter/exit + reflow animation on the cards. Forced off while virtualized. */
  animate?: boolean;
}

interface PartitionedCells<TData extends RowData> {
  select?: Cell<TData, unknown>;
  actions?: Cell<TData, unknown>;
  edit?: Cell<TData, unknown>;
  expander?: Cell<TData, unknown>;
  media: Cell<TData, unknown>[];
  title: Cell<TData, unknown>[];
  badge: Cell<TData, unknown>[];
  body: Cell<TData, unknown>[];
  footer: Cell<TData, unknown>[];
}

function partitionCells<TData extends RowData>(row: Row<TData>): PartitionedCells<TData> {
  const parts: PartitionedCells<TData> = {
    media: [],
    title: [],
    badge: [],
    body: [],
    footer: [],
  };
  for (const cell of row.getVisibleCells()) {
    const id = cell.column.id;
    if (id === "select") parts.select = cell;
    else if (id === "actions") parts.actions = cell;
    else if (id === "EditEntry") parts.edit = cell;
    else if (id === "expander") parts.expander = cell;
    else {
      const slot = getCardMeta(cell.column)?.slot ?? "body";
      parts[slot].push(cell);
    }
  }
  // Unannotated tables still need a readable card: promote the first field to
  // the title position when nothing claims it.
  if (parts.title.length === 0 && parts.body.length > 0) {
    parts.title.push(parts.body.shift() as Cell<TData, unknown>);
  }
  return parts;
}

function renderCell<TData extends RowData>(cell: Cell<TData, unknown>): React.ReactNode {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

/** The toolbar actions that opted into a per-card affordance, filtered to the
 *  ones that apply to this row. */
function applicableCardActions<TData extends RowData>(
  row: Row<TData>,
  actions: ToolbarAction<TData>[] | undefined
): ToolbarAction<TData>[] {
  if (!actions?.length) return [];
  return actions.filter((action) => action.cardVisible?.(row.original) !== false);
}

function CardQuickActions<TData extends RowData>(props: {
  row: Row<TData>;
  actions: ToolbarAction<TData>[];
}): JSX.Element {
  return (
    <>
      {props.actions.map((action) => {
        const iconOnly = action.card === "icon" && Boolean(action.icon);
        const label = action.cardLabel ?? action.label;
        return (
          <Button
            key={action.key}
            size={iconOnly ? "icon" : "sm"}
            variant={action.variant ?? "outline"}
            disabled={action.cardDisabled?.(props.row.original) ?? false}
            title={label}
            aria-label={iconOnly ? label : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (action.onCardClick) action.onCardClick(props.row.original);
              // Same handler the toolbar uses, scoped to the one row the card
              // stands for — so a card action needs no separate declaration.
              else action.onClick([props.row.id]);
            }}
          >
            {action.icon}
            {!iconOnly && label}
          </Button>
        );
      })}
    </>
  );
}

/** The stock card: control columns in fixed positions, everything else placed
 *  by its `meta.card` slot hint. */
function DefaultCard<TData extends RowData>(props: {
  row: Row<TData>;
  view: CardViewProps<TData>;
  clickable: boolean;
}): JSX.Element {
  const { row, view } = props;
  const cells = partitionCells(row);
  const quickActions = applicableCardActions(row, view.cardActions);

  return (
    <Card
      data-state={row.getIsSelected() ? "selected" : undefined}
      className={cn(
        "relative flex h-full flex-col",
        // ring-inset, not an outside ring: the grid sits flush against the
        // scroll region's edges, so an outside ring is clipped away on the
        // first row (and either side column) and the selection reads as a
        // card with its top cut off.
        "data-[state=selected]:bg-muted data-[state=selected]:ring-2 data-[state=selected]:ring-inset data-[state=selected]:ring-primary",
        props.clickable && "cursor-pointer hover:bg-accent/30 transition-colors"
      )}
    >
      {cells.media.length > 0 && (
        // Media renderers are sized for table cells (fixed column width, and
        // ThumbnailCell-style negative-margin bleed) — neutralize the bleed and
        // pin images to a uniform square so media can't swallow the card.
        // empty:hidden so a row with no thumbnail doesn't reserve the padding
        // for one.
        <div className="flex justify-center gap-2 px-3 pt-3 empty:hidden [&>*]:!m-0 [&_img]:h-32 [&_img]:w-32 [&_img]:rounded [&_img]:object-cover">
          {cells.media.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
        </div>
      )}

      <div className="flex flex-col space-y-1 p-3 pb-1">
        <div className="flex items-start gap-2">
          {/* The select cell carries a -m-4/p-4 hit-area bleed tuned for table
              cells; flattened here so the checkbox occupies real flex width. */}
          {cells.select && (
            <div className="shrink-0 [&_label]:!m-0 [&_label]:!p-0">
              {renderCell(cells.select)}
            </div>
          )}
          <div className="min-w-0 flex-1 font-medium">
            {cells.title.map((cell) => (
              <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
            ))}
          </div>
          {cells.actions && (
            <div className="-mr-1 -mt-1 shrink-0">{renderCell(cells.actions)}</div>
          )}
        </div>
        {cells.badge.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {cells.badge.map((cell) => (
              <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
            ))}
          </div>
        )}
      </div>

      {cells.body.length > 0 && (
        <div className="flex-1 space-y-1.5 p-3 pt-1 text-sm">
          {cells.body.map((cell) => {
            const meta = getCardMeta(cell.column);
            const noMaxHeight = (cell.column.columnDef.meta as Record<string, unknown> | undefined)
              ?.noMaxHeight;
            const value =
              view.maxCellHeight && !noMaxHeight ? (
                <div style={{ maxHeight: view.maxCellHeight, overflowY: "auto" }}>
                  {renderCell(cell)}
                </div>
              ) : (
                renderCell(cell)
              );
            return (
              <div key={cell.id} className="flex items-baseline gap-2">
                {!meta?.hideLabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {columnCardLabel(cell.column, view.ModelData)}
                  </span>
                )}
                <div className="min-w-0 flex-1">{value}</div>
              </div>
            );
          })}
        </div>
      )}

      {(cells.footer.length > 0 ||
        quickActions.length > 0 ||
        cells.edit ||
        cells.expander) && (
        <div className="flex flex-wrap items-center gap-2 p-3 pt-0">
          {cells.footer.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
          <CardQuickActions row={row} actions={quickActions} />
          {(cells.edit || cells.expander) && (
            <div className="ml-auto flex items-center gap-1">
              {cells.edit && renderCell(cells.edit)}
              {cells.expander && renderCell(cells.expander)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function buildRenderCardContext<TData extends RowData>(
  row: Row<TData>,
  view: CardViewProps<TData>
): RenderCardContext {
  const cells = partitionCells(row);
  return {
    quickActions: (
      <CardQuickActions row={row} actions={applicableCardActions(row, view.cardActions)} />
    ),
    // Flattened the same way the default card flattens them: both renderers
    // carry a hit-area bleed sized for a table cell.
    select: cells.select ? (
      <span className="[&_label]:!m-0 [&_label]:!p-0">{renderCell(cells.select)}</span>
    ) : null,
    actions: cells.actions ? renderCell(cells.actions) : null,
  };
}

/** Enter/exit + reflow motion. Deliberately short: this fires on every filter
 *  keystroke, so anything slower reads as lag rather than polish. */
const CARD_MOTION = {
  layout: true,
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.94 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

function RowCard<TData extends RowData>(props: {
  row: Row<TData>;
  /** Index into the sorted row model — the coordinate arrow keys navigate over
   *  and the scroll hand-off restores to. */
  index: number;
  tabIndex: number;
  animated: boolean;
  onFocus: () => void;
  view: CardViewProps<TData>;
}): JSX.Element {
  const { row, view } = props;
  const clickable = Boolean(view.rowClickFunction || view.expandOnRowClick);
  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, input, button, label")) return;
    if (view.expandOnRowClick) row.toggleExpanded();
    view.rowClickFunction?.(row.original);
  };

  const inner = view.renderCard ? (
    view.renderCard(row, buildRenderCardContext(row, view))
  ) : (
    <DefaultCard row={row} view={view} clickable={clickable} />
  );

  const common = {
    role: "gridcell",
    tabIndex: props.tabIndex,
    onFocus: props.onFocus,
    onClick,
    "data-state": row.getIsSelected() ? "selected" : undefined,
    [ROW_INDEX_ATTR]: props.index,
    className: cn(
      "h-full rounded-lg",
      // The keyboard cursor is an `outline` drawn *inside* the card, and it has
      // to be all three of those things:
      //   - outline, not ring: a ring is a box-shadow, which paints under the
      //     element's children — the opaque <Card> would cover it. Outlines
      //     paint above descendants. It is also a separate property from the
      //     selection ring, so a focused *and* selected card shows both.
      //   - inside (negative offset), not outside: the grid sits flush against
      //     the scroll region, so anything drawn outside the card is clipped
      //     away on the first row and either edge column — the same trap the
      //     selection ring documents just below.
      //   - dashed: --ring and --primary are the same colour in these themes,
      //     so shape, not hue, is what separates "cursor is here" from
      //     "this row is selected".
      "outline-none focus-visible:outline-dashed focus-visible:outline-2",
      "focus-visible:outline-primary focus-visible:[outline-offset:-3px]",
      clickable && "cursor-pointer"
    ),
  };

  if (props.animated) {
    return (
      <motion.div {...common} {...CARD_MOTION}>
        {inner}
      </motion.div>
    );
  }
  return <div {...common}>{inner}</div>;
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
      className="grid gap-3 pb-3"
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
 * all carry over. Cards derive their content from the visible column cells:
 * control columns get fixed positions and the rest place themselves via
 * `meta.card` slot hints (default: labeled body fields).
 *
 * Virtualization chunks the sorted rows into grid rows of `cols` cards and
 * virtualizes one chunk per item, reusing the measureElement pattern from
 * TableView against the same external scroll region.
 */
export function CardView<TData extends RowData>(props: CardViewProps<TData>): JSX.Element {
  const rows = props.table.getRowModel().rows;
  const cardMinWidth = props.cardMinWidth ?? CARD_SIZE_WIDTHS[DEFAULT_CARD_SIZE];

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
    estimateSize: () => props.estimatedCardHeight ?? 220,
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

  // ---- Scroll hand-off to and from the table layout ------------------------
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
