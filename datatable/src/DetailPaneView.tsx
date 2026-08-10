import React from "react";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft } from "lucide-react";

import { cn } from "@bcl32/utils/cn";
import { Button } from "@bcl32/utils/Button";
import { useIsMobile } from "@bcl32/utils/useIsMobile";
import type { ModelData, RowData } from "@bcl32/data-utils";

import { partitionCells, renderCell } from "./CardCells";
import { applicableCardActions, CardQuickActions } from "./CardActions";
import {
  ROW_INDEX_ATTR,
  ROW_SCOPE_ATTR,
  ensureVisibleWithin,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import type { ToolbarAction } from "./ToolbarAction";
import type { CardSlotOverrides } from "./ColumnLabels";

/** Width of the master list, in px. Wide enough for a two-line title beside a
 *  checkbox; anything wider is taken from the pane doing the actual work. */
export const DEFAULT_DETAIL_LIST_WIDTH = 300;

export interface DetailPaneViewProps<TData extends RowData> {
  table: TanstackTable<TData>;
  ModelData: ModelData;
  virtualized?: boolean;
  /** Virtualizer size estimate per list item. Default 68. */
  estimatedListRowHeight?: number;
  /** Master list width in px. Default 300. */
  listWidth?: number;
  rowClickFunction?: (data: TData) => void;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  /** Toolbar actions that opted in with `card`, docked in the pane header for
   *  whichever row is showing. */
  cardActions?: ToolbarAction<TData>[];
  /** Per-view slot remapping, so a declared view's arrangement reaches the list
   *  items and the pane header — both of which read the same partition. */
  cardSlots?: CardSlotOverrides;
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  restoreRowIndex?: ScrollRestoreRef;
}

/** One row in the master list: the title, its badges, and the select box. */
function ListItem<TData extends RowData>(props: {
  row: Row<TData>;
  active: boolean;
  cardSlots?: CardSlotOverrides;
}): JSX.Element {
  const cells = partitionCells(props.row, props.cardSlots);
  return (
    <div className="flex items-start gap-2">
      {cells.select && (
        // The select cell carries a -m-4/p-4 hit-area bleed tuned for table
        // cells; flattened here so the checkbox occupies real flex width.
        <div className="shrink-0 pt-0.5 [&_label]:!m-0 [&_label]:!p-0">
          {renderCell(cells.select)}
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div
          className={cn(
            "line-clamp-2 break-words text-sm leading-tight",
            props.active ? "font-semibold" : "font-medium"
          )}
        >
          {cells.title.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
        </div>
        {cells.badge.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {cells.badge.map((cell) => (
              <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Master/detail layout over the same TanStack table instance as the other
 * views: a compact card list on the left, and the active row's
 * `renderSubComponent` permanently docked on the right.
 *
 * This is the layout for entities whose expansion content is the real page —
 * Spools and Filaments already render a full detail grid there. In the table and
 * card views that content costs a click to open, pushes every row below it down
 * the page, and can only be compared against another row by opening both and
 * scrolling between them. Docked, it is always on screen and moving between rows
 * is an arrow key.
 *
 * The active row is local state rather than TanStack's expansion: expansion is a
 * set (any number open at once) and this pane shows exactly one. Row clicks
 * therefore dock rather than navigate — but a click on a link *inside* an item
 * still navigates, which is how you get from "look at this one" to "open it".
 *
 * Wants a height-bounded parent, since the two panes scroll independently
 * rather than the region around them. Without one they degrade to growing with
 * their content — untidy, not broken.
 */
export function DetailPaneView<TData extends RowData>(
  props: DetailPaneViewProps<TData>
): JSX.Element {
  const rows = props.table.getRowModel().rows;
  const isMobile = useIsMobile();

  // Two refs, two jobs: `listScrollRef` is the scroll element the virtualizer
  // and the scroll hand-off measure against; `listBodyRef` is the row scope
  // ViewScroll matches ROW_INDEX_ATTR nodes within.
  const listScrollRef = React.useRef<HTMLDivElement>(null);
  const listBodyRef = React.useRef<HTMLDivElement>(null);

  const [activeId, setActiveId] = React.useState<string | null>(null);

  // A docked pane that starts empty wastes the layout's whole point, so on a
  // wide screen "nothing picked" resolves to the first row. On a phone it does
  // not: there the list and the pane are the same column, so auto-picking would
  // open a row the user never asked for and hide the list behind it.
  const activeIndex = React.useMemo(() => {
    if (activeId != null) {
      const found = rows.findIndex((row) => row.id === activeId);
      if (found >= 0) return found;
    }
    // Falls through whenever the active row leaves the row model — a filter
    // keystroke, a sort, a delete — rather than leaving the pane pointed at
    // something no longer in the list.
    return isMobile || rows.length === 0 ? -1 : 0;
  }, [rows, activeId, isMobile]);
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;

  const virtualizer = useVirtualizer({
    count: props.virtualized ? rows.length : 0,
    getScrollElement: () => listScrollRef.current,
    estimateSize: () => props.estimatedListRowHeight ?? 68,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // ---- Scroll hand-off to and from the other layouts -----------------------
  const scrollToRowIndex = (index: number) => {
    if (props.virtualized) virtualizer.scrollToIndex(index, { align: "start" });
    else scrollRenderedRowToTop(listBodyRef.current, listScrollRef.current, index);
  };
  const handleRef = props.scrollHandleRef;
  // Reassigned every render so the handle closes over the current virtualizer
  // and row model rather than the mount-time ones.
  React.useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getFirstVisibleRowIndex: () =>
        firstVisibleRowIndex(listBodyRef.current, listScrollRef.current),
      scrollToRowIndex,
    };
    return () => {
      handleRef.current = null;
    };
  });
  React.useEffect(() => {
    const pending = props.restoreRowIndex?.current;
    if (pending == null) return;
    props.restoreRowIndex!.current = null;
    // One frame of slack: the virtualizer can't place an index until it has
    // measured the scroll element, which only happens after this commit paints.
    const raf = requestAnimationFrame(() => scrollToRowIndex(pending));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard navigation -------------------------------------------------
  // Set when a key moved the active row, cleared once the node exists — under
  // virtualization the item being moved to is often a commit or two away.
  const wantFocusRef = React.useRef(false);
  React.useEffect(() => {
    if (!wantFocusRef.current || activeIndex < 0) return;
    const el = listBodyRef.current?.querySelector<HTMLElement>(
      `[${ROW_INDEX_ATTR}="${activeIndex}"]`
    );
    if (!el) return; // retry after the commit that renders it
    wantFocusRef.current = false;
    // The scroll is ours to do: the browser's own would walk up and drag every
    // ancestor scroller, including the page.
    el.focus({ preventScroll: true });
    if (!props.virtualized) ensureVisibleWithin(el, listScrollRef.current);
  });

  const activate = (index: number, viaKeyboard: boolean) => {
    if (index < 0 || index >= rows.length) return;
    setActiveId(rows[index].id);
    if (viaKeyboard) {
      wantFocusRef.current = true;
      if (props.virtualized) virtualizer.scrollToIndex(index, { align: "auto" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only a list-item root drives navigation. A keystroke inside an item —
    // space on its checkbox, typing in an inline editor — belongs to that
    // control.
    const target = e.target as HTMLElement;
    if (!target.hasAttribute(ROW_INDEX_ATTR)) return;
    const index = Number(target.getAttribute(ROW_INDEX_ATTR));
    if (!Number.isFinite(index)) return;
    const row = rows[index];

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        activate(Math.min(index + 1, rows.length - 1), true);
        break;
      case "ArrowUp":
        e.preventDefault();
        activate(Math.max(index - 1, 0), true);
        break;
      case "Home":
        e.preventDefault();
        activate(0, true);
        break;
      case "End":
        e.preventDefault();
        activate(rows.length - 1, true);
        break;
      case " ":
        // Space scrolls the page by default, which is exactly the wrong answer
        // to "tick this row".
        if (row?.getCanSelect()) {
          e.preventDefault();
          row.toggleSelected();
        }
        break;
      case "Enter":
        if (!row) break;
        e.preventDefault();
        // Enter is the "act on it" key: it docks the row *and* runs whatever
        // the page does with a row click (usually navigation), which is the one
        // thing a plain click deliberately no longer does here.
        activate(index, true);
        props.rowClickFunction?.(row.original);
        break;
      default:
        break;
    }
  };

  const renderItem = (row: Row<TData>, index: number) => (
    <div
      key={row.id}
      role="row"
      data-index={props.virtualized ? index : undefined}
      ref={props.virtualized ? virtualizer.measureElement : undefined}
    >
      <div
        role="gridcell"
        // Roving tabindex: exactly one item sits in the tab order, so Tab moves
        // past the list instead of through every row in it.
        tabIndex={index === (activeIndex < 0 ? 0 : activeIndex) ? 0 : -1}
        aria-selected={index === activeIndex}
        {...{ [ROW_INDEX_ATTR]: index }}
        // Links do not get their own click here: a title cell is usually a
        // <Link> to the row's page and it covers most of the item, so honouring
        // it would mean nearly every click in the master list navigated away
        // from the layout the user just switched into. Docking wins in the
        // list; the pane header renders the same title cell, so the link is
        // still one click away once you are there.
        //
        // Capture phase, and stopPropagation — not just preventDefault. A
        // react-router <Link> cancels the event itself and then navigates
        // programmatically from its own onClick, so by the time a bubbled
        // handler runs the navigation has already been requested. Stopping the
        // event on the way *down* is the only place it can still be caught.
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (!target.closest("a")) return;
          e.preventDefault();
          e.stopPropagation();
          activate(index, false);
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("input, button, label")) return;
          activate(index, false);
        }}
        className={cn(
          "cursor-pointer rounded-lg border p-2.5 transition-colors",
          index === activeIndex
            ? "border-primary bg-accent"
            : "border-transparent hover:bg-accent/40",
          row.getIsSelected() && "ring-2 ring-inset ring-primary",
          // Same reasoning as the card grid: an outline (not a ring) so it
          // paints above the item's children, drawn inside so the list's own
          // overflow can't clip it, and dashed so "cursor is here" stays
          // distinguishable from "this row is ticked" in themes where --ring
          // and --primary are the same colour.
          "outline-none focus-visible:outline-dashed focus-visible:outline-2",
          "focus-visible:outline-primary focus-visible:[outline-offset:-3px]"
        )}
      >
        <ListItem row={row} active={index === activeIndex} cardSlots={props.cardSlots} />
      </div>
    </div>
  );

  const virtualItems = props.virtualized ? virtualizer.getVirtualItems() : [];

  const listPane = (
    <div
      ref={listScrollRef}
      className={cn(
        "min-h-0 overflow-y-auto pr-1",
        isMobile ? "w-full" : "shrink-0 border-r"
      )}
      style={isMobile ? undefined : { width: props.listWidth ?? DEFAULT_DETAIL_LIST_WIDTH }}
    >
      <div
        ref={listBodyRef}
        role="grid"
        aria-colcount={1}
        aria-rowcount={rows.length}
        onKeyDown={onKeyDown}
        {...{ [ROW_SCOPE_ATTR]: "" }}
        className="space-y-1 pb-2 pr-1"
      >
        {rows.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-center text-sm text-muted-foreground">
            No results.
          </div>
        ) : props.virtualized ? (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualItems.map((vi) => (
              <div
                key={vi.key}
                // This wrapper exists only to position the item; an unlabelled
                // element between grid and row would break the role chain.
                role="presentation"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {renderItem(rows[vi.index], vi.index)}
              </div>
            ))}
          </div>
        ) : (
          rows.map((row, index) => renderItem(row, index))
        )}
      </div>
    </div>
  );

  const activeCells = activeRow ? partitionCells(activeRow, props.cardSlots) : null;
  const detailPane = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      {activeRow && activeCells ? (
        <>
          {/* An identity strip, not a heading: the panels that get docked here
              (Spool, Filament) already open with their own title, and a second
              full-weight one directly above it just reads as a repeat. What
              this row is actually for is staying put while the panel scrolls,
              and giving the row's actions a home — the list items are too
              narrow to carry them. */}
          <header className="flex shrink-0 items-center gap-2 border-b px-3 pb-2">
            <div className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
              {activeCells.title.map((cell) => (
                <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
              ))}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              <CardQuickActions
                row={activeRow}
                actions={applicableCardActions(activeRow, props.cardActions)}
              />
              {activeCells.edit && renderCell(activeCells.edit)}
              {activeCells.actions && renderCell(activeCells.actions)}
            </div>
          </header>
          {/* Keyed on the row so the panel remounts rather than carrying the
              previous row's internal state (open accordions, scroll position,
              a half-typed inline edit) across to the next one. */}
          <div key={activeRow.id} className="min-h-0 flex-1 overflow-y-auto p-3">
            {props.renderSubComponent({ row: activeRow })}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {rows.length === 0 ? "No results." : "Pick a row to see its details."}
        </div>
      )}
    </section>
  );

  if (isMobile) {
    // One column, so the two panes take turns. Without the back button the list
    // would be unreachable once a row was picked.
    return activeRow ? (
      <div className="flex h-full min-h-0 flex-col">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 self-start"
          onClick={() => setActiveId(null)}
        >
          <ChevronLeft size={16} />
          Back to list
        </Button>
        {detailPane}
      </div>
    ) : (
      <div className="flex h-full min-h-0 flex-col">{listPane}</div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-3">
      {listPane}
      {detailPane}
    </div>
  );
}
