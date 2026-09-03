import { humanizeFieldName } from "./utils";
import type {
  DatasetStats,
  FilterCatalogEntry,
  Filters,
  ModelAttribute,
} from "./types";

/** Separator between a field name and its instance ordinal ("weight_g#2"). */
const INSTANCE_SEPARATOR = "#";

/** Filter kinds that support add-on-demand instances. */
export type DynamicFilterKind =
  | "number"
  | "datetime"
  | "string"
  | "boolean"
  | "options";

/** The filter kind an attribute renders as, or null when it isn't filterable. */
export function dynamicFilterKind(item: ModelAttribute): DynamicFilterKind | null {
  if (!item || !item["filter"]) return null;
  // Booleans filter as options (a baked-in Yes/No list) but are their own kind
  // here: the value list is fixed rather than derived from the data, so they get
  // their own picker section. Checked before filter_type, which reads "options"
  // for them.
  if (item["type"] === "boolean") return "boolean";

  // Mirrors CreateFilter's `resolvedType` exactly: a declared filter_type wins,
  // and anything that isn't one of the three scalar kinds is an options filter.
  // Resolving it the same way here is what keeps the catalog and the filter it
  // creates from disagreeing — an attribute typed "select" with no filter_type
  // builds an options filter, so it must be catalogued as one too.
  const declared = item["filter_type"] as string | undefined;
  const type = declared ?? (item["type"] as string);
  if (type === "number" || type === "datetime" || type === "string") return type;
  return "options";
}

/** True when the attribute renders as a numeric range filter. */
export function isNumericFilterAttribute(item: ModelAttribute): boolean {
  return dynamicFilterKind(item) === "number";
}

/** True when the attribute renders as a datetime range filter. */
export function isDatetimeFilterAttribute(item: ModelAttribute): boolean {
  return dynamicFilterKind(item) === "datetime";
}

/** True when the attribute renders as a free-text filter. */
export function isStringFilterAttribute(item: ModelAttribute): boolean {
  return dynamicFilterKind(item) === "string";
}

/** True when the attribute renders as a Yes/No toggle. */
export function isBooleanFilterAttribute(item: ModelAttribute): boolean {
  return dynamicFilterKind(item) === "boolean";
}

/**
 * Filters that are collapsed into the add-on-demand pool.
 *
 * Policy A: anything flagged primaryFilter keeps its always-visible slot (it
 * renders in the Main tab); every other filter of these kinds is created on
 * demand.
 */
export function isDynamicFilterAttribute(
  item: ModelAttribute,
  kinds: DynamicFilterKind[] = ["number", "datetime", "string", "boolean", "options"],
): boolean {
  const kind = dynamicFilterKind(item);
  return !!kind && kinds.includes(kind) && !item["primaryFilter"];
}

/** The data column behind a filter key ("weight_g#2" → "weight_g"). */
export function baseFieldName(key: string): string {
  const at = key.indexOf(INSTANCE_SEPARATOR);
  return at === -1 ? key : key.slice(0, at);
}

/**
 * A key that doesn't collide with an existing filter. The first instance of a
 * field uses the bare field name so it stays byte-identical to the eager
 * (schema-declared) shape; duplicates get "#2", "#3", …
 */
export function makeInstanceKey(field: string, filters: Filters): string {
  if (!filters[field]) return field;
  let n = 2;
  while (filters[`${field}${INSTANCE_SEPARATOR}${n}`]) n++;
  return `${field}${INSTANCE_SEPARATOR}${n}`;
}

/** Bars shown in a picker row's sparkline. More than this reads as noise. */
const MAX_SPARKLINE_BARS = 14;
/** Most-common values previewed for a text attribute. */
const MAX_TOP_VALUES = 3;

/**
 * Bin counts for a numeric attribute's sparkline.
 *
 * CalculateFeatureStats already runs d3's binner for every numeric column and
 * stores the result as a `bins` stat, which nothing was reading. Wide bin sets
 * get folded down so the bars stay legible in a 12px-tall strip.
 */
function sparkline(stats: DatasetStats[string] | undefined): number[] | undefined {
  const bins = stats?.find((s) => s.name === "bins")?.value;
  if (!Array.isArray(bins) || bins.length < 2) return undefined;

  const counts = bins.map((b) => Number((b as { count?: number }).count) || 0);
  if (counts.every((c) => c === 0)) return undefined;
  if (counts.length <= MAX_SPARKLINE_BARS) return counts;

  // Fold neighbouring bins together rather than dropping the tail.
  const size = Math.ceil(counts.length / MAX_SPARKLINE_BARS);
  const folded: number[] = [];
  for (let i = 0; i < counts.length; i += size) {
    folded.push(counts.slice(i, i + size).reduce((a, b) => a + b, 0));
  }
  return folded;
}

/** The most common values of a text attribute, already sorted desc by count. */
function topValues(
  stats: DatasetStats[string] | undefined,
): { value: string; count: number }[] | undefined {
  const counts = stats?.find((s) => s.name === "count")?.value;
  if (!Array.isArray(counts) || counts.length === 0) return undefined;
  return counts
    .slice(0, MAX_TOP_VALUES)
    .map((c) => ({
      value: String((c as { name?: unknown }).name ?? ""),
      count: Number((c as { length?: number }).length) || 0,
    }))
    .filter((c) => c.value !== "");
}

