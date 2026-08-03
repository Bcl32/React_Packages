import type {
  ModelAttribute,
  DatasetStats,
  FilterValue,
  NumberRange,
  DatetimeFilterValue,
} from "./types";

const OPTIONS_FIELDS = [
  "options",
  "source_kind",
  "selection",
  "display",
  "value_key",
  "label_key",
  "colour_presets",
] as const;

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
  if (!item || !item["filter"]) return null;

  const title = item["name"];
  const stats = datasetStats?.[title];
  if (!stats) return null;

  const declaredFilterType = item["filter_type"] as FilterValue["type"] | undefined;
  const dataType = item["type"] as string;
  const resolvedType: FilterValue["type"] =
    declaredFilterType ??
    (dataType === "string" || dataType === "number" || dataType === "datetime"
      ? dataType
      : "options");

  const filter: FilterValue = {
    type: resolvedType,
    value: structuredClone(item["filter_empty"]),
    rule: item["filter_rule"],
    filter_empty: structuredClone(item["filter_empty"]),
    field: title,
  };

  const mutable = filter as unknown as Record<string, unknown>;

  // source_kind drives array-aware matching (options always; number when the
  // field is a scalar-array, e.g. number_list per-axis units). Copy it here so
  // ApplyFilters sees it for number filters too, not just options.
  if (item["source_kind"] !== undefined) {
    mutable["source_kind"] = item["source_kind"];
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

  if (item["type"] === "datetime") {
    const earliest = stats.find((obj) => obj.name === "earliest")?.["value"] as string;
    const latest = stats.find((obj) => obj.name === "latest")?.["value"] as string;

    const filterEmpty = filter["filter_empty"] as DatetimeFilterValue;
    const filterValue = filter["value"] as DatetimeFilterValue;

    filterEmpty["timespan_begin"] = earliest;
    filterValue["timespan_begin"] = earliest;

    filterEmpty["timespan_end"] = latest;
    filterValue["timespan_end"] = latest;
  }

  return filter;
}
