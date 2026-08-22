import React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@bcl32/utils/Checkbox";
import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

/**
 * "Tick this row off", as a cell.
 *
 * The one affordance the package did not ship. Any table of things that get
 * *done* — a checklist, a punch list, a set of steps — wants a checkbox on the
 * row itself, and every consumer that wanted one so far has hand-rolled it,
 * along with the same three details that are easy to get wrong:
 *
 * 1. **It has to be optimistic.** A checkbox that waits for a round trip reads
 *    as a click that missed, and the user clicks again.
 * 2. **It must not start a drag.** In any card layout with whole-card drag,
 *    the pointer-down that ticks the box also arms the drag sensor, so the tick
 *    becomes a four-pixel drag and never fires. `data-no-drag` is the opt-out
 *    those sensors look for, and it is applied here rather than remembered by
 *    each caller.
 * 3. **It must not trigger the row.** With `expandOnRowClick`, ticking a card
 *    would also expand it.
 *
 * ## What this deliberately does NOT own
 *
 * The write. `onToggle` is the seam, and it stays the seam on purpose: a
 * consumer whose rows live in the react-query cache and one that keeps a local
 * mirror (because it also drag-reorders, and a drag has to move rows before its
 * own round trip) need genuinely different write paths. A cell that reached
 * into the query cache would be correct for the first and actively wrong for
 * the second — it would heal the cache while the mirror the page actually
 * renders stayed stale.
 *
 * So this owns the *interaction*: the shown value, the pending state, the
 * revert, and the accessible name. The consumer owns where the row lives.
 */
export interface CompletionCellProps {
  /** The persisted value. The cell shows its own pending value over this one
   *  until they agree. */
  checked: boolean;
  /**
   * Persist the new value. May return a promise; while it is in flight the box
   * shows `next`. Once it settles — either way — the row is authoritative
   * again, so a failed write shows whatever the consumer reverted the row to.
   *
   * A rejection is caught here (an uncaught one from an event handler is an
   * unhandled rejection, not an error message) and handed to `onToggleError`.
   * Reporting it is the consumer's job — only the consumer knows whether this
   * is "Task not saved" or "Step not saved".
   */
  onToggle: (next: boolean) => void | Promise<unknown>;
  onToggleError?: (error: unknown) => void;
  /**
   * What the row is called, for the accessible name: "Mark <label> done" /
   * "Mark <label> not done". Without it the box announces only as a checkbox,
   * which in a list of forty is not a name.
   */
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function CompletionCell({
  checked,
  onToggle,
  onToggleError,
  label,
  disabled = false,
  className,
}: CompletionCellProps): JSX.Element {
  // null = "no opinion, show the persisted value".
  const [pending, setPending] = React.useState<boolean | null>(null);

  // Fast path: the parent's value already agrees, so the local opinion has
  // nothing left to add. Consumers that apply the change to their own state
  // before awaiting (the common shape) clear here, on the very next render.
  React.useEffect(() => {
    if (pending !== null && pending === checked) setPending(null);
  }, [checked, pending]);

  const shown = pending ?? checked;

  const handleToggle = async () => {
    const next = !shown;
    setPending(next);
    try {
      await onToggle(next);
    } catch (error) {
      onToggleError?.(error);
    } finally {
      // Unconditional, and this is the important half. The obvious rule —
      // "hold the pending value until `checked` catches up" — leaves the box
      // stuck FOREVER on a failed write whose consumer reverts the row to its
      // old value: that value never equals the pending one, so the condition
      // never fires and the checkbox shows a state that was never saved.
      // Once the write has settled the row is authoritative either way.
      setPending(null);
    }
  };

  return (
    <span
      // See the three details in the module comment: the drag opt-out and the
      // row-click guard both live here so no caller has to remember them.
      data-no-drag
      onClick={(e) => e.stopPropagation()}
      className={cn("inline-flex shrink-0", className)}
    >
      <Checkbox
        checked={shown}
        disabled={disabled}
        onCheckedChange={handleToggle}
        aria-label={
          label
            ? shown
              ? `Mark "${label}" not done`
              : `Mark "${label}" done`
            : shown
              ? "Mark not done"
              : "Mark done"
        }
        className="h-5 w-5 rounded-md border-2"
      />
    </span>
  );
}

export interface CompletionColumnOptions<TData extends RowData> {
  /** Boolean field on the row. Default `"done"`. */
  field?: string;
  /** Persist the new value for one row. */
  onToggle: (row: TData, next: boolean) => void | Promise<unknown>;
  onToggleError?: (error: unknown, row: TData) => void;
  /** Accessible name for a row. Default: the row's `title` or `name`. */
  label?: (row: TData) => string | undefined;
  /** Per-row disable — e.g. a filtered list where the write would be invisible. */
  disabled?: (row: TData) => boolean;
  /** Column id. Default: `field`. */
  id?: string;
  header?: string;
  size?: number;
}

/**
 * The same cell as a column definition, for tables that draw columns rather
 * than cards. Pass it through `ColumnGenerator`'s `custom_columns`.
 *
 * `meta.card.slot` is left alone deliberately: a card layout that wants the
 * tick beside the title should say so, and cards more often render the
 * `CompletionCell` directly inside their own bespoke row.
 */
export function completionColumn<TData extends RowData>({
  field = "done",
  onToggle,
  onToggleError,
  label,
  disabled,
  id,
  header = "",
  size = 44,
}: CompletionColumnOptions<TData>): ColumnDef<TData, unknown> {
  return {
    id: id ?? field,
    accessorKey: field,
    header: () => <span className="sr-only">{header || "Done"}</span>,
    size,
    enableSorting: true,
    cell: ({ row }) => {
      const original = row.original as TData;
      const named =
        label?.(original) ??
        (original as Record<string, unknown>).title ??
        (original as Record<string, unknown>).name;
      return (
        <CompletionCell
          checked={Boolean((original as Record<string, unknown>)[field])}
          disabled={disabled?.(original) ?? false}
          label={typeof named === "string" ? named : undefined}
          onToggle={(next) => onToggle(original, next)}
          onToggleError={(error) => onToggleError?.(error, original)}
        />
      );
    },
  };
}
