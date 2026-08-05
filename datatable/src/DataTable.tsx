import React from "react";
import type { ColumnDef, Row, SortingState, VisibilityState } from "@tanstack/react-table";

import {
  useReactTable,
  getExpandedRowModel,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

import { TableView } from "./TableView";
import { CardView, CARD_SIZE_WIDTHS, DEFAULT_CARD_SIZE } from "./CardView";
import type { CardSize, DataTableView, RenderCardContext } from "./CardView";
import { DataTableToolbar } from "./DataTableToolbar";
import type { DataTableFilter } from "./DataTableToolbar";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import type { ToolbarAction } from "./ToolbarAction";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DataTablePagination } from "./TablePagination";

import { useIsMobile } from "@bcl32/utils/useIsMobile";
import type { ModelData, RowData } from "@bcl32/data-utils";

export type { ToolbarAction, DataTableFilter };

interface DataTableProps<TData extends RowData> {
  title: string;
  columns: ColumnDef<TData, unknown>[];
  tableData: TData[];
  ModelData: ModelData;
  columnVisibility?: VisibilityState;
  defaultSort?: string;
  create_enabled?: boolean;
  add_api_url?: string;
  query_invalidation?: string[];
  filter?: DataTableFilter;
  toolbarStyle?: "standard" | "compact";
  rowClickFunction?: (data: TData) => void;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
  expandOnRowClick?: boolean;
  cellClassName?: string;
  maxCellHeight?: number;
  pageSize?: number;
  virtualized?: boolean;
  estimatedRowHeight?: number;
  onBulkEditSuccess?: (selectedIds: string[], enabledData: Record<string, unknown>) => void;
  toolbarActions?: (selectedIds: string[]) => ToolbarAction<TData>[];
  bulk_delete_enabled?: boolean;
  /** Controlled layout mode. Omit to let the toolbar toggle manage it. */
  view?: DataTableView;
  /** Initial layout mode when uncontrolled. Defaults to "table", or "cards"
   *  under the mobile breakpoint. */
  defaultView?: DataTableView;
  onViewChange?: (view: DataTableView) => void;
  /** Opt-in localStorage persistence of the uncontrolled view choice. */
  viewStorageKey?: string;
  /** Card view: replace the default card entirely. Receives the row's
   *  ready-rendered quick actions so a bespoke card can still place them. */
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => React.ReactNode;
  /** Card view: virtualizer size estimate per card row. Default 220. */
  estimatedCardHeight?: number;
  /** Card view: controlled card size preset. Omit to let the toolbar control
   *  manage it. */
  cardSize?: CardSize;
  /** Card view: initial card size preset when uncontrolled. Default "comfortable". */
  defaultCardSize?: CardSize;
  onCardSizeChange?: (size: CardSize) => void;
  /** Card view: explicit minimum card width driving the responsive column
   *  count. Overrides the size preset and hides the toolbar size control. */
  cardMinWidth?: number;
  /** Motion: cross-fade on the view toggle, and card enter/exit as the row set
   *  changes. Defaults on; always off under `prefers-reduced-motion`, and card
   *  enter/exit is additionally off while `virtualized`. */
  animate?: boolean;
}