/** Catalog entries of one kind — what a given tab's picker should offer. */
export function catalogForKind(
  catalog: FilterCatalogEntry[] | undefined,
  kind: DynamicFilterKind,
): FilterCatalogEntry[] {
  return (catalog ?? []).filter((entry) => entry.type === kind);
}

/**
 * The attributes offered by the "+ Add filter" pickers, each annotated with its
 * live data range so the user can see what's worth filtering before committing
 * to a slot. Ranges are free: CalculateFeatureStats already computes min/max
 * (and earliest/latest) for every model attribute, filtered or not.
 */
export function BuildFilterCatalog(
  model_attributes: ModelAttribute[],
  datasetStats: DatasetStats,
  filters: Filters,
): FilterCatalogEntry[] {
  if (!Array.isArray(model_attributes)) return [];
  // Before the dataset lands there is no shape to describe, and every entry
  // would claim to be available while CreateFilter still refuses to build one
  // (it needs the stats for bounds). An empty catalog is the honest answer, and
  // gives callers a single "ready" transition to react to.
  if (!datasetStats || Object.keys(datasetStats).length === 0) return [];

  const usedCounts = new Map<string, number>();
  for (const key of Object.keys(filters ?? {})) {
    const field = filters[key]?.field ?? baseFieldName(key);
    usedCounts.set(field, (usedCounts.get(field) ?? 0) + 1);
  }

  const catalog: FilterCatalogEntry[] = [];

  for (const item of model_attributes) {
    // null now means "not filterable at all" — every filterable attribute
    // resolves to a kind, options included.
    const kind = dynamicFilterKind(item);
    if (!kind) continue;

    const stats = datasetStats?.[item["name"]];
    const base = {
      field: item["name"],
      title: (item["title"] as string) ?? humanizeFieldName(item["name"]),
      type: kind as FilterCatalogEntry["type"],
      usedCount: usedCounts.get(item["name"]) ?? 0,
    };

    if (kind === "number") {
      const min = stats?.find((s) => s.name === "min")?.value as number | undefined;
      const max = stats?.find((s) => s.name === "max")?.value as number | undefined;
      const hasStats = typeof min === "number" && typeof max === "number";
      // min === max means every row shares one value (usually all-null coerced
      // to 0): a slider over it can't exclude anything, so offer it greyed out
      // rather than letting the user add a dead control.
      const degenerate = hasStats && min === max;

      catalog.push({
        ...base,
        min: hasStats ? min : undefined,
        max: hasStats ? max : undefined,
        histogram: degenerate ? undefined : sparkline(stats),
        disabled: !hasStats || degenerate,
        reason: !hasStats ? "no stats" : degenerate ? "no data" : undefined,
      });
      continue;
    }

    if (kind === "boolean") {
      // Nothing to measure: the value list is a fixed Yes/No pair, and the
      // column is a computed flag that always has a value. CalculateFeatureStats
      // has no boolean branch, so there are no counts to show either.
      catalog.push({ ...base, disabled: false });
      continue;
    }

    if (kind === "options") {
      // Two possible measures of "is there anything here?": the values the data
      // actually holds, and the vocabulary the schema declares. Prefer the data
      // — an enum can declare a dozen statuses none of which any row uses — and
      // fall back to the declared list for array-valued columns (tags), which
      // CalculateFeatureStats does not group.
      const counts = stats?.find((s) => s.name === "count")?.value;
      const declared = Array.isArray(item["options"])
        ? (item["options"] as unknown[]).length
        : undefined;
      const distinct = Array.isArray(counts) ? counts.length : declared;

      catalog.push({
        ...base,
        distinct,
        topValues: topValues(stats),
        disabled: distinct === 0,
        reason: distinct === 0 ? "no data" : undefined,
      });
      continue;
    }

    if (kind === "string") {
      // CalculateFeatureStats groups string columns into distinct non-null
      // values, which doubles as the "is there anything to search here?"
      // signal. Textareas get no grouped stats at all — those stay enabled
      // (a contains-search over descriptions is perfectly useful), they just
      // have no count to show.
      const counts = stats?.find((s) => s.name === "count")?.value;
      const distinct = Array.isArray(counts) ? counts.length : undefined;

      catalog.push({
        ...base,
        distinct,
        topValues: topValues(stats),
        disabled: distinct === 0,
        reason: distinct === 0 ? "no data" : undefined,
      });
      continue;
    }

    const earliest = stats?.find((s) => s.name === "earliest")?.value as string | undefined;
    const latest = stats?.find((s) => s.name === "latest")?.value as string | undefined;
    const hasStats = !!earliest && !!latest;
    // ComputeTimeBounds returns [now, now] for a column with no non-null
    // values, so identical bounds is the datetime equivalent of "no data".
    const degenerate = hasStats && earliest === latest;

    catalog.push({
      ...base,
      earliest: hasStats ? earliest : undefined,
      latest: hasStats ? latest : undefined,
      disabled: !hasStats || degenerate,
      reason: !hasStats ? "no stats" : degenerate ? "no data" : undefined,
    });
  }

  return catalog;
}
