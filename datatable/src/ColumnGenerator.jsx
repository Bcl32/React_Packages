import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";
import { Checkbox } from "@bcl32/utils/Checkbox";

//other modules
import dayjs from "dayjs";

//MONOREPO PACKAGE IMPORTS
import { RowActions } from "@bcl32/datatable/RowActions";
import { EditModelForm } from "@bcl32/forms/EditModelForm";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";

import { dayjs_sorter } from "@bcl32/utils/dayjs_sorter";

const columnHelper = createColumnHelper();

import React from "react";

export function ColumnGenerator({
  custom_columns,
  query_invalidation,
  ModelData,
  add_edit = true,
}) {
  const edit_column = {
    id: "EditEntry",
    header: () => <span>Edit</span>,
    minSize: 10,
    maxSize: 10,
    cell: ({ cell, row }) => {
      return (
        <div>
          <DialogButton
            key={"dialog-" + row.original.id}
            button={
              <Button size="icon">
                <EditIcon />
              </Button>
            }
            variant="default"
            title="Edit Entry"
          >
            <EditModelForm
              key={"entryform_edit_data_entry"}
              add_api_url={ModelData.add_api_url}
              ModelData={ModelData}
              query_invalidation={query_invalidation}
              obj_data={row.original}
            />
          </DialogButton>
        </div>
      );
    },
  };

  const action_column = {
    id: "actions",
    cell: ({ row }) => (
      <RowActions
        row={row}
        ModelData={ModelData}
        query_invalidation={query_invalidation}
      />
    ),
    header: () => null,
  };

  const select_column = {
    id: "select",
    minSize: 10,
    maxSize: 10,
    header: ({ table }) => {
      var all_selected = table.getIsAllRowsSelected();
      return (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(checked) => {
            table.toggleAllRowsSelected(checked);
          }}
          className={"w-5 h-5 border-2"}
        />
      );
    },
    cell: ({ row }) => (
      <div className="px-0">
        <Checkbox
          {...{
            name: "checkbox" + row.id,
            checked: row.getIsSelected(),
            onCheckedChange: row.getToggleSelectedHandler(),
            className: "w-5 h-5",
          }}
        />
      </div>
    ),
  };

  const expand_column = {
    id: "expander",
    header: () => null,
    minSize: 10,
    maxSize: 10,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <button
          {...{
            onClick: row.getToggleExpandedHandler(),
            style: { cursor: "pointer" },
          }}
        >
          {row.getIsExpanded() ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </button>
      ) : (
        "🔵"
      );
    },
  };

  const time_created = columnHelper.accessor((row) => row.time_created, {
    id: "time_created",
    cell: (info) => {
      const value = info.getValue();
      if (!value) return <span className="text-muted-foreground">-</span>;
      const date = dayjs(value);
      if (!date.isValid()) return <span className="text-muted-foreground">Invalid Date</span>;
      return date.format("MMM, D YYYY - h:mma");
    },
    sortingFn: (rowA, rowB, column_id) => dayjs_sorter(rowA, rowB, column_id),
    header: () => <span>Time Created</span>,
  });

  const time_updated = columnHelper.accessor((row) => row.time_updated, {
    id: "time_updated",
    cell: (info) => {
      const value = info.getValue();
      if (!value) return <span className="text-muted-foreground">-</span>;
      const date = dayjs(value);
      if (!date.isValid()) return <span className="text-muted-foreground">Invalid Date</span>;
      return date.format("MMM, D YYYY - h:mma");
    },
    sortingFn: (rowA, rowB, column_id) => dayjs_sorter(rowA, rowB, column_id),
    header: () => <span>Time Updated</span>,
  });

  let control_columns = [select_column, expand_column];
  if (add_edit) {
    control_columns.push(edit_column);
  }
  let all_columns = control_columns.concat(custom_columns);
  all_columns = all_columns.concat([time_created, time_updated, action_column]);
  return all_columns;
}
