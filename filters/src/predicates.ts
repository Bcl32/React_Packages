import type {
  BooleanFilterValue,
  DatetimeFilterValue,
  FilterInitialValue,
  FilterKind,
  FilterValue,
  NumberRange,
} from "./types";
import { NONE_VALUE } from "./useEntityGroups";

/**
 * What each kind of filter means, in one table instead of a switch per
 * consumer. A predicate answers four questions about a filter of its kind:
 *
 *   empty    — the "no filter" value (what filter_empty defaults to)
 *   isActive — does the current value narrow anything?
 *   rowTest  — a test for one row, or null to leave the rows untouched
 *   seed     — write an opening value into a freshly built filter
 *
 * Keyed by FilterKind, which is also the filter's runtime type. Lookups go
 * through predicateFor.
 *
 * rowTest keeps each kind's own rules, including the ones that look like
 * quirks: an empty string or options filter skips, but number and datetime
 * filters always test, dropping empty cells. ApplyFilters is only ever handed
 * active filters (ProcessDataset and app code run GetActiveFilters first), so
 * the difference only shows for callers that pass idle filters directly.
 *
 * Internal to the package: not re-exported from the barrel.
 */
export interface Predicate {
  empty(): unknown;
  isActive(filter: FilterValue): boolean;
  rowTest(filter: FilterValue, column: string): ((row: Row) => boolean) | null;
  seed(filter: FilterValue, initial: FilterInitialValue): void;
}

export type Row = Record<string, unknown>;

function extractRowValues(
  raw: unknown,
  cell_shape: string | undefined,
  value_key: string,
): string[] {
  switch (cell_shape) {
    case "object-array":
      return Array.isArray(raw)
        ? raw
            .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>)[value_key] : undefined))
            .filter((v) => v != null)
            .map(String)
        : [];
    case "scalar-array":
      return Array.isArray(raw) ? raw.filter((v) => v != null).map(String) : [];
    case "scalar":
    default:
      return raw == null ? [] : [String(raw)];
  }
}

/** A colour token, as opposed to an identity token (an id never starts with #). */
const isColourToken = (v: string) => v.startsWith("#");

/** `#RRGGBB` and `#RRGGBBAA` denote the same colour; compare them as one key. */
function normHex(v: string): string {
  const h = v.replace("#", "").toUpperCase();
  return h.length === 6 ? `${h}FF` : h;
}

/** Compare timestamps NaN-safely: two unparseable values count as equal. */
function timeKey(v: string): number | "invalid" {
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? "invalid" : t;
}

const stringPredicate: Predicate = {
  empty: () => "",
  isActive: (f) => f.value !== f.filter_empty,
  rowTest(f, column) {
    const needle = ((f.value as string) ?? "").toLowerCase();
    if (!needle) return null;
    // A filter with no rule used to be active but match everything; it now
    // means "contains", the rule the generator emits for text.
    if ((f.rule ?? "contains") === "equals") {
      return (row) => {
        const cell = row?.[column];
        return typeof cell === "string" && cell.toLowerCase() === needle;
      };
    }
    if ((f.rule ?? "contains") === "contains") {
      return (row) => {
        const cell = row?.[column];
        return typeof cell === "string" && cell.toLowerCase().includes(needle);
      };
    }
    return null;
  },
  seed(f, initial) {
    if (typeof initial === "string") f.value = initial;
  },
};

const numberPredicate: Predicate = {
  empty: () => ({ min: "", max: "" }),
  isActive(f) {
    const v = f.value as NumberRange;
    const e = f.filter_empty as NumberRange;
    return v.min !== e.min || v.max !== e.max;
  },
  rowTest(f, column) {
    const { min, max } = f.value as NumberRange;
    const isArray = f.cell_shape === "scalar-array";
    return (row) => {
      const raw = row?.[column];
      if (raw == null) return false;
      if (isArray) {
        // scalar-array (e.g. per-axis units): match when ANY element is in
        // range — the "any axis" semantics as a slider.
        if (!Array.isArray(raw)) return false;
        return raw.some((v) => {
          const n = typeof v === "number" ? v : Number(v);
          return isFinite(n) && n >= min && n <= max;
        });
      }
      const n = typeof raw === "number" ? raw : Number(raw);
      return isFinite(n) && n >= min && n <= max;
    };
  },
  seed(f, initial) {
    const seed = initial as Partial<NumberRange>;
    const value = f.value as NumberRange;
    if (typeof seed.min === "number") value.min = seed.min;
    if (typeof seed.max === "number") value.max = seed.max;
  },
};

