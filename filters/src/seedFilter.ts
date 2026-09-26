import { predicateFor } from "./predicates";
import type { FilterInitialValue, FilterValue } from "./types";

/**
 * Write an opening value into a freshly built filter (addFilter's `initial`).
 * Mutates and returns `filter`; it must be a new object from CreateFilter,
 * whose value is already a private clone.
 *
 * Each kind takes only the part of `initial` it understands (see the `seed`
 * of each predicate in predicates.ts):
 *   number   — a finite min and/or max
 *   string   — a string
 *   options  — an array (the search bar seeding a boolean/options instance)
 *   datetime — a non-empty timespan_begin and/or timespan_end
 * Anything else leaves the filter at its full range.
 *
 * Internal to the package: not re-exported from the barrel.
 */
export function seedFilter(filter: FilterValue, initial?: FilterInitialValue): FilterValue {
  if (!initial) return filter;
  predicateFor(filter)?.seed(filter, initial);
  return filter;
}
