import React from "react";
import {
  Table2,
  LayoutGrid,
  Images,
  PanelRight,
  SquareKanban,
  LayoutDashboard,
} from "lucide-react";

import type { RowData } from "@bcl32/data-utils";

import { DATA_TABLE_VIEWS } from "./CardView";
import type {
  DataTableView,
  DataTableViewDef,
  DataTableViewOption,
} from "./CardView";

/**
 * Normalising what a consumer passed as `views` into the one shape everything
 * downstream reads.
 *
 * The five built-in layouts and a consumer's own declarations used to be
 * different kinds of thing — one a closed union with an exhaustive icon table,
 * the other impossible. They are the same thing here: a built-in name resolves
 * to a def whose `key` and `base` are both that name, so `views={["table",
 * "cards"]}` produces exactly the toggle it always did, and a stored `"cards"`
 * still finds its view. Everything after this point in `DataTable` reads defs
 * and never a bare layout name.
 */

/** Icon and wording per built-in layout — the defaults a declaration inherits
 *  when it doesn't supply its own. Kept beside the normaliser rather than in
 *  the toolbar because normalisation is what needs them; the toolbar is handed
 *  finished defs. */
export const VIEW_TOGGLE_DEFAULTS: Record<
  DataTableView,
  { icon: React.ReactNode; label: string }
> = {
  table: { icon: <Table2 size={16} />, label: "Table view" },
  cards: { icon: <LayoutGrid size={16} />, label: "Card view" },
  gallery: { icon: <Images size={16} />, label: "Gallery view" },
  detail: { icon: <PanelRight size={16} />, label: "Detail pane view" },
  board: { icon: <SquareKanban size={16} />, label: "Board view" },
  sections: { icon: <LayoutDashboard size={16} />, label: "Grouped sections view" },
};

function isBuiltInView(value: unknown): value is DataTableView {
  return (
    typeof value === "string" && (DATA_TABLE_VIEWS as readonly string[]).includes(value)
  );
}

/** One option — a built-in name or a declaration — as a complete def. */
export function toViewDef<TData extends RowData>(
  option: DataTableViewOption<TData>
): DataTableViewDef<TData> {
  if (isBuiltInView(option)) {
    return { key: option, base: option, ...VIEW_TOGGLE_DEFAULTS[option] };
  }
  const defaults = VIEW_TOGGLE_DEFAULTS[option.base];
  return {
    ...option,
    // A declaration that names no icon still gets one: an unlabelled hole in a
    // segmented control is worse than a duplicate glyph, and "the same icon as
    // the layout it is a variant of" is the honest default.
    icon: option.icon ?? defaults?.icon,
    label: option.label || defaults?.label || option.key,
  };
}

/**
 * The full list a table offers, deduplicated by key.
 *
 * Duplicate keys are dropped rather than tolerated because `key` is what gets
 * persisted and what `find` resolves against — two entries sharing one would
 * make the stored preference mean whichever came first, which is a bug that
 * only shows up as "the toggle jumps back".
 */
export function resolveViewDefs<TData extends RowData>(
  options: DataTableViewOption<TData>[]
): DataTableViewDef<TData>[] {
  const seen = new Set<string>();
  const out: DataTableViewDef<TData>[] = [];
  for (const option of options) {
    const def = toViewDef(option);
    if (seen.has(def.key)) continue;
    seen.add(def.key);
    out.push(def);
  }
  return out;
}
