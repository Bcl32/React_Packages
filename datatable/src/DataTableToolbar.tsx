import React from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";

import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@bcl32/utils/Dropdown";
import { Plus, Pencil, Columns3, Trash2, Table2, LayoutGrid, SquareKanban } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { cn } from "@bcl32/utils/cn";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { AddModelForm } from "@bcl32/forms/AddModelForm";
import { BulkEditModelForm } from "@bcl32/forms/BulkEditModelForm";
import { DeleteModelForm } from "@bcl32/forms/DeleteModelForm";
import type { ModelData, RowData } from "@bcl32/data-utils";

import { SortControl } from "./SortControl";
import { CardSelectAllControl, CardSizeControl } from "./CardView";
import type { CardSize, DataTableView } from "./CardView";
import type { ToolbarAction } from "./ToolbarAction";

export interface DataTableFilter {
  toolbar: React.ReactNode;
  panel: React.ReactNode;
  filteredCount: number;
  totalCount: number;
}

export interface DataTableToolbarProps<TData extends RowData> {
  title: string;
  table: TanstackTable<TData>;
  ModelData: ModelData;
  filter?: DataTableFilter;
  toolbarStyle?: "standard" | "compact";
  selectedIds: string[];
  rowSelection: Record<string, boolean>;
  setRowSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Already resolved against the current selection by DataTable. */
  actions: ToolbarAction<TData>[];
  create_enabled?: boolean;
  add_api_url?: string;
  query_invalidation?: string[];
  bulk_delete_enabled?: boolean;
  onBulkEditSuccess?: (selectedIds: string[], enabledData: Record<string, unknown>) => void;
  view: DataTableView;
  onViewChange: (view: DataTableView) => void;
  cardSize: CardSize;
  onCardSizeChange: (size: CardSize) => void;
  /** False when the consumer pinned an explicit `cardMinWidth`, which the
   *  preset would only contradict. */
  showCardSizeControl: boolean;
  /** Whether the page supplied board lanes. No lanes, no Board button — the
   *  toggle would otherwise offer a layout that can't be built. */
  boardEnabled?: boolean;
}

/**
 * Everything above the rows, in two zones.
 *
 * These used to be one wrapping flex row holding up to thirteen elements, six
 * of which appear, disappear, or change width with the row selection. That row
 * mixed two unrelated questions — *which rows am I looking at* and *what do I
 * do with them* — and had reached the point where the ordering of the controls
 * was dictated by layout-shift avoidance rather than by meaning.
 *
 *   zone 1  title + count, the filter search / pill / active chips, and the
 *           expandable filter panel. Everything here decides **which rows**.
 *           The count heads this zone because it is the filters' output.
 *
 *   zone 2  bulk actions, create, and the view controls, sitting directly on
 *           top of the table they act on. Everything here decides **what to do
 *           with the rows, or how to show them**.
 *
 * With no `filter` prop, zone 1 degrades to a bare title and the divider is
 * dropped, which is close to how the toolbar looked before the split.
 */
export function DataTableToolbar<TData extends RowData>(
  props: DataTableToolbarProps<TData>
): JSX.Element {
  // Dialog state lives here rather than in DataTable: nothing outside this
  // toolbar opens or reads it.
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const { selectedIds, table } = props;
  const hasFilters = Boolean(props.filter);

  return (
    <div className="mb-2 shrink-0">
      {/* ---- zone 1: which rows ------------------------------------------ */}
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
          // Scrolls sideways rather than wrapping: the active-filter chips are
          // unbounded in number, and letting them push the zone taller would
          // shove the table down every time one is added.
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto">
            {props.filter.toolbar}
          </div>
        )}
      </div>

      {props.filter?.panel}

      {/* ---- zone 2: what to do with them -------------------------------- */}
      {/* Still wraps: it holds fewer controls than before but is also what a
          phone sees, where cards are the default layout and card mode adds
          three more. */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-end gap-1.5 min-h-9",
          // Only a separator when there is something above to separate from.
          //
          // `-mt-px` because the filter panel draws its own bottom border while
          // it is expanded, one pixel above this one: without the pull-up the
          // two stack into a 2px rule exactly when the panel is open. Overlaid
          // they are the same colour and read as the single line they should
          // be. While the panel is collapsed it is clipped to zero height, so
          // only this border shows and the 1px shift lands on nothing.
          hasFilters && "-mt-px border-t pt-2"
        )}
      >
        {/* The selection-dependent actions come FIRST in this right-anchored
            group. They appear, disappear, and change width with the selection
            count, so anything after them gets shoved sideways every time —
            including the select-all the user just clicked. Placed first they
            grow leftward into the row's slack and every stable control keeps
            its position. */}

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
                rowSelection={props.rowSelection}
                setRowSelection={props.setRowSelection}
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

        {props.actions.map((action) => {
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
              rowSelection={props.rowSelection}
              setRowSelection={props.setRowSelection}
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

        {/* Both card-based layouts: neither has a header row to select from,
            and both size themselves off the card width. */}
        {(props.view === "cards" || props.view === "board") && (
          <>
            <CardSelectAllControl table={table} />
            {/* In the grid, card size only changes anything once more than one
                column fits, which it never does below the mobile breakpoint.
                On the board it is the lane width, which always matters. */}
            {props.showCardSizeControl && (
              <div className={props.view === "board" ? undefined : "hidden sm:block"}>
                <CardSizeControl value={props.cardSize} onChange={props.onCardSizeChange} />
              </div>
            )}
          </>
        )}

        {/* Both layouts: cards have no headers to click, and the table's
            headers scroll out of view. */}
        <SortControl table={table} ModelData={props.ModelData} />

        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={props.view}
          // Radix emits "" when the active item is re-clicked — ignore it.
          onValueChange={(v) => {
            if (v) props.onViewChange(v as DataTableView);
          }}
        >
          <ToggleGroupItem value="table" aria-label="Table view" title="Table view">
            <Table2 size={16} />
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Card view" title="Card view">
            <LayoutGrid size={16} />
          </ToggleGroupItem>
          {props.boardEnabled && (
            <ToggleGroupItem value="board" aria-label="Board view" title="Board view">
              <SquareKanban size={16} />
            </ToggleGroupItem>
          )}
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
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
