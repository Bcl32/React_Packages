import React from "react";
import { Pencil } from "lucide-react";

import { DialogButton } from "@bcl32/utils/DialogButton";
import { Button } from "@bcl32/utils/Button";
import { EditModelForm } from "@bcl32/forms/EditModelForm";
import type { ModelData, RowData } from "@bcl32/data-utils";

/**
 * "Edit this one row", as a button that owns its own dialog.
 *
 * Lifted out of `ColumnGenerator`'s `EditCell` so there is exactly one edit
 * dialog in the package rather than one per place that wants to offer editing.
 * `EditCell` now calls this, and so does every card-shaped layout — which is the
 * point: the pencil used to exist only as a *column*, so a table that declined
 * the column (every Print-Tracker table does — `add_edit: false`) had no
 * per-row edit route in the card, gallery, board, sections or detail layouts,
 * none of which draw columns.
 *
 * Non-modal, matching the dialog `EditCell` has always opened: the row-actions
 * menu documents why (RowActions.tsx) — a modal dialog unmounting in the same
 * commit as a modal menu restores the menu's `pointer-events: none` onto the
 * body and freezes the page.
 */
export interface RowEditButtonProps {
  /** The row being edited — `row.original`. */
  obj_data: RowData;
  ModelData: ModelData & { update_api_url: string };
  query_invalidation?: string[];
  onEditSuccess?: (
    formData: Record<string, unknown>,
    objData: Record<string, unknown>
  ) => void;
  /** Button metrics. "icon" (the default) is the bare pencil the column and the
   *  card overlays use; "sm" pairs the pencil with a word for a footer that has
   *  room for it. */
  size?: "icon" | "sm";
  variant?: "default" | "outline" | "ghost";
  /** Shown beside the pencil at `size="sm"`, and the tooltip either way. */
  label?: string;
  className?: string;
}

export function RowEditButton({
  obj_data,
  ModelData,
  query_invalidation,
  onEditSuccess,
  size = "icon",
  variant = "default",
  label = "Edit",
  className,
}: RowEditButtonProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <DialogButton
      key={"dialog-" + obj_data.id}
      size="large"
      open={open}
      onOpenChange={setOpen}
      className={className}
      button={
        <Button
          size={size}
          variant={variant}
          title={label}
          aria-label={size === "icon" ? label : undefined}
          // The card layouts put this inside a clickable card; without this the
          // click that opens the dialog also fires the card's row-click.
          onClick={(e) => e.stopPropagation()}
        >
          <Pencil size={size === "icon" ? 18 : 16} />
          {size !== "icon" && label}
        </Button>
      }
      variant="default"
      title="Edit Entry"
    >
      <EditModelForm
        key={"entryform_edit_data_entry"}
        ModelData={ModelData}
        query_invalidation={query_invalidation || []}
        obj_data={obj_data}
        onSuccess={onEditSuccess}
        onClose={() => setOpen(false)}
      />
    </DialogButton>
  );
}
