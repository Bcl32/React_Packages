import React from "react";
import type { Column } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

import { fieldLabel } from "@bcl32/forms/fieldLabel";
import type { ModelData, RowData } from "@bcl32/data-utils";

/**
 * Turning a column into a human label.
 *
 * Shared rather than card-specific: the card body labels its fields, and the
 * sort control — which serves both layouts — has to name the same columns in a
 * dropdown. Both want the same precedence, so it lives in one place.
 */

/** Column ids injected by ColumnGenerator. They are controls rather than
 *  fields: the card view gives them fixed positions instead of labelling them,
 *  and the sort control excludes them (you can't sort by a checkbox). */
export const CONTROL_COLUMN_IDS: ReadonlySet<string> = new Set([
  "select",
  "expander",
  "EditEntry",
  "actions",
]);

export interface CardMeta {
  /** Card region for this column's cell. Default: "body". */
  slot?: CardSlot;
  /** Field label override (body slot). Also used by the sort dropdown. */
  label?: string;
  /** Body slot only: suppress the label when the value is self-describing. */
  hideLabel?: boolean;
}

/** The card regions a column's cell can land in. */
export type CardSlot = "media" | "title" | "badge" | "body" | "footer";

/**
 * Column id → slot, overriding whatever that column declared for itself.
 *
 * A column's `meta.card.slot` is a property of the column, so a table gets one
 * card shape out of it. A view supplying these gets its own — same columns,
 * different arrangement — which is what lets a second card layout be declared
 * rather than written.
 */
export type CardSlotOverrides = Record<string, CardSlot>;

export function getCardMeta(column: { columnDef: { meta?: unknown } }): CardMeta | undefined {
  return (column.columnDef.meta as { card?: CardMeta } | undefined)?.card;
}

export function humanizeId(id: string): string {
  const spaced = id.replace(/_/g, " ");
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : id;
}

/**
 * Plain-string label for a column: meta.card.label → the matching ModelData
 * attribute's title (via fieldLabel) → humanized column id. Used by the sort
 * dropdown, where only text works.
 */
export function columnLabelText<TData extends RowData>(
  column: Column<TData, unknown>,
  ModelData: ModelData
): string {
  const meta = getCardMeta(column);
  if (meta?.label) return meta.label;
  const attr = ModelData.model_attributes?.find((a) => a.name === column.id);
  if (attr) return fieldLabel(attr);
  return humanizeId(column.id);
}

/**
 * ReactNode label for a card body field. Same precedence as columnLabelText,
 * but when neither meta.card.label nor a ModelData attribute exists, prefers
 * rendering the column's header (every header in the apps is a () => <span>
 * that ignores its context) before falling back to the humanized id.
 */
export function columnCardLabel<TData extends RowData>(
  column: Column<TData, unknown>,
  ModelData: ModelData
): React.ReactNode {
  const meta = getCardMeta(column);
  if (meta?.label) return meta.label;
  const attr = ModelData.model_attributes?.find((a) => a.name === column.id);
  if (attr) return fieldLabel(attr);
  const header = column.columnDef.header;
  if (typeof header === "string") return header;
  if (typeof header === "function") {
    return flexRender(header, { column } as never);
  }
  return humanizeId(column.id);
}
