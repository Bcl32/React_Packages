import type { Row } from "@tanstack/react-table";

import { Button } from "@bcl32/utils/Button";
import type { RowData } from "@bcl32/data-utils";

import type { ToolbarAction } from "./ToolbarAction";

/**
 * Per-row rendering of the toolbar actions that opted in with `card`.
 *
 * Lives beside the cell partitioner rather than inside CardView because the
 * detail pane docks the same actions in its header — the card grid is no longer
 * the only layout with a per-row place to put them.
 */

/** The opted-in actions, filtered to the ones that apply to this row. */
export function applicableCardActions<TData extends RowData>(
  row: Row<TData>,
  actions: ToolbarAction<TData>[] | undefined
): ToolbarAction<TData>[] {
  if (!actions?.length) return [];
  return actions.filter((action) => action.cardVisible?.(row.original) !== false);
}

export function CardQuickActions<TData extends RowData>(props: {
  row: Row<TData>;
  actions: ToolbarAction<TData>[];
}): JSX.Element {
  return (
    <>
      {props.actions.map((action) => {
        const iconOnly = action.card === "icon" && Boolean(action.icon);
        const label = action.cardLabel ?? action.label;
        return (
          <Button
            key={action.key}
            size={iconOnly ? "icon" : "sm"}
            variant={action.variant ?? "outline"}
            disabled={action.cardDisabled?.(props.row.original) ?? false}
            title={label}
            aria-label={iconOnly ? label : undefined}
            onClick={(e) => {
              e.stopPropagation();
              if (action.onCardClick) action.onCardClick(props.row.original);
              // Same handler the toolbar uses, scoped to the one row the card
              // stands for — so a card action needs no separate declaration.
              else action.onClick([props.row.id]);
            }}
          >
            {action.icon}
            {!iconOnly && label}
          </Button>
        );
      })}
    </>
  );
}
