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

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataTablePagination } from "./TablePagination";

import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { AddModelForm } from "@bcl32/forms/AddModelForm";
import { BulkEditModelForm } from "@bcl32/forms/BulkEditModelForm";
import { DeleteModelForm } from "@bcl32/forms/DeleteModelForm";
import type { ModelData, RowData } from "@bcl32/data-utils";

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
  rowClickFunction?: (data: TData) => void;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
  expandOnRowClick?: boolean;
  cellClassName?: string;
  maxCellHeight?: number;
  pageSize?: number;
  onBulkEditSuccess?: (selectedIds: string[], enabledData: Record<string, unknown>) => void;
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

  const handleRowClick = props.rowClickFunction || ((_data: TData) => {
    // no-op default
  });

  const totalSize = tableInstance.getTotalSize();

  const renderSubComponent = props.renderSubComponent || (({ row }: { row: Row<TData> }) => (
    <div className="h-96 overflow-scroll">
      <pre style={{ fontSize: "20px", whiteSpace: "pre-wrap" }}>
        <code>{JSON.stringify(row.original, null, 2)}</code>
      </pre>
    </div>
  ));

  return (
    <div>
      <h3 className="display: inline-block text-2xl capitalize">
        {props.title}
      </h3>
      {props.create_enabled && (
        <DialogButton
          className="display: inline-block"
          key={"dialog-add-entry"}
          size="large"
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          button={
            <Button>
              <AddIcon />
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
          <Button variant="default" size="default">
            <ViewColumnIcon /> {"Columns"}
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

      {props.ModelData.update_api_url && (
        <DialogButton
          className="display: inline-block"
          key={"dialog-bulk-edit"}
          isModal={true}
          size="large"
          open={bulkEditDialogOpen}
          onOpenChange={setBulkEditDialogOpen}
          button={
            <Button>
              <EditIcon /> {"Bulk Edit"}
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
      )}

      <DialogButton
        className="display: inline-block"
        key={"dialog-delete-entry"}
        isModal={true}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        button={
          <Button>
            <DeleteIcon /> {"Delete"}
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

      <Table className="text-md border-4 rounded-lg">
        <TableHeader>
          {tableInstance.getHeaderGroups().map((headerGroup) => {
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
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
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <span className="pl-2">↑</span>,
                            desc: <span className="pl-2">↓</span>,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            );
          })}
        </TableHeader>
        <TableBody>
          {tableInstance.getRowModel().rows?.length ? (
            tableInstance.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  data-state={row.getIsSelected() && "selected"}
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
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell
                        key={cell.id}
                        className={props.cellClassName}
                        style={{
                          width: `${(cell.column.getSize() / totalSize) * 100}%`,
                          minWidth: cell.column.columnDef.minSize,
                          maxWidth: cell.column.columnDef.maxSize != null && cell.column.columnDef.maxSize < Number.MAX_SAFE_INTEGER
                            ? cell.column.columnDef.maxSize : undefined,
                        }}
                      >
                        {props.maxCellHeight && !(cell.column.columnDef.meta as Record<string, unknown>)?.noMaxHeight ? (
                          <div style={{ maxHeight: props.maxCellHeight, overflowY: "auto" }}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </div>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>

                {row.getIsExpanded() && (
                  <TableRow>
                    <TableCell colSpan={row.getVisibleCells().length}>
                      {renderSubComponent({ row })}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={props.columns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
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

      {tableInstance.getPageCount() > 1 && <DataTablePagination table={tableInstance} />}
    </div>
  );
}
