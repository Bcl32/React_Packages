import type React from "react";

/**
 * A consumer-declared action on a DataTable.
 *
 * The toolbar renders it as a bulk action over the current row selection. Set
 * `card` and the same declaration *also* renders as a per-card affordance in
 * the card view's footer, so a "Claim" or "Add to plate" button doesn't have to
 * be hand-built as a cell renderer as well.
 */
export interface ToolbarAction<TData = unknown> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Bulk handler. Also the card handler (called with `[row.id]`) unless
   *  `onCardClick` is given. */
  onClick: (selectedIds: string[]) => void;
  visible?: boolean;
  variant?: "default" | "outline" | "ghost" | "grey" | "red" | "blue" | "danger";
  disabled?: boolean;

  /**
   * Card view: render this action in every card's footer. `"icon"` is
   * icon-only (with the label as its tooltip), `"full"` is icon + label.
   *
   * The card affordance deliberately ignores `visible` / `disabled`: those are
   * near-always derived from the selection ("enabled once something is
   * ticked"), which says nothing about whether the action applies to the one
   * row a card represents. Use `cardVisible` / `cardDisabled` for that.
   *
   * That independence also makes `{ visible: false, card: "full" }` the way to
   * declare a card-only action — one that never made sense as a bulk operation.
   */
  card?: "icon" | "full";
  /** Card label, when the toolbar's would read wrong on a single row — the
   *  common case being a bulk label carrying a selection count ("Move (3)"). */
  cardLabel?: string;
  cardVisible?: (row: TData) => boolean;
  cardDisabled?: (row: TData) => boolean;
  /** Card handler when the action needs the row itself, not just its id. */
  onCardClick?: (row: TData) => void;
}
