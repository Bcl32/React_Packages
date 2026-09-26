import { baseFieldName, makeInstanceKey } from "./BuildFilterCatalog";
import { CreateFilter } from "./CreateFilter";
import { predicateFor } from "./predicates";
import { seedFilter } from "./seedFilter";
import type {
  DatasetStats,
  FilterInitialValue,
  Filters,
  FilterValue,
  ModelAttribute,
} from "./types";

/**
 * The two ways app code writes a value into filter state, as pure functions
 * over the Filters map. useEntityFilters wraps them (the `initialValues` option
 * and `setFilterValue`). Values always go through the kind's `seed`, so app
 * code gets the same checks as addFilter: a number filter takes only numeric
 * bounds, and an empty datetime end is ignored instead of becoming an invalid
 * date that matches no rows.
 *
 * Internal to the package: not re-exported from the barrel.
 */

/** A filter created on the app's behalf sorts with the pinned ones. */
function pinned(filter: FilterValue): FilterValue {
  return { ...filter, dynamic: false, primaryFilter: true };
}

/** `filter` with its value reset to empty, then seeded with `value`. */
function withValue(filter: FilterValue, value: FilterInitialValue): FilterValue {
  const next = { ...filter, value: structuredClone(filter.filter_empty) };
  // The predicate's seed directly, not seedFilter: seedFilter skips a falsy
  // value, and "" is how a string filter is cleared.
  predicateFor(next)?.seed(next, value);
  return next;
}

/**
 * Apply a page's opening values to freshly initialized filters. A field whose
 * filter exists is seeded; a filterable field whose filter doesn't exist yet
 * (add-on-demand) is created pinned, unless the value would leave it inactive.
 * Unknown or non-filterable fields are ignored. Returns a new map.
 */
export function applyInitialValues(
  filters: Filters,
  initialValues: Record<string, FilterInitialValue> | undefined,
  attributes: ModelAttribute[],
  datasetStats: DatasetStats,
): Filters {
  if (!initialValues) return filters;
  const next: Filters = { ...filters };
  for (const [field, value] of Object.entries(initialValues)) {
    if (value === undefined) continue;
    if (next[field]) {
      next[field] = withValue(next[field], value);
      continue;
    }
    const attr = attributes.find((a) => a.name === field);
    const built = attr ? CreateFilter(attr, datasetStats) : null;
    if (!built) continue;
    const seeded = seedFilter(built, value);
    if (predicateFor(seeded)?.isActive(seeded)) next[field] = pinned(seeded);
  }
  return next;
}

/**
 * Set filter `key` to `value`, creating it (pinned) when it doesn't exist.
 * Returns the new map and the key written, or `prev` itself and null when
 * nothing changed (an unknown field, or clearing a filter that isn't there).
 */
export function setFilterValueIn(
  prev: Filters,
  key: string,
  value: FilterInitialValue,
  attributes: ModelAttribute[],
  datasetStats: DatasetStats,
): { filters: Filters; key: string | null } {
  const current = prev[key];
  if (current) {
    return { filters: { ...prev, [key]: withValue(current, value) }, key };
  }
  // Absent: create it from its column. A synthetic key ("tags#2") names its
  // column before the "#".
  const field = baseFieldName(key);
  const attr = attributes.find((a) => a.name === field);
  const built = attr ? CreateFilter(attr, datasetStats) : null;
  if (!built) return { filters: prev, key: null };
  const seeded = withValue(built, value);
  // Clearing a filter that isn't there is a no-op: nothing is constraining
  // the rows already.
  if (!predicateFor(seeded)?.isActive(seeded)) return { filters: prev, key: null };
  const newKey = makeInstanceKey(field, prev);
  return { filters: { ...prev, [newKey]: pinned(seeded) }, key: newKey };
}
