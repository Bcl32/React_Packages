import React, { Fragment } from "react";
import type { Column, Row, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

import {
  ROW_INDEX_ATTR,
  ROW_SCOPE_ATTR,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import { ROW_ID_ATTR, applySelectionGesture, preventShiftTextSelection } from "./RowSelectGesture";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableFooter,
  TableRow,
} from "./Table";

export interface TableViewProps<TData extends RowData> {
  table: TanstackTable<TData>;
  columnsCount: number;
  scrollRef: React.RefObject<HTMLDivElement>;
  virtualized?: boolean;
  estimatedRowHeight?: number;
  cellClassName?: string;
  maxCellHeight?: number;
  rowClickFunction: (data: TData) => void;
  /** The consumer passed a `rowClickFunction`: rows get the pointer cursor. */
  rowsClickable?: boolean;
  expandOnRowClick?: boolean;
  /** Row and header spacing; see `TableDensity`. */
  density?: TableDensity;
  /** What an empty table says. Default "No results."; `null` draws no row. */
  emptyMessage?: React.ReactNode;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  /** Filled with this layout's scroll handle so DataTable can read the
   *  position off it just before swapping layouts. */
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  /** A row index left behind by the previous layout; consumed once on mount. */
  restoreRowIndex?: ScrollRestoreRef;
}

/**
 * How tightly the table sets its rows. `comfortable` is the default; `compact`
 * is for dense data (matrices, logs) and drops the text to `text-xs` as well.
 * A consumer's `cellClassName` is applied after either and still wins.
 */
export type TableDensity = "comfortable" | "compact";

const HEAD_DENSITY: Record<TableDensity, string> = {
  comfortable: "h-10 px-4",
  compact: "h-8 px-3 text-xs",
};
const CELL_DENSITY: Record<TableDensity, string> = {
  comfortable: "px-4 py-2.5",
  compact: "px-3 py-1.5 text-xs",
};

type ColumnAlign = "left" | "right" | "center";

/** A column's `meta.align`, for both its header and its cells. */
function alignOf<TData>(column: Column<TData, unknown>): ColumnAlign | undefined {
  return (column.columnDef.meta as { align?: ColumnAlign } | undefined)?.align;
}
const ALIGN_TEXT: Record<ColumnAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};
const ALIGN_FLEX: Record<ColumnAlign, string> = {
  left: "justify-start",
  right: "justify-end",
  center: "justify-center",
};

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/**
 * The classic <table> rendering of a DataTable's rows. Extracted verbatim from
 * DataTable so it can sit beside CardView as one of two layouts over the same
 * TanStack table instance.
 */
