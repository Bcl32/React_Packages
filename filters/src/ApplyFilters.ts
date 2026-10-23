import { predicateFor, subFilterGroupTest, type Row } from "./predicates";
import type { Filters, FilterValue } from "./types";

/**
 * Narrow `data` by every filter in `filters` (AND). Each filter's kind decides
 * how a row matches — see predicates.ts. Rows that aren't objects are always
 * dropped, and a filter of an unknown type is ignored.
 */
export function ApplyFilters(data: unknown[], filters: Filters): Row[] {
  // Always filter out null/undefined entries first
  let filteredData: Row[] = Array.isArray(data)
    ? (data.filter((entry) => entry != null && typeof entry === "object") as Row[])
    : [];

  // Sub-filters are tested per parent, together (see subFilterGroupTest).
  const subFilters = new Map<string, FilterValue[]>();
  for (const key in filters) {
    const filter = filters[key];
    if (filter.parent) {
      const siblings = subFilters.get(filter.parent.key) ?? [];
      siblings.push(filter);
      subFilters.set(filter.parent.key, siblings);
      continue;
    }
    // The map key is the filter's identity, NOT necessarily the data column:
    // user-added instances use a synthetic key ("weight_g#2") and point at the
    // real column through `field`. Schema-declared filters leave field unset,
    // where key and column are the same thing.
    const column = filter["field"] ?? key;
    const test = predicateFor(filter)?.rowTest(filter, column);
    if (test) filteredData = filteredData.filter(test);
  }
  for (const [parentKey, children] of subFilters) {
    const test = subFilterGroupTest(filters[parentKey], children);
    if (test) filteredData = filteredData.filter(test);
  }
  return filteredData;
}
