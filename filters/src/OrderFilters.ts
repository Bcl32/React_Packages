import type { FilterData, Filters } from "./types";

/**
 * Flattens the filter map into the order a single-section filter panel renders.
 *
 * Once numeric/date/text filters are created on demand, splitting them into
 * per-kind tabs mostly produced empty tabs holding a picker. One section reads
 * better, but it needs a deliberate order:
 *
 *   1. pinned (primaryFilter) filters, by their declared filterOrder
 *   2. other always-present filters (options chips, colour swatches)
 *   3. user-added instances, in the order they were added
 *
 * Array.prototype.sort is stable, so ranks 2 and 3 keep the insertion order of
 * the underlying object — which for instances is exactly "as added", across
 * kinds. That's why this doesn't reuse GroupFilters: bucketing by type would
 * scatter a numeric and a text filter added back-to-back.
 */
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

  return entries.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (rank(a) !== 0) return 0; // stable: keep insertion order
    const aOrder = (a["filterOrder"] as number | undefined) ?? Infinity;
    const bOrder = (b["filterOrder"] as number | undefined) ?? Infinity;
    return aOrder - bOrder;
  });
}
