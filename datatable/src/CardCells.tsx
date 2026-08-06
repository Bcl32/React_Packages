import React from "react";
import type { Cell, Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

import type { RowData } from "@bcl32/data-utils";

import { getCardMeta } from "./ColumnLabels";

/**
 * Splitting a row's visible cells into the regions the card-shaped layouts draw.
 *
 * Shared rather than owned by CardView because three layouts now consume it and
 * they have to agree: the card grid places every slot, the gallery tile takes
 * media + title, and the detail pane's list items take title + badge. The part
 * that must not diverge is which cells are *controls* (select, actions, edit,
 * expander) rather than content — get that wrong in one layout and a column
 * either renders twice or disappears.
 */
export interface PartitionedCells<TData extends RowData> {
  select?: Cell<TData, unknown>;
  actions?: Cell<TData, unknown>;
  edit?: Cell<TData, unknown>;
  expander?: Cell<TData, unknown>;
  media: Cell<TData, unknown>[];
  title: Cell<TData, unknown>[];
  badge: Cell<TData, unknown>[];
  body: Cell<TData, unknown>[];
  footer: Cell<TData, unknown>[];
}

export function partitionCells<TData extends RowData>(
  row: Row<TData>
): PartitionedCells<TData> {
  const parts: PartitionedCells<TData> = {
    media: [],
    title: [],
    badge: [],
    body: [],
    footer: [],
  };
  for (const cell of row.getVisibleCells()) {
    const id = cell.column.id;
    if (id === "select") parts.select = cell;
    else if (id === "actions") parts.actions = cell;
    else if (id === "EditEntry") parts.edit = cell;
    else if (id === "expander") parts.expander = cell;
    else {
      const slot = getCardMeta(cell.column)?.slot ?? "body";
      parts[slot].push(cell);
    }
  }
  // Unannotated tables still need a readable card: promote the first field to
  // the title position when nothing claims it.
  if (parts.title.length === 0 && parts.body.length > 0) {
    parts.title.push(parts.body.shift() as Cell<TData, unknown>);
  }
  return parts;
}

export function renderCell<TData extends RowData>(
  cell: Cell<TData, unknown>
): React.ReactNode {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}
