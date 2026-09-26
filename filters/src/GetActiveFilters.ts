import { predicateFor } from "./predicates";
import type { Filters } from "./types";

/**
 * The filters whose current value narrows anything, as decided per kind by
 * predicates.ts. The returned map holds the same filter objects, not copies.
 * A filter of an unknown type is never active.
 */
export function GetActiveFilters(filters: Filters): Filters {
  const active_filters: Filters = {};

  for (const key in filters) {
    const filter = filters[key];
    if (predicateFor(filter)?.isActive(filter)) {
      active_filters[key] = filter;
    }
  }

  return active_filters;
}
