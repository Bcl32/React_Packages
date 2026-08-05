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
  CardSortControl,
  CardSelectAllControl,
  CardSizeControl,
  CARD_SIZE_WIDTHS,
  DEFAULT_CARD_SIZE,
} from "./CardView";
import type { CardSize, DataTableView } from "./CardView";

import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";

import { Plus, Pencil, Columns3, Trash2, Table2, LayoutGrid } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { DataTablePagination } from "./TablePagination";

import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { useIsMobile } from "@bcl32/utils/useIsMobile";
import { AddModelForm } from "@bcl32/forms/AddModelForm";
import { BulkEditModelForm } from "@bcl32/forms/BulkEditModelForm";
import { DeleteModelForm } from "@bcl32/forms/DeleteModelForm";
import type { ModelData, RowData } from "@bcl32/data-utils";

export interface ToolbarAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => void;
  visible?: boolean;
  variant?: "default" | "outline" | "ghost" | "grey" | "red" | "blue" | "danger";
  disabled?: boolean;
}

export interface DataTableFilter {
  toolbar: React.ReactNode;
  panel: React.ReactNode;
  filteredCount: number;
  totalCount: number;
}

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
  toolbarActions?: (selectedIds: string[]) => ToolbarAction[];
  bulk_delete_enabled?: boolean;
  /** Controlled layout mode. Omit to let the toolbar toggle manage it. */
  view?: DataTableView;
  /** Initial layout mode when uncontrolled. Defaults to "table", or "cards"
   *  under the mobile breakpoint. */
  defaultView?: DataTableView;
  onViewChange?: (view: DataTableView) => void;
  /** Opt-in localStorage persistence of the uncontrolled view choice. */
  viewStorageKey?: string;
  /** Card view: replace the default card entirely. */
  renderCard?: (row: Row<TData>) => React.ReactNode;
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
}