export function TableView<TData extends RowData>(
  props: TableViewProps<TData>
): JSX.Element {
  const tableInstance = props.table;
  const totalSize = tableInstance.getTotalSize();

  // Virtualization plumbing. The scroll ref belongs to DataTable's internal
  // scroll region. When `virtualized` is set, we attempt to virtualize against
  // it; if the parent didn't give DataTable a bounded flex context, the scroll
  // region won't actually scroll and the virtualizer harmlessly renders all
  // rows (same as non-virtualized).
  const rows = tableInstance.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: props.virtualized ? rows.length : 0,
    getScrollElement: () => props.scrollRef.current,
    estimateSize: () => props.estimatedRowHeight ?? 56,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Scroll hand-off. Reassigned every render so the handle closes over the
  // current virtualizer and row model rather than the mount-time ones.
  const bodyRef = React.useRef<HTMLTableSectionElement>(null);
  const scrollToRowIndex = (index: number) => {
    if (props.virtualized) virtualizer.scrollToIndex(index, { align: "start" });
    else scrollRenderedRowToTop(bodyRef.current, props.scrollRef.current, index);
  };
  const handleRef = props.scrollHandleRef;
  React.useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getFirstVisibleRowIndex: () =>
        firstVisibleRowIndex(bodyRef.current, props.scrollRef.current),
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

  const virtualItems = props.virtualized ? virtualizer.getVirtualItems() : [];
  const virtualTotalSize = props.virtualized ? virtualizer.getTotalSize() : 0;
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualTotalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  const density = props.density ?? "comfortable";
  // Drawn only when a column has something to put in it; an always-on
  // <tfoot> was an empty grey band under every table.
  const hasFooter = tableInstance.getAllLeafColumns().some((c) => c.columnDef.footer != null);

  return (
    <>
      {/* `table-layout: fixed` is required when virtualizing. Under the default
          auto layout the browser sizes columns from the content of the rows it
          can currently see — and virtualization swaps that row set on every
          scroll, so column widths (and therefore text wrapping) oscillate as
          you scroll. Fixed layout derives widths solely from the declared
          sizes below, which are scroll-invariant. Non-virtualized tables render
          every row, so their auto layout is already stable — left alone. */}
      {/* The frame is on the wrapper (see `Table`). No text size here: the
          primitive's `text-sm` is the body size. A `text-md` used to sit on
          this element; Tailwind has no such class, but tailwind-merge read it
          as a size and dropped `text-sm`, so bodies fell back to 16px. */}
      <Table
        wrapperClassName="rounded-lg border-[3px] bg-card"
        style={props.virtualized ? { tableLayout: "fixed" } : undefined}
      >
        {/* `sticky top-0` does NOT stick, and the classes are kept only so the
            header keeps its opaque ground and stacking order. Measured: the
            nearest scroll container to this <thead> is the wrapper the `Table`
            primitive puts around every table (`overflow-x-auto`, which makes
            the block axis a scroll container too), and that wrapper is as tall
            as its content and never scrolls vertically. The region that does
            scroll is three levels up, in DataTable. Sticky resolves against the
            nearest scrolling ancestor, so it has nothing to stick to.
            This is why the toolbar carries a `SortControl` at all — see the
            note at the top of that file. Making the header genuinely sticky
            means moving the vertical scroll onto this wrapper, which is a
            change to the `Table` primitive every consumer shares. */}
        <TableHeader className="sticky top-0 z-10 bg-card">
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-muted/40 hover:bg-muted/40">
              {headerGroup.headers.map((header) => {
                const align = alignOf(header.column);
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const SortIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
                return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  aria-sort={canSort ? (sorted ? ARIA_SORT[sorted] : "none") : undefined}
                  className={cn(HEAD_DENSITY[density], align && ALIGN_TEXT[align])}
                  style={{
                    width: `${(header.getSize() / totalSize) * 100}%`,
                    minWidth: header.column.columnDef.minSize,
                    maxWidth: header.column.columnDef.maxSize != null && header.column.columnDef.maxSize < Number.MAX_SAFE_INTEGER
                      ? header.column.columnDef.maxSize : undefined,
                  }}
                >
                  {header.isPlaceholder ? null : canSort ? (
                    // A real button, so sorting is reachable from the keyboard.
                    // Every sortable header shows a faint ⇅ so the affordance is
                    // visible before the first click, not only after it.
                    <button
                      type="button"
                      className={cn(
                        "group flex w-full min-w-[36px] cursor-pointer select-none items-center gap-1.5 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        align && ALIGN_FLEX[align],
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon
                        size={14}
                        aria-hidden
                        className={cn("shrink-0", sorted ? "text-foreground" : "opacity-30 group-hover:opacity-70")}
                      />
                    </button>
                  ) : (
                    <div className={cn(align && cn("flex", ALIGN_FLEX[align]))}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  )}
                </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody ref={bodyRef} className="tabular-nums" {...{ [ROW_SCOPE_ATTR]: "" }}>
          {rows.length === 0 ? (
            props.emptyMessage === null ? null : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={props.columnsCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  {props.emptyMessage ?? "No results."}
                </TableCell>
              </TableRow>
            )
          ) : (
            <>
              {props.virtualized && paddingTop > 0 && (
                <tr style={{ height: paddingTop }} aria-hidden>
                  <td colSpan={props.columnsCount} />
                </tr>
              )}
              {(props.virtualized ? virtualItems.map((vi) => rows[vi.index]) : rows).map((row, idx) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    data-index={props.virtualized ? virtualItems[idx].index : undefined}
                    {...{
                      [ROW_INDEX_ATTR]: props.virtualized ? virtualItems[idx].index : idx,
                    }}
                    ref={props.virtualized ? virtualizer.measureElement : undefined}
                    className={props.expandOnRowClick || props.rowsClickable ? "cursor-pointer" : undefined}
                    {...{ [ROW_ID_ATTR]: row.id }}
                    onMouseDown={preventShiftTextSelection}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("a, input, button, label")) return;
                      // Shift / Ctrl / Cmd select rather than open.
                      if (applySelectionGesture(row, e)) return;
                      if (props.expandOnRowClick) {
                        row.toggleExpanded();
                      }
                      props.rowClickFunction(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        // Fixed layout won't widen a column to fit an unbroken
                        // token, so without this a long one spills into its
                        // neighbour instead.
                        className={cn(
                          CELL_DENSITY[density],
                          alignOf(cell.column) && ALIGN_TEXT[alignOf(cell.column)!],
                          props.virtualized && "break-words",
                          props.cellClassName,
                        )}
                        style={{
                          width: `${(cell.column.getSize() / totalSize) * 100}%`,
                          minWidth: cell.column.columnDef.minSize,
                          maxWidth: cell.column.columnDef.maxSize != null && cell.column.columnDef.maxSize < Number.MAX_SAFE_INTEGER
                            ? cell.column.columnDef.maxSize : undefined,
                        }}
                      >
                        {props.maxCellHeight && !(cell.column.columnDef.meta as Record<string, unknown>)?.noMaxHeight ? (
                          <div style={{ maxHeight: props.maxCellHeight, overflowY: "auto" }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length}>
                        {props.renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {props.virtualized && paddingBottom > 0 && (
                <tr style={{ height: paddingBottom }} aria-hidden>
                  <td colSpan={props.columnsCount} />
                </tr>
              )}
            </>
          )}
        </TableBody>
        {hasFooter && (
          <TableFooter>
            {tableInstance.getFooterGroups().map((footerGroup) => (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.map((header) => {
                  const align = alignOf(header.column);
                  return (
                    <TableHead key={header.id} className={cn(HEAD_DENSITY[density], align && ALIGN_TEXT[align])}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.footer,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableFooter>
        )}
      </Table>
    </>
  );
}
