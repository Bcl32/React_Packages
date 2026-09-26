import { baseFieldName } from "./BuildFilterCatalog";
import type { Filters, ModelAttribute } from "./types";

/**
 * Bring existing filters up to date with attributes whose option lists arrived
 * after the filters were built (useOptionsEnrichment fetches them).
 *
 * Filters live in state, so unlike the catalog and search index they aren't
 * rebuilt when the attributes change: the user's value and rule must survive.
 * Instead each matching filter gets the new `options` and a pointer to the new
 * attribute object, so `filter.options` and `filter.attr.options` never
 * disagree. Enrichment makes that object as a copy ({...attr, options}), so
 * this swaps a reference and writes to nothing shared.
 *
 * Matches on the resolved column, so instances ("tags#2") are updated too.
 * Returns `prev` itself when nothing changed, so React skips the re-render.
 *
 * Internal to the package: not re-exported from the barrel.
 */
export function syncEnrichedAttributes(
  prev: Filters,
  attributes: ModelAttribute[],
): Filters {
  if (Object.keys(prev).length === 0) return prev;
  let changed = false;
  const next: Filters = { ...prev };
  for (const attr of attributes) {
    const newOptions = attr.options as unknown[] | undefined;
    if (!newOptions || newOptions.length === 0) continue;
    for (const key of Object.keys(next)) {
      const cur = next[key];
      if ((cur.field ?? baseFieldName(key)) !== attr.name) continue;
      // Both have to be checked: enrichment re-spreads an attribute whenever
      // any option list refetches, which can give a new attribute object that
      // holds the same options array.
      if (cur.options === newOptions && cur.attr === attr) continue;
      next[key] = { ...cur, options: newOptions, attr } as typeof cur;
      changed = true;
    }
  }
  return changed ? next : prev;
}
