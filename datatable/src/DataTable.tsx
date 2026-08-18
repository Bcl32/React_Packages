import React from "react";
import type {
  ColumnDef,
  Row,
  RowSelectionState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/react-table";

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
  sizeWidthsForVariant,
} from "./CardView";
import type {
  CardSize,
  CardWrapperProps,
  DataTableViewDef,
  DataTableViewOption,
  RenderCardContext,
} from "./CardView";
import { resolveViewDefs } from "./ViewDefs";
import { BoardView } from "./BoardView";
import type { BoardConfig, BoardLane, GroupingLevel } from "./BoardView";
import { SectionsView } from "./SectionsView";
import type { RenderSectionWrapper, SectionTone, SectionWrapperInfo } from "./GroupSections";
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

export type { ToolbarAction, DataTableFilter, BoardConfig, BoardLane, GroupingLevel };

interface DataTableProps<TData extends RowData> {
  title: string;
  columns: ColumnDef<TData, unknown>[];
  tableData: TData[];
  ModelData: ModelData;
  /**
   * Column visibility. Without `onColumnVisibilityChange` this is the *initial
   * seed* (and the per-view re-seed fallback), exactly as it always was. With
   * the callback supplied it becomes CONTROLLED: this value is the visibility,
   * every toggle reports through the callback, and the per-view re-seed is
   * skipped — the owner persists the choice across view switches, so a view
   * change is no longer a reason to discard it.
   */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  defaultSort?: string;
  /** Controlled sort state. Same shape as `view`/`cardSize`: the prop wins
   *  when supplied, `onSortingChange` fires either way. Omit to keep the
   *  table self-managed off `defaultSort`. */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  create_enabled?: boolean;
  add_api_url?: string;
  query_invalidation?: string[];
  filter?: DataTableFilter;
  /** How much of the toolbar to draw.
   *
   *    standard  the full two-zone toolbar
   *    compact   as standard, but edit/delete stay visible (disabled) at rest
   *    quiet     nothing at rest; one slim bulk bar while rows are selected
   *    none      no toolbar at all — for pages that own their own selection UI
   */
  toolbarStyle?: "standard" | "compact" | "quiet" | "none";
  /**
   * Draw no layout toggle, whatever `views` offers.
   *
   * For a consumer that renders the switch itself — it still owns `view` and
   * `onViewChange`, so the table is driven exactly as before; it just puts the
   * control somewhere the toolbar can't reach, like a page's own header. Without
   * this the toggle would appear twice and the two would fight for the same
   * question.
   */
  hideViewToggle?: boolean;
  /** Controlled row selection, keyed by row id (`getRowId` is `String(row.id)`,
   *  so the keys are entity ids). Omit to keep the table self-managed. */
  rowSelection?: RowSelectionState;
  /** Notified on every selection write, controlled or not. Takes TanStack's
   *  updater shape, so a plain `setState` can be handed straight to it. */
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void;
  rowClickFunction?: (data: TData) => void;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
  expandOnRowClick?: boolean;
  cellClassName?: string;
  maxCellHeight?: number;
  pageSize?: number;
  virtualized?: boolean;
  estimatedRowHeight?: number;
  onBulkEditSuccess?: (selectedIds: string[], enabledData: Record<string, unknown>) => void;
  /** Notified after a single-row edit saves, from the package's own edit
   *  button. (The `EditEntry` column and the ⋯ menu take their own callback
   *  through `ColumnGenerator`.) */
  onEditSuccess?: (
    formData: Record<string, unknown>,
    objData: Record<string, unknown>
  ) => void;
  /**
   * Give every row its own edit button in the layouts that draw no columns —
   * cards, gallery, board, sections and the detail pane. Defaults to on
   * wherever `ModelData.update_api_url` is set.
   *
   * On by default because the alternative was the status quo: the package's
   * edit dialog only ever existed as a *column* (`EditEntry`) or as an item in
   * the ⋯ menu, both of which are table furniture, so a page that worked from
   * cards had no way to change the thing it was showing. A table that already
   * draws a visible `EditEntry` cell keeps drawing that one instead — see
   * `rowEditNode` — so nothing doubles up.
   */
  rowEditEnabled?: boolean;
  toolbarActions?: (selectedIds: string[]) => ToolbarAction<TData>[];
  bulk_delete_enabled?: boolean;
  /** Controlled view. A built-in layout name, or the `key` of one of the
   *  declarations passed to `views`. Omit to let the toolbar toggle manage it. */
  view?: string;
  /** Initial view when uncontrolled. Defaults to "table", or "cards" under the
   *  mobile breakpoint. */
  defaultView?: string;
  onViewChange?: (view: string) => void;
  /** Opt-in localStorage persistence of the uncontrolled view choice. */
  viewStorageKey?: string;
  /**
   * Which views the toggle offers. Omit to derive the built-ins: table and
   * cards always, gallery once a visible column claims the `media` card slot,
   * detail once the consumer supplies a `renderSubComponent`, and board once it
   * supplies `board` lanes.
   *
   * Entries may be built-in layout names (as before) or `DataTableViewDef`
   * declarations — a named shape with its own card, width and column preset
   * over one of those layouts. Mixing the two is fine; a page usually wants the
   * table it already had plus two or three shapes of its own.
   */
  views?: DataTableViewOption<TData>[];
  /** Detail view: master-list width in px. Default 300. */
  detailListWidth?: number;
  /** Detail view: virtualizer size estimate per list item. Default 68. */
  estimatedDetailRowHeight?: number;
  /** Card view: replace the default card entirely. Receives the row's
   *  ready-rendered quick actions so a bespoke card can still place them. */
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => React.ReactNode;
  /**
   * Card-shaped views (cards, gallery, board, sections): take over each card's
   * outer wrapper — the drag seam. See `CardRenderOptions.renderCardWrapper`
   * for the full contract; the short version is: render one outermost element,
   * spread `wrapperProps` onto it, and know that wrapped cards trade the
   * enter/exit animation for transforms a drag library can own.
   */
  renderCardWrapper?: (
    row: Row<TData>,
    wrapperProps: CardWrapperProps,
    children: React.ReactNode
  ) => React.ReactNode;
  /**
   * Sections view: take over each section's outermost grid element — the
   * card seam one rung up, for making sections droppable and the section
   * tiles themselves draggable. See `RenderSectionWrapper` for the contract.
   */
  renderSectionWrapper?: RenderSectionWrapper;
  /** Sections view: trailing header furniture per section — a ⋯ menu, edit
   *  affordances. Renders after the count in the section header. */
  sectionHeaderActions?: (section: SectionWrapperInfo) => React.ReactNode;
  /** Sections view: leading header furniture per section — the reorder grip.
   *  Renders ahead of the collapse chevron, at the head of the header row. */
  sectionHeaderLeading?: (section: SectionWrapperInfo) => React.ReactNode;
  /**
   * Sections view: give each group its own backdrop from the theme's card
   * palette (`surface-N`, @bcl32/themes), so sections read as groups rather
   * than as one long wall of identical frames. `"index"` colours by top-level
   * position with sub-sections inheriting their parent's hue; pass a function
   * to map the section's own value instead. Defaults to `"none"`.
   *
   * How many backdrops exist is measured from the running theme, never
   * declared here — see `themeSurfaceCount`.
   */
  sectionTone?: SectionTone;
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
  // Selection follows the same controlled/uncontrolled shape as `view` and
  // `cardSize` below: the prop wins when supplied, the callback fires either
  // way. Everything inside — the table instance, the toolbar's bulk edit and
  // delete forms, the quiet bar's clear — writes through the single
  // `setRowSelection` resolved here, so neither mode needs a second code path.
  const [uncontrolledRowSelection, setUncontrolledRowSelection] =
    React.useState<RowSelectionState>({});
  const rowSelection = props.rowSelection ?? uncontrolledRowSelection;
  // Typed as a setState dispatch because that is what the bulk forms expect;
  // it is the same signature as TanStack's OnChangeFn, so the updater passes
  // through untouched rather than being flattened to a value here — a consumer
  // merging into a wider selection map needs the function form.
  const setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>> = (
    updater
  ) => {
    props.onRowSelectionChange?.(updater);
    if (props.rowSelection === undefined) setUncontrolledRowSelection(updater);
  };

