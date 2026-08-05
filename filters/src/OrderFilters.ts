import type { FilterData, Filters } from "./types";

/**
 * Flattens the filter map into the order a single-section filter panel renders.
 *
 * Once numeric/date/text filters are created on demand, splitting them into
 * per-kind tabs mostly produced empty tabs holding a picker. One section reads
 * better, but it needs a deliberate order:
 *
 *   1. pinned (primaryFilter) filters — `name` first, then by declared filterOrder
 *   2. other always-present filters (options chips, colour swatches)
 *   3. user-added instances, in the order they were added
 *
 * Array.prototype.sort is stable, so ranks 2 and 3 keep the insertion order of
 * the underlying object — which for instances is exactly "as added", across
 * kinds. That's why this doesn't reuse GroupFilters: bucketing by type would
 * scatter a numeric and a text filter added back-to-back.
 */

/**
 * The entity's display field. It leads the pinned block on every page that has
 * one, ahead of any declared `filterOrder`.
 *
 * Doing it here rather than by writing `filterOrder: 0` into each entity's
 * registry entry is deliberate: the rule has to hold for pages whose pinned set
 * isn't declared at all but seeded from the table's columns (see
 * useDataTableFilterBar), and for entities added later that nobody remembers to
 * annotate.
 */
const DISPLAY_FIELD = "name";

export function OrderFilters(filters: Filters): FilterData[] {
  if (!filters) return [];

  const entries = Object.keys(filters).map(
    (key) => ({ ...filters[key], name: key } as FilterData),
  );

  const rank = (entry: FilterData): number => {
    if (entry["primaryFilter"]) return 0;
    if (entry["dynamic"]) return 2;
    return 1;
  };

  // A user-added instance has a synthetic key ("weight_g#2") and carries the
  // real column in `field` — those are rank 2 and never reach this comparison,
  // but reading `field` first keeps the check honest either way.
  const isDisplayField = (entry: FilterData): boolean =>
    ((entry["field"] as string | undefined) ?? entry["name"]) === DISPLAY_FIELD;

  return entries.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (rank(a) !== 0) return 0; // stable: keep insertion order

    const byDisplayField = Number(isDisplayField(b)) - Number(isDisplayField(a));
    if (byDisplayField !== 0) return byDisplayField;

    const aOrder = (a["filterOrder"] as number | undefined) ?? Infinity;
    const bOrder = (b["filterOrder"] as number | undefined) ?? Infinity;
    // Both undeclared: subtracting would give NaN, which the engine reads as
    // "equal" only by accident. Say so, and let the stable sort keep insertion
    // order.
    if (aOrder === bOrder) return 0;
    return aOrder - bOrder;
  });
}
