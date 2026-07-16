import React, { Fragment } from "react";
import type { ColumnDef, Row, SortingState, VisibilityState } from "@tanstack/react-table";

import {
  useReactTable,
  getExpandedRowModel,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@bcl32/utils/cn";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableFooter,
  TableRow,
} from "./Table";

import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";

import { Plus, Pencil, Columns3, Trash2 } from "lucide-react";
import { DataTablePagination } from "./TablePagination";

import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
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

  const totalSize = tableInstance.getTotalSize();

  // Virtualization plumbing. The scroll ref is attached to DataTable's
  // own internal scroll region. When `virtualized` is set, we attempt
  // to virtualize against it; if the parent didn't give DataTable a
  // bounded flex context, the scroll region won't actually scroll and
  // the virtualizer harmlessly renders all rows (same as non-virtualized).
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const rows = tableInstance.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: props.virtualized ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => props.estimatedRowHeight ?? 56,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height,
  });
  const virtualItems = props.virtualized ? virtualizer.getVirtualItems() : [];
  const virtualTotalSize = props.virtualized ? virtualizer.getTotalSize() : 0;
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualTotalSize - virtualItems[virtualItems.length - 1].end
      : 0;

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
        <div className="flex items-center gap-2 min-h-9">
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

          <div className="flex items-center gap-1.5 ml-auto shrink-0">
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
          </div>
        </div>
      </div>

      {/* Filter panel — rendered as sibling to table to avoid re-render on tab switch */}
      {props.filter?.panel && <div className="shrink-0">{props.filter.panel}</div>}

      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0">
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
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={props.columns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {props.virtualized && paddingTop > 0 && (
                <tr style={{ height: paddingTop }} aria-hidden>
                  <td colSpan={props.columns.length} />
                </tr>
              )}
              {(props.virtualized ? virtualItems.map((vi) => rows[vi.index]) : rows).map((row, idx) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    data-index={props.virtualized ? virtualItems[idx].index : undefined}
                    ref={props.virtualized ? virtualizer.measureElement : undefined}
                    className={props.expandOnRowClick ? "cursor-pointer" : undefined}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("a, input, button, label")) return;
                      if (props.expandOnRowClick) {
                        row.toggleExpanded();
                      }
                      handleRowClick(row.original);
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
                        {renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {props.virtualized && paddingBottom > 0 && (
                <tr style={{ height: paddingBottom }} aria-hidden>
                  <td colSpan={props.columns.length} />
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
      </div>

      {tableInstance.getPageCount() > 1 && <DataTablePagination table={tableInstance} />}
    </div>
  );
}
