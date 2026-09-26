import { parseBooleanValue } from "./predicates";
import type { FilterValue } from "./types";

/**
 * The shared click logic of the interactive bar and pie charts, as pure
 * functions so it can be tested without rendering recharts.
 *
 * Internal to the package: not re-exported from the barrel.
 */

/** The categories the filter currently selects; empty when it's inactive. */
export function chartSelection(filter: FilterValue | undefined): string[] {
  if (!filter) return [];
  if (JSON.stringify(filter.value) === JSON.stringify(filter.filter_empty)) return [];
  return Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)];
}

/**
 * The value a click on category `value` writes. Clicking the active category
 * resets the filter. An options filter selects just that value, and a boolean
 * filter reads the category as true / false (anything else, such as an empty
 * cell's category, as "unknown"). Any other type gets the bare string
 * (chartClick.test.ts pins this, including for number filters, where the
 * string is not a valid range).
 */
export function chartClickValue(
  filter: FilterValue,
  value: string,
  selected: string[],
): unknown {
  if (selected.includes(value)) return structuredClone(filter.filter_empty);
  if (filter.type === "options") return [value];
  if (filter.type === "boolean") return parseBooleanValue(value) ?? "unknown";
  return value;
}
