import { createColumnHelper, type ColumnDef, type Row } from "@tanstack/react-table";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";
import { Checkbox } from "@bcl32/utils/Checkbox";

import dayjs from "dayjs";

import { RowActions } from "./RowActions";
import { EditModelForm } from "@bcl32/forms/EditModelForm";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";

import { dayjs_sorter } from "@bcl32/data-utils/dayjs_sorter";

interface ModelData {
  model_name: string;
  model_attributes: unknown[];
  add_api_url?: string;
  update_api_url?: string;
  delete_api_url?: string;
  [key: string]: unknown;
}

interface RowData {
  id: string | number;
  time_created?: string;
  time_updated?: string;
  [key: string]: unknown;
}

interface ColumnGeneratorProps {
  custom_columns: ColumnDef<RowData, unknown>[];
  query_invalidation: string[];
  ModelData: ModelData;
  add_edit?: boolean;
}

const columnHelper = createColumnHelper<RowData>();

export function ColumnGenerator({
  custom_columns,
  query_invalidation,
  ModelData,
  add_edit = true,
}: ColumnGeneratorProps): ColumnDef<RowData, unknown>[] {
  const edit_column: ColumnDef<RowData, unknown> = {
    id: "EditEntry",
    header: () => <span>Edit</span>,
    minSize: 10,
    maxSize: 10,
    cell: ({ row }) => {
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
              ModelData={ModelData as Parameters<typeof EditModelForm>[0]["ModelData"]}
              query_invalidation={query_invalidation}
              obj_data={row.original as Parameters<typeof EditModelForm>[0]["obj_data"]}
            />
          </DialogButton>
        </div>
      );
    },
  };

  const action_column: ColumnDef<RowData, unknown> = {
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

  const select_column: ColumnDef<RowData, unknown> = {
    id: "select",
    minSize: 10,
    maxSize: 10,
    header: ({ table }) => {
      return (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(checked) => {
            table.toggleAllRowsSelected(!!checked);
          }}
          className={"w-5 h-5 border-2"}
        />
      );
    },
    cell: ({ row }) => (
      <div className="px-0">
        <Checkbox
          name={"checkbox" + row.id}
          checked={row.getIsSelected()}
          onCheckedChange={() => row.toggleSelected()}
          className="w-5 h-5"
        />
      </div>
    ),
  };

  const expand_column: ColumnDef<RowData, unknown> = {
    id: "expander",
    header: () => null,
    minSize: 10,
    maxSize: 10,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <button
          onClick={row.getToggleExpandedHandler()}
          style={{ cursor: "pointer" }}
        >
          {row.getIsExpanded() ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </button>
      ) : (
        "🔵"
      );
    },
  };

  const time_created: ColumnDef<RowData, unknown> = columnHelper.accessor((row) => row.time_created as unknown, {
    id: "time_created",
    cell: (info) => {
      const value = info.getValue() as string | undefined;
      if (!value) return <span className="text-muted-foreground">-</span>;
      const date = dayjs(value);
      if (!date.isValid()) return <span className="text-muted-foreground">Invalid Date</span>;
      return date.format("MMM, D YYYY - h:mma");
    },
    sortingFn: (rowA: Row<RowData>, rowB: Row<RowData>, column_id: string) =>
      dayjs_sorter(rowA, rowB, column_id),
    header: () => <span>Time Created</span>,
  });

  const time_updated: ColumnDef<RowData, unknown> = columnHelper.accessor((row) => row.time_updated as unknown, {
    id: "time_updated",
    cell: (info) => {
      const value = info.getValue() as string | undefined;
      if (!value) return <span className="text-muted-foreground">-</span>;
      const date = dayjs(value);
      if (!date.isValid()) return <span className="text-muted-foreground">Invalid Date</span>;
      return date.format("MMM, D YYYY - h:mma");
    },
    sortingFn: (rowA: Row<RowData>, rowB: Row<RowData>, column_id: string) =>
      dayjs_sorter(rowA, rowB, column_id),
    header: () => <span>Time Updated</span>,
  });

  let control_columns: ColumnDef<RowData, unknown>[] = [select_column, expand_column];
  if (add_edit) {
    control_columns.push(edit_column);
  }
  let all_columns = control_columns.concat(custom_columns);
  all_columns = all_columns.concat([time_created, time_updated, action_column]);
  return all_columns;
}
