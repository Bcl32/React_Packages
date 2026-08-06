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
import {
  CardView,
  DEFAULT_CARD_SIZE,
  isDataTableView,
  sizeWidthsForVariant,
} from "./CardView";
import type { CardSize, DataTableView, RenderCardContext } from "./CardView";
import { BoardView } from "./BoardView";
import type { BoardConfig, BoardLane } from "./BoardView";
import { DetailPaneView } from "./DetailPaneView";
import { getCardMeta } from "./ColumnLabels";
import { DataTableToolbar } from "./DataTableToolbar";
import type { DataTableFilter } from "./DataTableToolbar";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import type { ToolbarAction } from "./ToolbarAction";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DataTablePagination } from "./TablePagination";

import { cn } from "@bcl32/utils/cn";
import { useIsMobile } from "@bcl32/utils/useIsMobile";
import type { ModelData, RowData } from "@bcl32/data-utils";

export type { ToolbarAction, DataTableFilter, BoardConfig, BoardLane };

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
  /** Which layouts the toggle offers. Omit to derive them: table and cards
   *  always, gallery once a visible column claims the `media` card slot, detail
   *  once the consumer supplies a `renderSubComponent`, and board once it
   *  supplies `board` lanes. */
  views?: DataTableView[];
  /** Detail view: master-list width in px. Default 300. */
  detailListWidth?: number;
  /** Detail view: virtualizer size estimate per list item. Default 68. */
  estimatedDetailRowHeight?: number;
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
  /** Board layout: the lanes and the row→lane mapping. Supplying this is what
   *  puts the Board button in the toolbar — a table with nothing groupable
   *  would otherwise get a toggle that leads nowhere. */
  board?: BoardConfig<TData>;
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
      if (isDataTableView(stored)) return stored;
    }
    return props.defaultView ?? null;
  });

  // Scroll hand-off across the toggle. Only one layout is mounted at a time, so
  // both write to the same handle; the position is read off the outgoing layout
  // while it is still there and consumed by the incoming one on mount.
  const viewScrollRef = React.useRef<ViewScrollHandle | null>(null);
  const restoreRowIndexRef: ScrollRestoreRef = React.useRef<number | null>(null);

  const [uncontrolledCardSize, setUncontrolledCardSize] = React.useState<CardSize>(
    props.defaultCardSize ?? DEFAULT_CARD_SIZE
  );
  const cardSize = props.cardSize ?? uncontrolledCardSize;
  const setCardSize = (size: CardSize) => {
    props.onCardSizeChange?.(size);
    if (props.cardSize === undefined) setUncontrolledCardSize(size);
  };

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

  // Which layouts this table can offer. Derived rather than opted into per
  // page: each of the three extra layouts needs something the table has already
  // declared — a gallery needs something to show a picture of, a docked detail
  // pane needs something to dock, a board needs lanes. Media is read off the
  // *visible* columns, so hiding the thumbnail column withdraws the gallery
  // rather than leaving a toggle that lands on a grid of empty squares.
  const hasMediaColumn = tableInstance
    .getVisibleLeafColumns()
    .some((column) => getCardMeta(column)?.slot === "media");
  const availableViews: DataTableView[] = props.views?.length
    ? props.views
    : [
        "table",
        "cards",
        ...(hasMediaColumn ? (["gallery"] as const) : []),
        ...(props.renderSubComponent ? (["detail"] as const) : []),
        ...(props.board ? (["board"] as const) : []),
      ];

  // Cards are the better narrow-screen layout: the table is the thing that
  // scrolls horizontally. useIsMobile reads the width synchronously, so this
  // resolves on the first render rather than flashing a table and reflowing.
  const requestedView = props.view ?? uncontrolledView ?? (isMobile ? "cards" : "table");
  // A stored preference outlives the conditions it was chosen under — the page
  // stops supplying lanes when its group-by attribute goes away, the thumbnail
  // column gets hidden, or the same entity key is reused by a page with no
  // expansion panel. Falling back beats rendering a layout with nothing in it.
  const view = availableViews.includes(requestedView) ? requestedView : "table";

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

  const cardVariant = view === "gallery" ? "gallery" : "cards";
  const cardMinWidth = props.cardMinWidth ?? sizeWidthsForVariant(cardVariant)[cardSize];

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
        availableViews={availableViews}
      />

      {/* The detail view is the one layout that does not scroll as a block: it
          owns two independently scrolling panes, so the region around them has
          to be a fixed-height box rather than a scroller. */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 min-h-0",
          view === "detail" ? "overflow-hidden" : "overflow-auto"
        )}
      >
        {/* mode="wait" so the two layouts never overlap in the scroll region —
            a cross-dissolve of a table over a card grid is just noise, and
            overlapping them would double the scroll height mid-transition. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className={view === "detail" ? "h-full" : undefined}
            initial={animateViews ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={animateViews ? { opacity: 0 } : undefined}
            transition={{ duration: animateViews ? 0.12 : 0 }}
          >
            {view === "detail" ? (
              <DetailPaneView
                table={tableInstance}
                ModelData={props.ModelData}
                virtualized={props.virtualized}
                estimatedListRowHeight={props.estimatedDetailRowHeight}
                listWidth={props.detailListWidth}
                rowClickFunction={props.rowClickFunction}
                renderSubComponent={renderSubComponent}
                cardActions={cardActions}
                scrollHandleRef={viewScrollRef}
                restoreRowIndex={restoreRowIndexRef}
              />
            ) : view === "board" && props.board ? (
              <BoardView
                table={tableInstance}
                ModelData={props.ModelData}
                scrollRef={scrollRef}
                board={props.board}
                laneWidth={cardMinWidth}
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
            ) : view === "cards" || view === "gallery" ? (
              <CardView
                table={tableInstance}
                ModelData={props.ModelData}
                scrollRef={scrollRef}
                variant={cardVariant}
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