export function DataTable<TData extends RowData>(
  props: DataTableProps<TData>
): JSX.Element {
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    props.columnVisibility || {}
  );

  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const animateViews = (props.animate ?? true) && !reduceMotion;

  // `null` means "nothing chosen, stored, or configured" — only then does the
  // screen-width default get to decide.
  const [uncontrolledView, setUncontrolledView] = React.useState<DataTableView | null>(() => {
    if (props.viewStorageKey && typeof window !== "undefined") {
      const stored = window.localStorage.getItem(props.viewStorageKey);
      if (stored === "table" || stored === "cards") return stored;
    }
    return props.defaultView ?? null;
  });
  // Cards are the better narrow-screen layout: the table is the thing that
  // scrolls horizontally. useIsMobile reads the width synchronously, so this
  // resolves on the first render rather than flashing a table and reflowing.
  const view = props.view ?? uncontrolledView ?? (isMobile ? "cards" : "table");

  // Scroll hand-off across the toggle. Only one layout is mounted at a time, so
  // both write to the same handle; the position is read off the outgoing layout
  // while it is still there and consumed by the incoming one on mount.
  const viewScrollRef = React.useRef<ViewScrollHandle | null>(null);
  const restoreRowIndexRef: ScrollRestoreRef = React.useRef<number | null>(null);

  const setView = (v: DataTableView) => {
    if (v !== view) {
      restoreRowIndexRef.current = viewScrollRef.current?.getFirstVisibleRowIndex() ?? null;
    }
    props.onViewChange?.(v);
    if (props.view === undefined) {
      setUncontrolledView(v);
      if (props.viewStorageKey) window.localStorage.setItem(props.viewStorageKey, v);
    }
  };

  const [uncontrolledCardSize, setUncontrolledCardSize] = React.useState<CardSize>(
    props.defaultCardSize ?? DEFAULT_CARD_SIZE
  );
  const cardSize = props.cardSize ?? uncontrolledCardSize;
  const setCardSize = (size: CardSize) => {
    props.onCardSizeChange?.(size);
    if (props.cardSize === undefined) setUncontrolledCardSize(size);
  };
  const cardMinWidth = props.cardMinWidth ?? CARD_SIZE_WIDTHS[cardSize];

  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: props.defaultSort || "time_created",
      desc: true,
    },
  ]);

  const tableInstance = useReactTable({
    columns: props.columns,
    data: props.tableData,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: props.pageSize || 9999,
      },
    },
  });

  const selectedIds = Object.keys(rowSelection);

  // Resolved once and split two ways: the toolbar renders every action as a
  // bulk button, and the ones that set `card` additionally get a per-card
  // affordance in the card footer.
  const toolbarActions = props.toolbarActions?.(selectedIds) ?? [];
  const cardActions = toolbarActions.filter((action) => action.card);

  const handleRowClick = props.rowClickFunction || ((_data: TData) => {
    // no-op default
  });

  // Shared scroll region for both layouts; each view runs its own
  // virtualizer against it.
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const renderSubComponent = props.renderSubComponent || (({ row }: { row: Row<TData> }) => (
    <div className="h-96 overflow-scroll">
      <pre style={{ fontSize: "20px", whiteSpace: "pre-wrap" }}>
        <code>{JSON.stringify(row.original, null, 2)}</code>
      </pre>
    </div>
  ));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <DataTableToolbar
        title={props.title}
        table={tableInstance}
        ModelData={props.ModelData}
        filter={props.filter}
        toolbarStyle={props.toolbarStyle}
        selectedIds={selectedIds}
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        actions={toolbarActions}
        create_enabled={props.create_enabled}
        add_api_url={props.add_api_url}
        query_invalidation={props.query_invalidation}
        bulk_delete_enabled={props.bulk_delete_enabled}
        onBulkEditSuccess={props.onBulkEditSuccess}
        view={view}
        onViewChange={setView}
        cardSize={cardSize}
        onCardSizeChange={setCardSize}
        showCardSizeControl={props.cardMinWidth === undefined}
      />

      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
        {/* mode="wait" so the two layouts never overlap in the scroll region —
            a cross-dissolve of a table over a card grid is just noise, and
            overlapping them would double the scroll height mid-transition. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={animateViews ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={animateViews ? { opacity: 0 } : undefined}
            transition={{ duration: animateViews ? 0.12 : 0 }}
          >
            {view === "cards" ? (
              <CardView
                table={tableInstance}
                ModelData={props.ModelData}
                scrollRef={scrollRef}
                virtualized={props.virtualized}
                estimatedCardHeight={props.estimatedCardHeight}
                cardMinWidth={cardMinWidth}
                maxCellHeight={props.maxCellHeight}
                rowClickFunction={props.rowClickFunction}
                expandOnRowClick={props.expandOnRowClick}
                renderSubComponent={renderSubComponent}
                renderCard={props.renderCard}
                cardActions={cardActions}
                scrollHandleRef={viewScrollRef}
                restoreRowIndex={restoreRowIndexRef}
                animate={props.animate}
              />
            ) : (
              <TableView
                table={tableInstance}
                columnsCount={props.columns.length}
                scrollRef={scrollRef}
                virtualized={props.virtualized}
                estimatedRowHeight={props.estimatedRowHeight}
                cellClassName={props.cellClassName}
                maxCellHeight={props.maxCellHeight}
                rowClickFunction={handleRowClick}
                expandOnRowClick={props.expandOnRowClick}
                renderSubComponent={renderSubComponent}
                scrollHandleRef={viewScrollRef}
                restoreRowIndex={restoreRowIndexRef}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {tableInstance.getPageCount() > 1 && <DataTablePagination table={tableInstance} />}
    </div>
  );
}
