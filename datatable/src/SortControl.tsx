import type { Table as TanstackTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@bcl32/utils/Button";
import { Select } from "@bcl32/utils/Select";
import type { ModelData, RowData } from "@bcl32/data-utils";

import { CONTROL_COLUMN_IDS, columnLabelText, humanizeId } from "./ColumnLabels";

/**
 * Explicit field + direction sort, shown in the toolbar for **both** layouts.
 *
 * Cards need it because they have no column headers to click. The table needs
 * it too, for a less obvious reason: its header is the only sort affordance and
 * it scrolls out of view (`TableHeader`'s `sticky top-0` is defeated by the
 * scroll wrapper inside the `Table` primitive), so on a long table sorting is
 * unreachable without scrolling back to the top.
 *
 * There is no state here and nothing to keep in sync — this control and the
 * header click handler both read and write TanStack's `sorting` state, so the
 * dropdown and the header's ↑/↓ arrow always agree by construction.
 */
export function SortControl<TData extends RowData>(props: {
  table: TanstackTable<TData>;
  ModelData: ModelData;
}): JSX.Element {
  const sortableColumns = props.table
    .getAllColumns()
    .filter((c) => c.getCanSort() && !CONTROL_COLUMN_IDS.has(c.id));
  const current = props.table.getState().sorting[0];
  const desc = current?.desc ?? true;

  return (
    <div className="flex items-center gap-1">
      <Select
        aria-label="Sort by"
        title="Sort by"
        className="h-8 w-[140px] px-2 py-0 text-xs"
        value={current?.id ?? ""}
        onChange={(e) => {
          if (e.target.value) props.table.setSorting([{ id: e.target.value, desc }]);
        }}
      >
        {/* DataTable's default sort is `time_created`, which plenty of tables
            have no column for. Surface it anyway rather than showing a blank
            control that misreports the order the rows are actually in. */}
        {current?.id && !sortableColumns.some((c) => c.id === current.id) && (
          <option value={current.id}>{humanizeId(current.id)}</option>
        )}
        {sortableColumns.map((c) => (
          <option key={c.id} value={c.id}>
            {columnLabelText(c, props.ModelData)}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        size="icon"
        title={desc ? "Descending" : "Ascending"}
        aria-label={desc ? "Sorted descending — switch to ascending" : "Sorted ascending — switch to descending"}
        onClick={() => {
          if (current?.id) props.table.setSorting([{ id: current.id, desc: !desc }]);
        }}
      >
        {desc ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
      </Button>
    </div>
  );
}

/** @deprecated Renamed to `SortControl` — it is no longer card-specific. */
export const CardSortControl = SortControl;
