import type {
  DatetimeFilterValue,
  FilterInitialValue,
  FilterValue,
  NumberRange,
} from "./types";

/**
 * Write an opening value into a freshly built filter (addFilter's `initial`).
 * Mutates and returns `filter`; it must be a new object from CreateFilter,
 * whose value is already a private clone.
 *
 * Each type takes only the part of `initial` it understands:
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

  if (filter.type === "number") {
    const seed = initial as Partial<NumberRange>;
    const value = filter.value as NumberRange;
    if (typeof seed.min === "number") value.min = seed.min;
    if (typeof seed.max === "number") value.max = seed.max;
  }

  if (filter.type === "string" && typeof initial === "string") {
    filter.value = initial;
  }

  if (filter.type === "options" && Array.isArray(initial)) {
    filter.value = [...initial];
  }

  if (filter.type === "datetime") {
    const seed = initial as Partial<DatetimeFilterValue>;
    const value = filter.value as DatetimeFilterValue;
    if (seed.timespan_begin) value.timespan_begin = seed.timespan_begin;
    if (seed.timespan_end) value.timespan_end = seed.timespan_end;
  }

  return filter;
}