const optionsPredicate: Predicate = {
  empty: () => [],
  isActive: (f) => (f.value as string[]).length !== 0,
  rowTest(f, column) {
    const selected = (f.value as string[]) ?? [];
    if (selected.length === 0) return null;
    const value_key = f.value_key ?? "value";
    const rule = f.rule ?? "any";
    // With `match_field` set, a selection is the option's id rather than its
    // colour: several presets can share one hex, so a colour match would
    // return all of them. Colour tokens are still honoured — the custom colour
    // input and a board/group lane drill-in both produce one — and match the
    // filter's own column as before.
    const matchField = f.colour_presets?.match_field;
    return (row) => {
      const rowValues = extractRowValues(row?.[column], f.cell_shape, value_key);
      const rowHexes = rowValues.map(normHex);
      const rowIds = matchField
        ? extractRowValues(row?.[matchField], "scalar-array", value_key)
        : [];
      const hit = (token: string) =>
        // "No project": the choice that matches an EMPTY cell. A null FK yields
        // no row values at all, so without this no selection could ever reach
        // those rows. Same token as the grouping's "Untagged" lane, so a lane
        // drill-in and a filter mean the same rows.
        token === NONE_VALUE
          ? rowValues.length === 0
          : matchField && !isColourToken(token)
          ? rowIds.includes(token)
          : isColourToken(token)
            ? rowHexes.includes(normHex(token))
            : rowValues.includes(token);
      if (rule === "equals") return selected.length === 1 && hit(selected[0]);
      if (rule === "all") return selected.every(hit);
      return selected.some(hit);
    };
  },
  seed(f, initial) {
    if (Array.isArray(initial)) f.value = [...initial];
  },
};

const datetimePredicate: Predicate = {
  empty: () => ({ timespan_begin: "", timespan_end: "" }),
  isActive(f) {
    const v = f.value as DatetimeFilterValue;
    const e = f.filter_empty as DatetimeFilterValue;
    return (
      timeKey(v.timespan_begin) !== timeKey(e.timespan_begin) ||
      timeKey(v.timespan_end) !== timeKey(e.timespan_end)
    );
  },
  rowTest(f, column) {
    const { timespan_begin, timespan_end } = f.value as DatetimeFilterValue;
    const begin = new Date(timespan_begin).getTime();
    const end = new Date(timespan_end).getTime();
    return (row) => {
      const cell = row?.[column];
      if (!row || !cell) return false;
      const time = new Date(cell as string).getTime();
      return time >= begin && time <= end;
    };
  },
  seed(f, initial) {
    const seed = initial as Partial<DatetimeFilterValue>;
    const value = f.value as DatetimeFilterValue;
    // An empty end is ignored, so the filter keeps its data bound rather than
    // comparing against an invalid date.
    if (seed.timespan_begin) value.timespan_begin = seed.timespan_begin;
    if (seed.timespan_end) value.timespan_end = seed.timespan_end;
  },
};

/**
 * A boolean filter value from a token: true / false / "unknown" themselves,
 * their string spellings (a chart category, a search value, a group lane),
 * or a one-element array of either (a drill-in written for options filters).
 * Anything else is undefined. The group lane for an empty cell ("_none")
 * reads as "unknown".
 */
export function parseBooleanValue(token: unknown): BooleanFilterValue | undefined {
  const t = Array.isArray(token) && token.length === 1 ? token[0] : token;
  if (t === true || t === "true") return true;
  if (t === false || t === "false") return false;
  if (t === "unknown" || t === "_none") return "unknown";
  if (t === null) return null;
  return undefined;
}

/** A cell as a boolean; null for an empty or unreadable one. */
function cellBoolean(cell: unknown): boolean | null {
  if (cell === true || cell === "true") return true;
  if (cell === false || cell === "false") return false;
  return null;
}

/**
 * Yes means true and No means false. An empty cell matches neither: it is
 * "unknown", which only a nullable field offers (a NULL there means nobody
 * knows, not no).
 */
const booleanPredicate: Predicate = {
  empty: () => null,
  isActive: (f) => f.value != null,
  rowTest(f, column) {
    const want = f.value as BooleanFilterValue;
    if (want == null) return null;
    if (want === "unknown") return (row) => cellBoolean(row?.[column]) === null;
    return (row) => cellBoolean(row?.[column]) === want;
  },
  seed(f, initial) {
    const value = parseBooleanValue(initial);
    if (value !== undefined) f.value = value;
  },
};

export const PREDICATES: Record<FilterKind, Predicate> = {
  string: stringPredicate,
  number: numberPredicate,
  datetime: datetimePredicate,
  options: optionsPredicate,
  boolean: booleanPredicate,
};

/** The predicate for a filter's runtime type, or undefined for an unknown one. */
export function predicateFor(filter: FilterValue): Predicate | undefined {
  return PREDICATES[filter.type as FilterKind];
}
