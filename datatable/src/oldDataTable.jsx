import React, { Fragment, useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import * as Dialog from "@radix-ui/react-dialog";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import DeleteIcon from "@mui/icons-material/Delete";
import "./styles/table_styles.css";

//MONOREPO PACKAGE IMPORTS
import { useDatabaseMutation } from "@bcl32/hooks/useDatabaseMutation";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { AddModelForm } from "@bcl32/forms/AddModelForm";
import { DeleteModelForm } from "@bcl32/forms/DeleteModelForm";

import {
  useReactTable,
  getExpandedRowModel,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

export function DataTable(props) {
  const [rowSelection, setRowSelection] = React.useState({});
  let [open, setOpen] = useState(false);

  const [columnVisibility, setColumnVisibility] = React.useState(
    props.columnVisibility
  );

  const [sorting, setSorting] = React.useState([
    {
      id: props.defaultSort, // Must be equal to the accessorKey of the coulmn you want sorted by default
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
    getRowId: (row) => row.id,
    enableRowSelection: true, //enable row selection for all rows
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
        pageSize: 20,
      },
    },
  });

  function fillFormFromTable(data) {
    props.setFormData(data);
  }

  var rowClickFunction = fillFormFromTable; //fillFormFromTable is the default function to activate on click
  if ("rowClickFunction" in props) {
    //if an alternative click function is provided as a prop
    rowClickFunction = props.rowClickFunction; //the passed prop function is now used on click instead
  }

  return (
    <div>
      <h3 className="display: inline-block text-2xl">{props.title}</h3>
      {props.create_enabled && (
        <DialogButton key={"dialog-add-entry"}>
          <DialogButton.Button asChild>
            <Button variant="default" size="default">
              <AddIcon /> {"Create New"}
            </Button>
          </DialogButton.Button>

          <DialogButton.Content title="Create New" variant="grey">
            <AddModelForm
              key={"entryform_add_data_entry"}
              add_api_url={props.add_api_url}
              ModelData={props.ModelData}
              query_invalidation={props.query_invalidation}
            />
          </DialogButton.Content>
        </DialogButton>
      )}

      <DialogButton key={"dialog-show-hide-columns"} isModal={true}>
        <DialogButton.Button asChild>
          <Button variant="default" size="default">
            <ViewColumnIcon /> {"Columns"}
          </Button>
        </DialogButton.Button>

        <DialogButton.Content title="Show/Hide Columns">
          {tableInstance.getAllLeafColumns().map((column) => {
            return (
              <div key={column.id} className="px-1">
                <label>
                  <input
                    {...{
                      type: "checkbox",
                      checked: column.getIsVisible(),
                      onChange: column.getToggleVisibilityHandler(),
                    }}
                  />{" "}
                  {column.id}
                </label>
              </div>
            );
          })}
        </DialogButton.Content>
      </DialogButton>

      <DialogButton key={"dialog-delete-entry"} isModal={true}>
        <DialogButton.Button asChild>
          <Button variant="default" size="default">
            <DeleteIcon /> {"Delete"}
          </Button>
        </DialogButton.Button>

        <DialogButton.Content title="Delete Entries">
          <DeleteModelForm
            key={"delete_entry_form"}
            delete_api_url={props.ModelData.delete_api_url}
            query_invalidation={props.query_invalidation}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
          ></DeleteModelForm>
        </DialogButton.Content>
      </DialogButton>

      <TableContainer component={Paper}>
        <Table aria-label="simple table" size={"small"}>
          <TableHead>
            {tableInstance.getHeaderGroups().map((headerEl) => {
              return (
                <TableRow key={headerEl.id}>
                  {headerEl.headers.map((columnEl) => {
                    return (
                      <TableCell key={columnEl.id} colSpan={columnEl.colSpan}>
                        {columnEl.isPlaceholder ? null : (
                          <div
                            {...{
                              className: columnEl.column.getCanSort()
                                ? "cursor-pointer select-none flex min-w-[36px]"
                                : "",
                              onClick:
                                columnEl.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              columnEl.column.columnDef.header,
                              columnEl.getContext()
                            )}
                            {{
                              asc: <span className="pl-2">↑</span>,
                              desc: <span className="pl-2">↓</span>,
                            }[columnEl.column.getIsSorted()] ?? null}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHead>
          <TableBody>
            {tableInstance.getRowModel().rows.map((row) => {
              return (
                <Fragment key={row.id}>
                  <TableRow
                    onClick={() => rowClickFunction(row.original)} //optionally passed to datatable object to activate onClick
                  >
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            left: cell.column.getStart(),
                            width: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {row.getIsExpanded() && (
                    <TableRow>
                      {/* 2nd row is a custom 1 cell row */}
                      <TableCell colSpan={row.getVisibleCells().length}>
                        {props.renderSubComponent({ row })}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <div>
        <button
          className="border rounded p-1"
          onClick={() => tableInstance.setPageIndex(0)}
          disabled={!tableInstance.getCanPreviousPage()}
        >
          {"<<"}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => tableInstance.previousPage()}
          disabled={!tableInstance.getCanPreviousPage()}
        >
          {"<"}
        </button>
        <button
          className="border rounded p-1"
          onClick={() => tableInstance.nextPage()}
          disabled={!tableInstance.getCanNextPage()}
        >
          {">"}
        </button>
        <button
          className="border rounded p-1"
          onClick={() =>
            tableInstance.setPageIndex(tableInstance.getPageCount() - 1)
          }
          disabled={!tableInstance.getCanNextPage()}
        >
          {">>"}
        </button>
        {/* <span className="flex items-center gap-1"> */}
        <span>
          <div style={{ display: "inline" }}>Page</div>
          <strong>
            {tableInstance.getState().pagination.pageIndex + 1} of{" "}
            {tableInstance.getPageCount()}
          </strong>
        </span>
        {/* <span className="flex items-center gap-1"> */}
        <span>
          | Go to page:
          <input
            type="number"
            defaultValue={tableInstance.getState().pagination.pageIndex + 1}
            onChange={(e) => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              tableInstance.setPageIndex(page);
            }}
            className="border p-1 rounded w-16"
          />
        </span>
        <select
          value={tableInstance.getState().pagination.pageSize}
          onChange={(e) => {
            tableInstance.setPageSize(Number(e.target.value));
          }}
        >
          {[5, 10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </div>

      {/* diplays pagination data */}
      {/* <div>{tableInstance.getRowModel().rows.length} Rows</div>
      <pre>{JSON.stringify(tableInstance.getState().pagination, null, 2)}</pre> */}
    </div>
  );
}