export function DataTable<TData extends RowData>(
  props: DataTableProps<TData>
): JSX.Element {
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    props.columnVisibility || {}
  );

  const isMobile = useIsMobile();

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
  const setView = (v: DataTableView) => {
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
      {/* Toolbar */}
      <div className="mb-2 shrink-0">
        {/* Wraps rather than clips: the right-hand group is shrink-0 and grows
            by two controls in card mode, which is also the default layout on
            the narrow screens where it would otherwise run off the edge. */}
        <div className="flex flex-wrap items-center gap-2 min-h-9">
          <h3 className="text-lg font-semibold capitalize whitespace-nowrap shrink-0">
            {props.title}
            {props.filter && (
              <span className="text-sm font-normal text-muted-foreground ml-1.5">
                ({props.filter.filteredCount}/{props.filter.totalCount})
              </span>
            )}
          </h3>

          {props.filter?.toolbar && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
              {props.filter.toolbar}
            </div>
          )}

          {/* shrink-0 from `sm` up so the filter bar (not the buttons) absorbs
              a narrow toolbar; below that the group is allowed to shrink so
              flex-wrap can actually break it onto more lines instead of
              running off the card. */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 ml-auto min-w-0 shrink sm:shrink-0">
            {/* The selection-dependent actions come FIRST in this right-anchored
                group. They appear, disappear, and change width with the
                selection count, so anything after them gets shoved sideways
                every time — including the select-all the user just clicked.
                Placed first they grow leftward into the filter bar's slack and
                every stable control keeps its position. */}

            {/* Bulk Edit */}
            {props.ModelData.update_api_url && (
              selectedIds.length > 0 ? (
                <DialogButton
                  key={"dialog-bulk-edit"}
                  isModal={true}
                  size="large"
                  open={bulkEditDialogOpen}
                  onOpenChange={setBulkEditDialogOpen}
                  button={
                    <Button size="sm">
                      <Pencil size={16} />
                      {`Edit (${selectedIds.length})`}
                    </Button>
                  }
                  title={`Bulk Edit ${props.ModelData.model_name || "Entries"}`}
                >
                  <BulkEditModelForm
                    ModelData={props.ModelData as ModelData & { update_api_url: string }}
                    query_invalidation={props.query_invalidation || []}
                    rowSelection={rowSelection}
                    setRowSelection={setRowSelection}
                    onSuccess={props.onBulkEditSuccess}
                    onClose={() => setBulkEditDialogOpen(false)}
                  />
                </DialogButton>
              ) : props.toolbarStyle === "compact" ? (
                <CustomTooltip content="Select records to edit" delayDuration={300}>
                  <span>
                    <Button variant="ghost" size="icon" disabled className="opacity-40">
                      <Pencil size={18} />
                    </Button>
                  </span>
                </CustomTooltip>
              ) : null
            )}

            {props.toolbarActions?.(selectedIds).map((action) => {
              if (action.visible === false) return null;
              return (
                <Button
                  key={action.key}
                  size="sm"
                  variant={action.variant}
                  disabled={action.disabled}
                  onClick={() => action.onClick(selectedIds)}
                >
                  {action.icon} {action.label}
                </Button>
              );
            })}

            {/* Delete */}
            {props.bulk_delete_enabled === false ? null : selectedIds.length > 0 ? (
              <DialogButton
                key={"dialog-delete-entry"}
                isModal={true}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                button={
                  <Button size="sm" variant="danger">
                    <Trash2 size={16} />
                    {`Delete (${selectedIds.length})`}
                  </Button>
                }
                title="Delete Entries"
              >
                <DeleteModelForm
                  key={"delete_entry_form"}
                  delete_api_url={props.ModelData.delete_api_url || ""}
                  query_invalidation={props.query_invalidation || []}
                  rowSelection={rowSelection}
                  setRowSelection={setRowSelection}
                  onClose={() => setDeleteDialogOpen(false)}
                />
              </DialogButton>
            ) : props.toolbarStyle === "compact" ? (
              <CustomTooltip content="Select records to delete" delayDuration={300}>
                <span>
                  <Button variant="ghost" size="icon" disabled className="opacity-40">
                    <Trash2 size={18} />
                  </Button>
                </span>
              </CustomTooltip>
            ) : null}

            {props.create_enabled && (
              <DialogButton
                key={"dialog-add-entry"}
                size="large"
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                button={
                  <Button size="sm">
                    <Plus size={16} />
                    {"Create New"}
                  </Button>
                }
                title={"Create New " + props.ModelData.model_name}
                variant="default"
              >
                <AddModelForm
                  key={"entryform_add_data_entry"}
                  add_api_url={props.add_api_url || ""}
                  ModelData={props.ModelData}
                  query_invalidation={props.query_invalidation || []}
                  onClose={() => setAddDialogOpen(false)}
                />
              </DialogButton>
            )}

            {view === "cards" && (
              <>
                <CardSelectAllControl table={tableInstance} />
                {/* Card size only changes anything once more than one column
                    fits, which it never does below the mobile breakpoint. */}
                {props.cardMinWidth === undefined && (
                  <div className="hidden sm:block">
                    <CardSizeControl value={cardSize} onChange={setCardSize} />
                  </div>
                )}
                <CardSortControl table={tableInstance} ModelData={props.ModelData} />
              </>
            )}

            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={view}
              // Radix emits "" when the active item is re-clicked — ignore it.
              onValueChange={(v) => {
                if (v) setView(v as DataTableView);
              }}
            >
              <ToggleGroupItem value="table" aria-label="Table view" title="Table view">
                <Table2 size={16} />
              </ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Card view" title="Card view">
                <LayoutGrid size={16} />
              </ToggleGroupItem>
            </ToggleGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Toggle Columns">
                  <Columns3 size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tableInstance
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </div>

      {/* Filter panel — rendered as sibling to table to avoid re-render on tab switch */}
      {props.filter?.panel && <div className="shrink-0">{props.filter.panel}</div>}

      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
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
          />
        )}
      </div>

      {tableInstance.getPageCount() > 1 && <DataTablePagination table={tableInstance} />}
    </div>
  );
}