  // Column visibility: controlled when the callback is supplied (see the prop
  // doc), self-managed otherwise. The controlled test is the *callback*, not
  // the value — `columnVisibility` alone has always meant "initial seed", and
  // flipping its meaning on every consumer that passes a static preset would
  // silently freeze their Columns dropdown.
  const controlledColumns = props.onColumnVisibilityChange !== undefined;
  const [uncontrolledColumnVisibility, setUncontrolledColumnVisibility] =
    React.useState<VisibilityState>(props.columnVisibility || {});
  const columnVisibility = controlledColumns
    ? (props.columnVisibility ?? {})
    : uncontrolledColumnVisibility;
  const setColumnVisibility = (updater: Updater<VisibilityState>) => {
    const next = typeof updater === "function" ? updater(columnVisibility) : updater;
    props.onColumnVisibilityChange?.(next);
    if (!controlledColumns) setUncontrolledColumnVisibility(next);
  };

  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const animateViews = (props.animate ?? true) && !reduceMotion;

  // `null` means "nothing chosen, stored, or configured" — only then does the
  // screen-width default get to decide.
  //
  // A stored key is taken at face value here and validated below against the
  // resolved list, which is the only thing that knows what this table offers.
  // Checking it against the built-in five instead would reject every
  // consumer-declared view the moment it came back from localStorage.
  const [uncontrolledView, setUncontrolledView] = React.useState<string | null>(() => {
    if (props.viewStorageKey && typeof window !== "undefined") {
      const stored = window.localStorage.getItem(props.viewStorageKey);
      if (stored) return stored;
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

  // Sorting follows the same controlled/uncontrolled shape as `view` and
  // `cardSize`: the prop wins when supplied, the callback fires either way.
  const [uncontrolledSorting, setUncontrolledSorting] = React.useState<SortingState>([
    {
      id: props.defaultSort || "time_created",
      desc: true,
    },
  ]);
  const sorting = props.sorting ?? uncontrolledSorting;
  const setSorting = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    props.onSortingChange?.(next);
    if (props.sorting === undefined) setUncontrolledSorting(next);
  };

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
  const availableViews: DataTableViewDef<TData>[] = React.useMemo(
    () =>
      resolveViewDefs<TData>(
        props.views?.length
          ? props.views
          : [
              "table",
              "cards",
              ...(hasMediaColumn ? (["gallery"] as const) : []),
              ...(props.renderSubComponent ? (["detail"] as const) : []),
              // One config, two geometries: lanes for scanning a process,
              // packed sections for browsing the collection organised.
              ...(props.board ? (["board", "sections"] as const) : []),
            ]
      ),
    [props.views, hasMediaColumn, props.renderSubComponent, props.board]
  );

  // Cards are the better narrow-screen layout: the table is the thing that
  // scrolls horizontally. useIsMobile reads the width synchronously, so this
  // resolves on the first render rather than flashing a table and reflowing.
  const requestedView = props.view ?? uncontrolledView ?? (isMobile ? "cards" : "table");
  // A stored preference outlives the conditions it was chosen under — the page
  // stops supplying lanes when its group-by attribute goes away, the thumbnail
  // column gets hidden, the same entity key is reused by a page with no
  // expansion panel, or a page reorganises the shapes it declares. Falling back
  // beats rendering a view that isn't there.
  //
  // The fallback is the list's own first entry rather than a hard-coded
  // "table": a page that declares its shapes has said, by ordering them, which
  // one it opens on, and it may not offer a plain table at all.
  const activeView =
    availableViews.find((v) => v.key === requestedView) ?? availableViews[0];
  const view = activeView.key;

  // Re-seed the column preset when the view changes.
  //
  // `columnVisibility` is table state, seeded once from the prop — so a view
  // carrying its own preset would only ever apply on the mount that happened to
  // start there. Consumers used to work around that by putting a `key` on the
  // element and remounting the whole table per shape, which threw away sorting,
  // scroll position and the row selection along with it.
  //
  // Adjusted during render rather than in an effect: React discards this render
  // and re-runs before committing, so the switch never paints one frame of the
  // outgoing view's columns. Guarded on the *view key* alone, so a user's own
  // column toggles survive every unrelated re-render — they are only reset by
  // deliberately moving to a different shape.
  // Starts null so the *first* render seeds too — otherwise a table opening
  // straight onto a view with a preset would show the shared columns until
  // something else moved it.
  const [seededView, setSeededView] = React.useState<string | null>(null);
  if (seededView !== view) {
    setSeededView(view);
    // Controlled columns skip the re-seed twice over: semantically the owner
    // persists the choice across view switches, and mechanically this runs
    // during render, where firing the owner's callback would be a
    // setState-during-render of another component.
    if (!controlledColumns) {
      setUncontrolledColumnVisibility(
        activeView.columnVisibility ?? props.columnVisibility ?? {}
      );
    }
  }

  const setView = (key: string) => {
    if (key !== view) {
      restoreRowIndexRef.current = viewScrollRef.current?.getFirstVisibleRowIndex() ?? null;
    }
    props.onViewChange?.(key);
    if (props.view === undefined) {
      setUncontrolledView(key);
      if (props.viewStorageKey) window.localStorage.setItem(props.viewStorageKey, key);
    }
  };

  // Everything below reads the resolved view's override first and the table's
  // own prop second. That precedence is the whole feature: a shape is a set of
  // these props, and the props a page passes directly are what every shape
  // shares.
  const base = activeView.base;
  const renderCard = activeView.renderCard ?? props.renderCard;
  const renderCardWrapper = activeView.renderCardWrapper ?? props.renderCardWrapper;
  const renderSectionWrapper = activeView.renderSectionWrapper ?? props.renderSectionWrapper;
  const sectionHeaderActions = activeView.sectionHeaderActions ?? props.sectionHeaderActions;
  const sectionHeaderLeading = activeView.sectionHeaderLeading ?? props.sectionHeaderLeading;
  const sectionTone = activeView.sectionTone ?? props.sectionTone;
  const cellClassName = activeView.cellClassName ?? props.cellClassName;
  const maxCellHeight = activeView.maxCellHeight ?? props.maxCellHeight;
  const estimatedCardHeight = activeView.estimatedCardHeight ?? props.estimatedCardHeight;

  // A view may pin its tile independent of its base — `{ base: "sections",
  // variant: "gallery" }` packs media-only tiles into group sections. The
  // variant also picks the size-preset table, so a photo-shaped view gets
  // gallery densities without carrying its own cardMinWidth.
  const cardVariant = activeView.variant ?? (base === "gallery" ? "gallery" : "cards");
  const cardMinWidth =
    activeView.cardMinWidth ?? props.cardMinWidth ?? sizeWidthsForVariant(cardVariant)[cardSize];

  // Filtered rather than a bare Object.keys: TanStack deletes a deselected
  // key, but a controlled consumer merging maps by hand can easily leave an
  // `id: false` behind, and that would otherwise count as a selected row.
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);

  // Resolved once and split two ways: the toolbar renders every action as a
  // bulk button, and the ones that set `card` additionally get a per-card
  // affordance in the card footer.
  const toolbarActions = props.toolbarActions?.(selectedIds) ?? [];
  const cardActions = toolbarActions.filter((action) => action.card);

  // The four card-shaped layouts take the same three edit props; collected here
  // so adding a fifth layout is one spread rather than three more lines each.
  const rowEdit = {
    rowEditEnabled: props.rowEditEnabled ?? Boolean(props.ModelData.update_api_url),
    query_invalidation: props.query_invalidation,
    onEditSuccess: props.onEditSuccess,
  };

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
      {/* "none" is a consumer saying it supplies the selection UI itself (a
          page-level bulk bar over several tables, say) — mounting an empty
          toolbar would only reserve space above every one of them. */}
      {props.toolbarStyle !== "none" && (
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
          activeView={activeView}
          onViewChange={setView}
          hideViewToggle={props.hideViewToggle}
          cardSize={cardSize}
          onCardSizeChange={setCardSize}
          // A view pinning its own width has already answered the question the
          // preset asks, same as a table-level `cardMinWidth` always did.
          showCardSizeControl={
            props.cardMinWidth === undefined && activeView.cardMinWidth === undefined
          }
          availableViews={availableViews}
          board={props.board}
        />
      )}

      {/* The detail view is the one layout that does not scroll as a block: it
          owns two independently scrolling panes, so the region around them has
          to be a fixed-height box rather than a scroller. */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 min-h-0",
          base === "detail" ? "overflow-hidden" : "overflow-auto"
        )}
      >
        {/* mode="wait" so the two layouts never overlap in the scroll region —
            a cross-dissolve of a table over a card grid is just noise, and
            overlapping them would double the scroll height mid-transition. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className={base === "detail" ? "h-full" : undefined}
            initial={animateViews ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={animateViews ? { opacity: 0 } : undefined}
            transition={{ duration: animateViews ? 0.12 : 0 }}
          >
            {base === "detail" ? (
              <DetailPaneView
                table={tableInstance}
                ModelData={props.ModelData}
                virtualized={props.virtualized}
                estimatedListRowHeight={props.estimatedDetailRowHeight}
                listWidth={props.detailListWidth}
                rowClickFunction={props.rowClickFunction}
                renderSubComponent={renderSubComponent}
                cardActions={cardActions}
                cardSlots={activeView.cardSlots}
                {...rowEdit}
                scrollHandleRef={viewScrollRef}
                restoreRowIndex={restoreRowIndexRef}
              />
            ) : base === "board" && props.board ? (
              <BoardView
                table={tableInstance}
                ModelData={props.ModelData}
                scrollRef={scrollRef}
                board={props.board}
                laneWidth={cardMinWidth}
                variant={cardVariant}
                maxCellHeight={maxCellHeight}
                rowClickFunction={props.rowClickFunction}
                expandOnRowClick={props.expandOnRowClick}
                renderSubComponent={renderSubComponent}
                renderCard={renderCard}
                renderCardWrapper={renderCardWrapper}
                cardActions={cardActions}
                cardSlots={activeView.cardSlots}
                {...rowEdit}
                scrollHandleRef={viewScrollRef}
                restoreRowIndex={restoreRowIndexRef}
                animate={props.animate}
              />
            ) : base === "sections" && props.board ? (
              <SectionsView
                table={tableInstance}
                ModelData={props.ModelData}
                scrollRef={scrollRef}
                board={props.board}
                cardMinWidth={cardMinWidth}
                variant={cardVariant}
                maxCellHeight={maxCellHeight}
                rowClickFunction={props.rowClickFunction}
                expandOnRowClick={props.expandOnRowClick}
                renderSubComponent={renderSubComponent}
                renderCard={renderCard}
                renderCardWrapper={renderCardWrapper}
                renderSectionWrapper={renderSectionWrapper}
                sectionHeaderActions={sectionHeaderActions}
                sectionHeaderLeading={sectionHeaderLeading}
                sectionTone={sectionTone}
                cardActions={cardActions}
                cardSlots={activeView.cardSlots}
                {...rowEdit}
                scrollHandleRef={viewScrollRef}
                restoreRowIndex={restoreRowIndexRef}
                animate={props.animate}
              />
            ) : base === "cards" || base === "gallery" ? (
              <CardView
                table={tableInstance}
                ModelData={props.ModelData}
                scrollRef={scrollRef}
                variant={cardVariant}
                virtualized={props.virtualized}
                estimatedCardHeight={estimatedCardHeight}
                cardMinWidth={cardMinWidth}
                maxCellHeight={maxCellHeight}
                rowClickFunction={props.rowClickFunction}
                expandOnRowClick={props.expandOnRowClick}
                renderSubComponent={renderSubComponent}
                renderCard={renderCard}
                renderCardWrapper={renderCardWrapper}
                cardActions={cardActions}
                cardSlots={activeView.cardSlots}
                {...rowEdit}
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
                cellClassName={cellClassName}
                maxCellHeight={maxCellHeight}
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
