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
import { Plus, Pencil, Columns3, Trash2, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { cn } from "@bcl32/utils/cn";
import { CustomTooltip } from "@bcl32/utils/Tooltip";
import { AddModelForm } from "@bcl32/forms/AddModelForm";
import { BulkEditModelForm } from "@bcl32/forms/BulkEditModelForm";
import { DeleteModelForm } from "@bcl32/forms/DeleteModelForm";
import { resolveBulkUpdateUrl } from "@bcl32/data-utils";
import type { ModelData, RowData } from "@bcl32/data-utils";

import { SortControl } from "./SortControl";
import { GroupControl } from "./GroupControl";
import { CardSelectAllControl, CardSizeControl } from "./CardView";
import type { CardSize, DataTableViewDef } from "./CardView";
import type { BoardConfig } from "./BoardView";
import type { ToolbarAction } from "./ToolbarAction";

/**
 * The layout toggle, as a piece both toolbars can draw.
 *
 * Built from the resolved view defs rather than a fixed icon table, so a
 * consumer-declared shape gets a button on the same terms as a built-in layout.
 * Renders nothing when there is only one view — a segmented control with one
 * segment is a label.
 */
function ViewToggle<TData extends RowData>(props: {
  views: DataTableViewDef<TData>[];
  value: string;
  onChange: (key: string) => void;
  hidden?: boolean;
}): JSX.Element | null {
  if (props.hidden || props.views.length <= 1) return null;
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={props.value}
      // Radix emits "" when the active item is re-clicked — ignore it.
      onValueChange={(v) => {
        if (v) props.onChange(v);
      }}
      // A catalogue can run to five or six shapes; keep it whole and let the
      // toolbar row wrap around it rather than letting flex crush the buttons.
      className="shrink-0"
    >
      {props.views.map((def) => (
        <ToggleGroupItem key={def.key} value={def.key} aria-label={def.label} title={def.label}>
          {def.icon}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

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
  /** See DataTable's prop of the same name. "none" never reaches here — the
   *  table skips the toolbar entirely — but "quiet" is handled below. */
  toolbarStyle?: "standard" | "compact" | "quiet" | "none";
  /** See DataTable's prop of the same name: the consumer draws the switch. */
  hideViewToggle?: boolean;
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
  /** The active view's key. */
  view: string;
  /** The active view itself, already resolved. Every "is this layout X" test in
   *  here reads `activeView.base`, so a consumer-declared shape behaves as
   *  whichever layout draws it. */
  activeView: DataTableViewDef<TData>;
  onViewChange: (view: string) => void;
  cardSize: CardSize;
  onCardSizeChange: (size: CardSize) => void;
  /** False when an explicit `cardMinWidth` is pinned — by the table or by the
   *  active view — which the preset would only contradict. */
  showCardSizeControl: boolean;
  /** The views this table can offer, already resolved by DataTable — a board
   *  needs lanes, a gallery a media column, a detail pane something to dock, so
   *  the toggle only ever shows buttons that lead somewhere. It disappears
   *  entirely when there is only one. */
  availableViews: DataTableViewDef<TData>[];
  /** The board's config, for the group-by picker. Absent on tables with no
   *  board, and ignored in every layout but the board. */
  board?: BoardConfig<TData>;
}

/** The consumer's `toolbarActions`, as buttons. One renderer with two callers —
 *  zone 2 of the standard toolbar and the quiet bulk bar. They differ only in
 *  button metrics, which is not enough to justify a second copy that would then
 *  have to be kept in step every time an action gains a field. */
function ToolbarActionButtons<TData extends RowData>(props: {
  actions: ToolbarAction<TData>[];
  selectedIds: string[];
  /** Metric overrides for the caller's scale. Omit for the standard size. */
  className?: string;
}): JSX.Element {
  return (
    <>
      {props.actions.map((action) => {
        if (action.visible === false) return null;
        return (
          <Button
            key={action.key}
            size="sm"
            variant={action.variant}
            disabled={action.disabled}
            className={props.className}
            onClick={() => action.onClick(props.selectedIds)}
          >
            {action.icon} {action.label}
          </Button>
        );
      })}
    </>
  );
}

/**
 * The bulk edit and bulk delete buttons, each owning its dialog.
 *
 * Extracted for the same reason `ToolbarActionButtons` was: both toolbars draw
 * them and they differ only in button metrics. Each renders nothing when the
 * table hasn't declared the write path it needs, so a caller can place them
 * unconditionally.
 */
function BulkEditButton<TData extends RowData>(props: {
  toolbar: DataTableToolbarProps<TData>;
  className?: string;
}): JSX.Element | null {
  const [open, setOpen] = React.useState(false);
  const { toolbar } = props;
  // Gate on the bulk endpoint itself, not on row editing. They were the same
  // question only while the bulk URL was derived from `update_api_url`; a model
  // can be row-editable with no bulk-update route (Print-Tracker's UploadJob),
  // and this button used to open a dialog that 405s on submit for exactly those.
  if (!resolveBulkUpdateUrl(toolbar.ModelData)) return null;

  return (
    <DialogButton
      key={"dialog-bulk-edit"}
      isModal={true}
      size="large"
      open={open}
      onOpenChange={setOpen}
      button={
        <Button size="sm" className={props.className}>
          <Pencil size={16} />
          {`Edit (${toolbar.selectedIds.length})`}
        </Button>
      }
      title={`Bulk Edit ${toolbar.ModelData.model_name || "Entries"}`}
    >
      <BulkEditModelForm
        ModelData={toolbar.ModelData}
        query_invalidation={toolbar.query_invalidation || []}
        rowSelection={toolbar.rowSelection}
        setRowSelection={toolbar.setRowSelection}
        onSuccess={toolbar.onBulkEditSuccess}
        onClose={() => setOpen(false)}
      />
    </DialogButton>
  );
}

function BulkDeleteButton<TData extends RowData>(props: {
  toolbar: DataTableToolbarProps<TData>;
  className?: string;
}): JSX.Element | null {
  const [open, setOpen] = React.useState(false);
  const { toolbar } = props;
  // The URL as well as the flag: a table with no `delete_api_url` would render
  // a button that posts to "". The standard toolbar always had that hole; it
  // only becomes reachable now that the quiet bar draws this too.
  if (toolbar.bulk_delete_enabled === false || !toolbar.ModelData.delete_api_url) {
    return null;
  }

  return (
    <DialogButton
      key={"dialog-delete-entry"}
      isModal={true}
      open={open}
      onOpenChange={setOpen}
      button={
        <Button size="sm" variant="danger" className={props.className}>
          <Trash2 size={16} />
          {`Delete (${toolbar.selectedIds.length})`}
        </Button>
      }
      title="Delete Entries"
    >
      <DeleteModelForm
        key={"delete_entry_form"}
        delete_api_url={toolbar.ModelData.delete_api_url || ""}
        query_invalidation={toolbar.query_invalidation || []}
        rowSelection={toolbar.rowSelection}
        setRowSelection={toolbar.setRowSelection}
        onClose={() => setOpen(false)}
      />
    </DialogButton>
  );
}

/**
 * The whole of `toolbarStyle="quiet"`: nothing at rest, and one slim bar once
 * rows are selected.
 *
 * For tables that are a *section* of a page rather than the page — a stack of
 * them down one screen. There the standard toolbar's title, filters, sort and
 * view toggle are either duplicated by the page or meaningless per section,
 * and the permanent 2-zone header repeated eight times reads as chrome. What is
 * genuinely per-section is what you do with the rows you ticked *here*, so that
 * is all this draws, and only while something is ticked.
 *
 * A section that also wants a shape switch draws its own and passes
 * `hideViewToggle`; see that prop on DataTable.
 *
 * This bar used to carry no bulk edit or delete, on the reasoning that they
 * belong to the table that owns the entity rather than to a section view of it.
 * That reasoning was wrong in practice: the quiet bar is what every layout
 * below full width draws, so the effect was that ticking checkboxes anywhere
 * but the Table shape gave you nothing to do with the selection — and the
 * standard toolbar the argument pointed at is exactly the one those shapes hide.
 * Both dialogs act on the section's own row selection, which is what the ticks
 * meant.
 */
function QuietBulkBar<TData extends RowData>(
  props: DataTableToolbarProps<TData>
): JSX.Element | null {
  if (props.selectedIds.length === 0) return null;

  // Matching CardSelectAllControl's h-8/text-xs so the row reads as one band
  // rather than as buttons of three heights; the gap is what keeps an action's
  // icon off its label at this smaller scale.
  const control = "h-8 gap-1 px-2 text-xs";

  return (
    <div className="mb-2 shrink-0 flex flex-wrap items-center gap-1.5 rounded-md border bg-muted px-2 py-1">
      <span className="text-xs font-medium whitespace-nowrap">
        {props.selectedIds.length} selected
      </span>

      <CardSelectAllControl table={props.table} />

      <BulkEditButton toolbar={props} className={control} />

      <ToolbarActionButtons
        actions={props.actions}
        selectedIds={props.selectedIds}
        className={control}
      />

      <BulkDeleteButton toolbar={props} className={control} />

      {/* Last, and pushed to the far end: it is the one control here that
          undoes rather than does, and it must not sit under the pointer that
          just clicked an action. */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(control, "ml-auto")}
        onClick={() => props.setRowSelection({})}
      >
        <X size={14} />
        Clear
      </Button>
    </div>
  );
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
): JSX.Element | null {
  // Dialog state lives here rather than in DataTable: nothing outside this
  // toolbar opens or reads it. (The bulk edit and delete dialogs own their own
  // — see BulkEditButton / BulkDeleteButton, which both bars draw.)
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  const { selectedIds, table } = props;
  const hasFilters = Boolean(props.filter);
  // Which layout is actually drawing. A declared shape answers as the layout it
  // is built on, so "cards have no header row" stays true of every card shape.
  const base = props.activeView.base;

  // A different toolbar rather than a variation on this one — quiet mode keeps
  // none of the two zones, so branching inside them would be a conditional
  // around every child.
  if (props.toolbarStyle === "quiet") return <QuietBulkBar {...props} />;

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

        {/* Bulk Edit — the same capability check as BulkEditButton, so the
            disabled placeholder does not advertise an action that could never
            become available once a record is selected. */}
        {resolveBulkUpdateUrl(props.ModelData) && (
          selectedIds.length > 0 ? (
            <BulkEditButton toolbar={props} />
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

        <ToolbarActionButtons actions={props.actions} selectedIds={selectedIds} />

        {/* Delete */}
        {props.bulk_delete_enabled === false ? null : selectedIds.length > 0 ? (
          <BulkDeleteButton toolbar={props} />
        ) : props.toolbarStyle === "compact" ? (
          <CustomTooltip content="Select records to delete" delayDuration={300}>
            <span>
              <Button variant="ghost" size="icon" disabled className="opacity-40">
                <Trash2 size={18} />
              </Button>
            </span>
          </CustomTooltip>
        ) : null}

        {/* The URL as well as the flag, for the same reason bulk delete checks
            both: `create_enabled` says the page wants a Create button, but with
            no add URL the form posts to "". Call sites pass
            `ModelData.add_api_url`, which the generator now omits when the API
            has no create route — Print-Tracker's PrintJob had this button for
            an endpoint that never existed. */}
        {props.create_enabled && props.add_api_url && (
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

        {/* Every layout but the table lacks a header row, and with it the only
            select-all the table layout has. */}
        {base !== "table" && <CardSelectAllControl table={table} />}

        {/* In the grid and the gallery, card size only changes anything once
            more than one column fits, which it never does below the mobile
            breakpoint. On the board it is the lane width, which always matters.
            The detail view's list is a fixed single column, so it has no
            density to set. */}
        {base !== "table" && base !== "detail" && props.showCardSizeControl && (
          <div className={base === "board" ? undefined : "hidden sm:block"}>
            <CardSizeControl value={props.cardSize} onChange={props.onCardSizeChange} />
          </div>
        )}

        {/* Only the grouped layouts have groups to relabel, and only when the
            consumer offered a choice — one option is a caption, not a control.
            Sits beside the sort control because both answer "how is this
            arranged". The "then by" half only shows where nesting can render:
            the sections layout. The board's one axis is already spent. */}
        {(base === "board" || base === "sections") &&
          (props.board?.groupByOptions?.length ?? 0) > 1 && (
            <GroupControl
              value={props.board!.groupBy}
              options={props.board!.groupByOptions!}
              onChange={(name) => props.board!.onGroupByChange?.(name)}
              subValue={base === "sections" ? props.board!.subGroupBy : undefined}
              onSubChange={
                base === "sections" ? props.board!.onSubGroupByChange : undefined
              }
            />
          )}

        {/* Both layouts: cards have no headers to click, and the table's
            headers scroll out of view. */}
        <SortControl table={table} ModelData={props.ModelData} />

        <ViewToggle
          views={props.availableViews}
          value={props.view}
          onChange={props.onViewChange}
          hidden={props.hideViewToggle}
        />

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
