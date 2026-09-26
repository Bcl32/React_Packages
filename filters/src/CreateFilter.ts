import { emptyFor, resolveFilterKind } from "./BuildFilterCatalog";
import type {
  ModelAttribute,
  DatasetStats,
  FilterValue,
  NumberRange,
  DatetimeFilterValue,
} from "./types";

const OPTIONS_FIELDS = [
  "options",
  "selection",
  "display",
  "value_key",
  "label_key",
  "colour_presets",
] as const;

/** Displays a boolean filter can take; anything else draws the default. */
const BOOLEAN_DISPLAYS = new Set(["segmented", "checkbox"]);

/**
 * Builds one FilterValue from a model attribute plus the dataset stats.
 *
 * Extracted from InitializeFilters so the exact same construction serves both
 * paths: the eager pass at mount (schema-declared filters) and add_filter at
 * runtime (a user picking an attribute out of the catalog). Bounds always come
 * from the full-dataset stats, which CalculateFeatureStats computes for every
 * attribute regardless of whether a filter for it exists yet.
 *
 * Returns null when the attribute isn't filterable or its stats aren't ready.
 */
export function CreateFilter(
  item: ModelAttribute,
  datasetStats: DatasetStats,
): FilterValue | null {
  const kind = resolveFilterKind(item);
  if (!kind) return null;

  const title = item["name"];
  const stats = datasetStats?.[title];
  if (!stats) return null;

  const resolvedType = kind;
  // Hand-written attributes may leave filter_empty out (B3). A boolean's empty
  // value is always null: metadata that still describes booleans as options
  // filters carries [] here.
  const empty =
    resolvedType === "boolean" ? null : (item["filter_empty"] ?? emptyFor(resolvedType));

  // value and filter_empty are cloned because the filter mutates them; the
  // attribute is shared by reference because nothing writes to it.
  const filter: FilterValue = {
    type: resolvedType,
    value: structuredClone(empty),
    rule: resolvedType === "boolean" ? undefined : item["filter_rule"],
    filter_empty: structuredClone(empty),
    field: title,
    attr: item,
  };

  const mutable = filter as unknown as Record<string, unknown>;

  // cell_shape drives array-aware matching (options always; number when the
  // field is a scalar-array, e.g. number_list per-axis units). Copy it here so
  // ApplyFilters sees it for number filters too, not just options.
  if (item["cell_shape"] !== undefined) {
    mutable["cell_shape"] = item["cell_shape"];
  }

  // Carry the schema title so the filter components can render it (they fall
  // back to a humanized field name when absent).
  if (item["title"] !== undefined) {
    mutable["title"] = item["title"];
  }

  if (resolvedType === "options") {
    for (const field of OPTIONS_FIELDS) {
      if (item[field] !== undefined) {
        mutable[field] = item[field];
      }
    }
  }

  if (resolvedType === "boolean") {
    // Old metadata gives booleans display "toggle-buttons"; only the boolean
    // controls are kept, so it falls back to the segmented default.
    if (BOOLEAN_DISPLAYS.has(item["display"] as string)) mutable["display"] = item["display"];
    if (typeof item["checkedValue"] === "boolean") mutable["checkedValue"] = item["checkedValue"];
    if (typeof item["checkedLabel"] === "string") mutable["checkedLabel"] = item["checkedLabel"];
    if (item["nullable"] === true) mutable["nullable"] = true;
  }

  if (item["primaryFilter"]) {
    mutable["primaryFilter"] = true;
  }

  if (item["filterOrder"] !== undefined) {
    mutable["filterOrder"] = item["filterOrder"];
  }

  if (resolvedType === "number") {
    // Covers both scalar numbers (item.type "number") and number_list arrays —
    // both resolve to a range slider whose bounds are the dataset min/max.
    const min = stats.find((obj) => obj.name === "min")?.["value"] as number;
    const max = stats.find((obj) => obj.name === "max")?.["value"] as number;

    const filterEmpty = filter["filter_empty"] as NumberRange;
    const filterValue = filter["value"] as NumberRange;

    filterEmpty["min"] = min;
    filterValue["min"] = min;

    filterEmpty["max"] = max;
    filterValue["max"] = max;

    // Carry the distribution so the slider can draw a histogram over its own
    // domain. d3's binner has always run for numeric columns; the result was
    // computed and discarded until now.
    const bins = stats.find((obj) => obj.name === "bins")?.["value"];
    if (Array.isArray(bins) && bins.length > 1) {
      const cleaned = bins
        .map((raw) => {
          const b = raw as { x0?: unknown; x1?: unknown; count?: unknown };
          return {
            x0: Number(b.x0),
            x1: Number(b.x1),
            count: Number(b.count) || 0,
          };
        })
        .filter((b) => isFinite(b.x0) && isFinite(b.x1) && b.x1 > b.x0);

      if (cleaned.length > 1) {
        mutable["histogram"] = cleaned;
      }
    }
  }

  // Keyed on the resolved type, not item.type: a date field declared as a
  // datetime filter needs its bounds, and a datetime field declared as a string
  // filter must not have timespan keys written onto its "" value (B9).
  if (resolvedType === "datetime") {
    const earliest = stats.find((obj) => obj.name === "earliest")?.["value"] as string | undefined;
    const latest = stats.find((obj) => obj.name === "latest")?.["value"] as string | undefined;

    // CalculateFeatureStats only measures item.type "datetime". Without bounds,
    // keep the authored placeholder rather than writing undefined.
    if (earliest != null && latest != null) {
      const filterEmpty = filter["filter_empty"] as DatetimeFilterValue;
      const filterValue = filter["value"] as DatetimeFilterValue;

      filterEmpty["timespan_begin"] = earliest;
      filterValue["timespan_begin"] = earliest;

      filterEmpty["timespan_end"] = latest;
      filterValue["timespan_end"] = latest;
    }
  }

  return filter;
}
