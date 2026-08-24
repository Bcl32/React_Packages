import { createColumnHelper, type ColumnDef, type Row } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@bcl32/utils/Checkbox";

import dayjs from "dayjs";

import { RowActions } from "./RowActions";
import { RowEditButton } from "./RowEditButton";

import { withAttributionColumns } from "./AttributionContext";
import type { AttributionRenderer } from "./AttributionContext";

import { dayjs_sorter } from "@bcl32/data-utils/dayjs_sorter";
import type { ModelData, RowData } from "@bcl32/data-utils";

interface ColumnGeneratorProps {
  custom_columns: ColumnDef<RowData, unknown>[];
  query_invalidation: string[];
  ModelData: ModelData & { update_api_url: string };
  add_edit?: boolean;
  onEditSuccess?: (formData: Record<string, unknown>, objData: Record<string, unknown>) => void;
  /**
   * Draw `created_by` / `updated_by` beside the timestamp columns, rendering
   * each id with this function. Omit (the normal case) and nothing changes.
   *
   * Usually you do **not** pass this: mount an `AttributionProvider` and
   * `DataTable` picks the renderer up from context for every table at once.
   * This prop is the escape hatch for a consumer that renders the generated
   * columns somewhere other than `DataTable`. It cannot be read from context
   * here — `ColumnGenerator` is a plain factory, routinely called from inside
   * a `useMemo` callback, where reading context is illegal.
   */
  renderUser?: AttributionRenderer | null;
}

const columnHelper = createColumnHelper<RowData>();

export function ColumnGenerator({
  custom_columns,
  query_invalidation,
  ModelData,
  add_edit = true,
  onEditSuccess,
  renderUser,
}: ColumnGeneratorProps): ColumnDef<RowData, unknown>[] {
  const edit_column: ColumnDef<RowData, unknown> = {
    id: "EditEntry",
    header: () => <span>Edit</span>,
    size: 56,
    minSize: 56,
    maxSize: 56,
    cell: ({ row }) => (
      <RowEditButton
        obj_data={row.original}
        ModelData={ModelData}
        query_invalidation={query_invalidation}
        onEditSuccess={onEditSuccess}
      />
    ),
  };

  const action_column: ColumnDef<RowData, unknown> = {
    id: "actions",
    // Holds a single 32px icon button; without a size it takes the 150 default,
    // which a fixed-layout (virtualized) table would honour literally.
    size: 64,
    cell: ({ row }) => (
      <RowActions
        row={row}
        ModelData={ModelData}
        query_invalidation={query_invalidation}
        onEditSuccess={onEditSuccess}
      />
    ),
    header: () => null,
  };

  const select_column: ColumnDef<RowData, unknown> = {
    id: "select",
    size: 48,
    minSize: 48,
    maxSize: 48,
    meta: { noMaxHeight: true },
    header: ({ table }) => (
      <label className="flex items-center -m-4 p-4 pr-0 cursor-pointer">
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(checked) => {
            table.toggleAllRowsSelected(!!checked);
          }}
          className={"w-5 h-5 border-2"}
        />
      </label>
    ),
    cell: ({ row }) => (
      <label className="flex items-center -m-4 p-4 pr-0 cursor-pointer">
        <Checkbox
          name={"checkbox" + row.id}
          checked={row.getIsSelected()}
          onCheckedChange={() => row.toggleSelected()}
          className="w-5 h-5"
        />
      </label>
    ),
  };

  const expand_column: ColumnDef<RowData, unknown> = {
    id: "expander",
    header: () => null,
    size: 24,
    minSize: 24,
    maxSize: 24,
    meta: { noMaxHeight: true },
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <button
          onClick={row.getToggleExpandedHandler()}
          style={{ cursor: "pointer" }}
        >
          {row.getIsExpanded() ? <ChevronUp /> : <ChevronDown />}
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
  // No-op (same array reference) unless a renderer was threaded in.
  return withAttributionColumns(all_columns, renderUser);
}
