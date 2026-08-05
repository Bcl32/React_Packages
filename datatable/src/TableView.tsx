import React, { Fragment } from "react";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

import {
  ROW_INDEX_ATTR,
  ROW_SCOPE_ATTR,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
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
  expandOnRowClick?: boolean;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  /** Filled with this layout's scroll handle so DataTable can read the
   *  position off it just before swapping layouts. */
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  /** A row index left behind by the previous layout; consumed once on mount. */
  restoreRowIndex?: ScrollRestoreRef;
}

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

  return (
    <>
      {/* `table-layout: fixed` is required when virtualizing. Under the default
          auto layout the browser sizes columns from the content of the rows it
          can currently see — and virtualization swaps that row set on every
          scroll, so column widths (and therefore text wrapping) oscillate as
          you scroll. Fixed layout derives widths solely from the declared
          sizes below, which are scroll-invariant. Non-virtualized tables render
          every row, so their auto layout is already stable — left alone. */}
      <Table
        className="text-md border-4 rounded-lg"
        style={props.virtualized ? { tableLayout: "fixed" } : undefined}
      >
        <TableHeader className="sticky top-0 z-10 bg-card">
          {tableInstance.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{
                    width: `${(header.getSize() / totalSize) * 100}%`,
                    minWidth: header.column.columnDef.minSize,
                    maxWidth: header.column.columnDef.maxSize != null && header.column.columnDef.maxSize < Number.MAX_SAFE_INTEGER
                      ? header.column.columnDef.maxSize : undefined,
                  }}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={
                        header.column.getCanSort()
                          ? "cursor-pointer select-none flex min-w-[36px]"
                          : ""
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <span className="pl-2">↑</span>,
                        desc: <span className="pl-2">↓</span>,
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody ref={bodyRef} {...{ [ROW_SCOPE_ATTR]: "" }}>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={props.columnsCount}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
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
                    className={props.expandOnRowClick ? "cursor-pointer" : undefined}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("a, input, button, label")) return;
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
                        className={cn(props.virtualized && "break-words", props.cellClassName)}
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
        <TableFooter>
          {tableInstance.getFooterGroups().map((footerGroup) => (
            <TableRow key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.footer,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableFooter>
      </Table>
    </>
  );
}
