import React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import type { RowData } from "@bcl32/data-utils";

/**
 * Who-did-what columns, without this package knowing what a user is.
 *
 * `created_by` / `updated_by` are opaque ids on the row (`@bcl32/data-utils`
 * `RowData`). Turning one into a name needs a directory, which lives in
 * `@bcl32/account` — a package `@bcl32/datatable` must not depend on (it would
 * drag identity fetching into every table in the fleet, and invert the
 * dependency tier). So the app injects a **render prop** through context:
 *
 * ```jsx
 * <AttributionProvider renderUser={(id) => <UserBadge userId={id} />}>
 * ```
 *
 * With no provider the renderer is `null` and the columns are never added —
 * every existing app renders byte-identically.
 */
export type AttributionRenderer = (userId: string) => React.ReactNode;

const AttributionContext = React.createContext<AttributionRenderer | null>(null);

export interface AttributionProviderProps {
  /** Given a `users.id`, return the node to draw in the cell. */
  renderUser: AttributionRenderer;
  children: React.ReactNode;
}

export function AttributionProvider({ renderUser, children }: AttributionProviderProps) {
  return (
    <AttributionContext.Provider value={renderUser}>{children}</AttributionContext.Provider>
  );
}

/**
 * The attribution renderer, or `null` when no provider is mounted.
 *
 * A real hook — call it from a component body only. `ColumnGenerator` is a
 * plain factory that consumers routinely call from inside `useMemo`, so it
 * cannot call this; `DataTable` calls it instead and threads the result
 * through {@link withAttributionColumns}.
 */
export function useAttributionRenderer(): AttributionRenderer | null {
  return React.useContext(AttributionContext);
}

/** The two column ids this module owns. */
export const ATTRIBUTION_COLUMN_IDS = ["created_by", "updated_by"] as const;

export type AttributionColumnId = (typeof ATTRIBUTION_COLUMN_IDS)[number];

const ATTRIBUTION_LABELS: Record<AttributionColumnId, string> = {
  created_by: "Created by",
  updated_by: "Updated by",
};

/** The timestamp column each attribution column sits beside. */
const ANCHOR_FOR: Record<AttributionColumnId, string> = {
  created_by: "time_created",
  updated_by: "time_updated",
};

function columnIdOf(column: ColumnDef<never, unknown>): string | undefined {
  const def = column as { id?: string; accessorKey?: string };
  return def.id ?? def.accessorKey;
}

/**
 * Build one attribution column. Not sortable: the cell shows a name but the
 * value is a UUID, so a sort would order by something nobody can see.
 */
export function attributionColumn<TData extends RowData>(
  id: AttributionColumnId,
  renderUser: AttributionRenderer
): ColumnDef<TData, unknown> {
  const label = ATTRIBUTION_LABELS[id];
  return {
    id,
    accessorFn: (row: TData) => (row as RowData)[id] as unknown,
    enableSorting: false,
    size: 170,
    header: () => <span>{label}</span>,
    meta: { card: { slot: "footer", label } },
    cell: (info) => {
      const value = info.getValue() as string | null | undefined;
      // Rows written before the attribution migration have no value — a dash,
      // not an empty cell, so the column reads as "unknown" rather than broken.
      if (!value) return <span className="text-muted-foreground">—</span>;
      return <>{renderUser(String(value))}</>;
    },
  };
}

/**
 * Insert `created_by` after `time_created` and `updated_by` after
 * `time_updated`, when a renderer exists.
 *
 * Returns the **same array reference** when there is nothing to do, so a
 * consumer's `useMemo` identity survives and no table re-renders because of
 * this seam. Idempotent: a column list that already carries either id is left
 * alone, which is what lets `ColumnGenerator`'s explicit `renderUser` and
 * `DataTable`'s context path coexist without doubling the columns.
 */
export function withAttributionColumns<TData extends RowData>(
  columns: ColumnDef<TData, unknown>[],
  renderUser: AttributionRenderer | null | undefined
): ColumnDef<TData, unknown>[] {
  if (!renderUser) return columns;

  const ids = new Set<string>();
  for (const column of columns) {
    const id = columnIdOf(column as ColumnDef<never, unknown>);
    if (id) ids.add(id);
  }
  if (ATTRIBUTION_COLUMN_IDS.some((id) => ids.has(id))) return columns;

  const anchors = ATTRIBUTION_COLUMN_IDS.filter((id) => ids.has(ANCHOR_FOR[id]));
  if (anchors.length === 0) return columns;

  const out: ColumnDef<TData, unknown>[] = [];
  for (const column of columns) {
    out.push(column);
    const id = columnIdOf(column as ColumnDef<never, unknown>);
    for (const attributionId of anchors) {
      if (ANCHOR_FOR[attributionId] === id) {
        out.push(attributionColumn<TData>(attributionId, renderUser));
      }
    }
  }
  return out;
}
