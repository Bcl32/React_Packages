import { baseFieldName } from "./BuildFilterCatalog";
import { humanizeFieldName } from "./utils";
import type {
  DatasetStats,
  FilterInitialValue,
  FilterOption,
  Filters,
  ModelAttribute,
  NumberRange,
} from "./types";

/**
 * Schema-driven filter search: turn a typed query ("PLA", "weight > 200",
 * "material: petg") into ranked, appliable filter suggestions.
 *
 * Three pure pieces, mirroring the catalog/create/apply split the dynamic
 * filters already use:
 *   BuildFilterSearchIndex — model attributes + dataset stats → searchable index
 *   SearchFilterIndex      — index + query → scored FilterSuggestion[]
 *   ApplyFilterSuggestion  — suggestion → change_filters / add_filter calls
 *
 * The index is value-first: every enumerable value (options lists, tag/colour
 * pools, distinct string values) knows which field owns it, so a bare "PLA"
 * resolves to "BaseMaterial: PLA" without any syntax from the user.
 */

export type SearchFieldKind = "number" | "datetime" | "string" | "boolean" | "options";

export interface SearchValueEntry {
  value: string;
  label: string;
  /** Rows in the full dataset carrying this value, when stats know it. */
  count?: number;
}

export interface SearchFieldEntry {
  field: string;
  title: string;
  /** Extra names this field answers to (schema `searchAliases` passthrough). */
  aliases: string[];
  kind: SearchFieldKind;
  /** Enumerable values for value-first matching; empty for number/datetime. */
  values: SearchValueEntry[];
  /** Live data bounds, kind-specific — shown as the suggestion detail. */
  min?: number;
  max?: number;
  earliest?: string;
  latest?: string;
}

export type FilterSearchAction =
  | { type: "options-value"; field: string; value: string }
  | { type: "string-value"; field: string; value: string }
  | { type: "number-range"; field: string; min?: number; max?: number }
  | { type: "add-field"; field: string };

export interface FilterSuggestion {
  field: string;
  /** Primary display text, e.g. `BaseMaterial: PLA` or `Weight (g) > 200`. */
  label: string;
  /** Muted right-hand hint: row count, or what applying will do. */
  detail?: string;
  score: number;
  action: FilterSearchAction;
  /** The canonical full query that expresses this suggestion, when the typed
   * text is a prefix of it — drives the inline ghost-text autocomplete. */
  completion?: string;
}

interface GroupCountLike {
  name: string;
  length: number;
}

/** Values longer than this can't be a useful chip/suggestion (textarea junk). */
const MAX_VALUE_LENGTH = 60;
/** Bound per-field index size so huge free-text columns stay cheap. */
const MAX_VALUES_PER_FIELD = 300;

/** The kind a filterable attribute searches as — mirrors CreateFilter's type
 * resolution (declared filter_type, else the data type, else options). */
function searchFieldKind(item: ModelAttribute): SearchFieldKind | null {
  if (!item || !item["filter"]) return null;
  if (item["type"] === "boolean") return "boolean";
  const declared = item["filter_type"] as string | undefined;
  const type = declared ?? (item["type"] as string);
  if (type === "number" || type === "datetime" || type === "string") return type;
  return "options";
}

function statValue(stats: DatasetStats, field: string, name: string): unknown {
  return stats?.[field]?.find((s) => s.name === name)?.value;
}

/** Distinct-value groups from CalculateFeatureStats, keyed for count lookups. */
function countGroups(stats: DatasetStats, field: string): GroupCountLike[] {
  const raw = statValue(stats, field, "count");
  return Array.isArray(raw)
    ? (raw as GroupCountLike[]).filter((g) => g && typeof g.name === "string")
    : [];
}

function toValueEntries(
  options: FilterOption[] | undefined,
  groups: GroupCountLike[],
  optionsStat: unknown,
): SearchValueEntry[] {
  const counts = new Map(groups.map((g) => [g.name, g.length]));

  // Enriched schema options are canonical when present: they carry the label
  // mapping for id-backed fields (systems) where the raw value is an id.
  if (Array.isArray(options) && options.length > 0) {
    return options.map((o) => ({
      value: String(o.value),
      label: String(o.label ?? o.value),
      count: counts.get(String(o.value)) ?? counts.get(String(o.label)),
    }));
  }

  // list/colour attributes publish an "options" stat (the distinct value pool).
  if (Array.isArray(optionsStat) && optionsStat.length > 0) {
    return (optionsStat as unknown[]).map((v) => ({
      value: String(v),
      label: String(v),
      count: counts.get(String(v)),
    }));
  }

  // string/select attributes only have grouped counts.
  return groups.map((g) => ({ value: g.name, label: g.name, count: g.length }));
}

/**
 * Build the search index for one entity. Fields with nothing to filter on
 * (no stats, degenerate ranges, zero distinct values) are left out entirely —
 * same philosophy as the picker's hidden "unavailable" section.
 */
export function BuildFilterSearchIndex(
  model_attributes: ModelAttribute[],
  datasetStats: DatasetStats,
): SearchFieldEntry[] {
  if (!Array.isArray(model_attributes)) return [];
  const index: SearchFieldEntry[] = [];

  for (const item of model_attributes) {
    const kind = searchFieldKind(item);
    if (!kind) continue;

    const field = item["name"];
    const rawAliases = item["searchAliases"];
    const base: Omit<SearchFieldEntry, "values"> = {
      field,
      title: (item["title"] as string) ?? humanizeFieldName(field),
      aliases: Array.isArray(rawAliases) ? rawAliases.map(String) : [],
      kind,
    };

    if (kind === "number") {
      const min = statValue(datasetStats, field, "min");
      const max = statValue(datasetStats, field, "max");
      if (typeof min !== "number" || typeof max !== "number" || min === max) continue;
      index.push({ ...base, values: [], min, max });
      continue;
    }

    if (kind === "datetime") {
      const earliest = statValue(datasetStats, field, "earliest");
      const latest = statValue(datasetStats, field, "latest");
      if (!earliest || !latest || earliest === latest) continue;
      index.push({
        ...base,
        values: [],
        earliest: String(earliest),
        latest: String(latest),
      });
      continue;
    }

    if (kind === "boolean") {
      // The Yes/No list is baked into the attribute's options by the schema.
      index.push({
        ...base,
        values: toValueEntries(item["options"] as FilterOption[] | undefined, [], undefined),
      });
      continue;
    }

    const groups = countGroups(datasetStats, field);

    if (kind === "string") {
      // Zero distinct values = column never populated; no count stat at all
      // (textareas) still supports a useful contains-search, so keep the field.
      const hasCountStat = statValue(datasetStats, field, "count") !== undefined;
      if (hasCountStat && groups.length === 0) continue;
      const values = groups
        .filter((g) => g.name.length <= MAX_VALUE_LENGTH)
        .slice(0, MAX_VALUES_PER_FIELD)
        .map((g) => ({ value: g.name, label: g.name, count: g.length }));
      index.push({ ...base, values });
      continue;
    }

    // options
    const values = toValueEntries(
      item["options"] as FilterOption[] | undefined,
      groups,
      statValue(datasetStats, field, "options"),
    ).filter((v) => v.label.length <= MAX_VALUE_LENGTH);
    if (values.length === 0) continue;
    index.push({ ...base, values: values.slice(0, MAX_VALUES_PER_FIELD) });
  }

  return index;
}

const normalize = (s: string) => s.toLowerCase().replace(/[_\s]+/g, " ").trim();

/** 3 = exact, 2 = prefix, 1 = substring, 0 = no match. */
function matchScore(candidate: string, query: string): number {
  if (candidate === query) return 3;
  if (candidate.startsWith(query)) return 2;
  if (candidate.includes(query)) return 1;
  return 0;
}

function fieldMatchScore(entry: SearchFieldEntry, query: string): number {
  let best = 0;
  for (const name of [entry.title, entry.field, ...entry.aliases]) {
    best = Math.max(best, matchScore(normalize(name), query));
    if (best === 3) break;
  }
  return best;
}

const KIND_DETAIL: Record<SearchFieldKind, string> = {
  number: "numeric range",
  datetime: "date range",
  string: "text search",
  boolean: "yes / no",
  options: "options",
};

/** Compact bound formatting — "41.2M", "0.08", "838". */
function formatBound(value: number): string {
  if (!isFinite(value)) return "—";
  const magnitude = Math.abs(value);
  if (magnitude >= 10000) {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  if (magnitude >= 100 || Number.isInteger(value)) return String(Math.round(value));
  return String(+value.toPrecision(3));
}

/** The live-data summary for a field-level suggestion ("12 – 511", "8 values"). */
function fieldDetail(entry: SearchFieldEntry): string {
  if (entry.kind === "number" && entry.min !== undefined && entry.max !== undefined) {
    return `${formatBound(entry.min)} – ${formatBound(entry.max)}`;
  }
  if (entry.kind === "datetime" && entry.earliest && entry.latest) {
    return `${entry.earliest.slice(0, 10)} – ${entry.latest.slice(0, 10)}`;
  }
  if (entry.kind === "boolean") return KIND_DETAIL.boolean;
  if (entry.values.length > 0) {
    return `${entry.values.length} value${entry.values.length === 1 ? "" : "s"}`;
  }
  return KIND_DETAIL[entry.kind];
}

/** Small boost so enum-style hits outrank free-text hits at equal match. */
const KIND_BOOST: Record<SearchFieldKind, number> = {
  options: 10,
  boolean: 8,
  string: 5,
  number: 0,
  datetime: 0,
};

function countDetail(count: number | undefined): string | undefined {
  return typeof count === "number" ? `${count} in data` : undefined;
}

interface SearchOptions {
  filters: Filters;
  /** Whether unmounted fields can be instantiated (addFilter is wired). */
  canAdd: boolean;
  maxResults?: number;
}

/** The filter-map keys' resolved data columns — what's already on screen. */
function mountedFields(filters: Filters): Set<string> {
  const mounted = new Set<string>();
  for (const key of Object.keys(filters ?? {})) {
    mounted.add(filters[key]?.field ?? baseFieldName(key));
  }
  return mounted;
}

const COMPARISON_RE = /^(.+?)\s*(>=|<=|>|<|==?|:)\s*(.+)$/;
/** A comparison the user is still typing — field and operator, no value yet. */
const PARTIAL_COMPARISON_RE = /^(.+?)\s*(>=|<=|>|<|==?|:)\s*$/;
const RANGE_RE = /^(.+?)\s+(-?\d+(?:\.\d+)?)\s*(?:-|–|\bto\b)\s*(-?\d+(?:\.\d+)?)$/;

/** Starter ordering when the box is focused but empty. */
const STARTER_SCORE: Record<SearchFieldKind, number> = {
  options: 50,
  boolean: 40,
  string: 30,
  number: 20,
  datetime: 10,
};

function comparisonLabel(op: string): string {
  if (op === "=" || op === "==" || op === ":") return "=";
  return op;
}

/**
 * Rank the index against a query. Three passes share one result pool:
 * structured comparisons ("weight > 200", "material: pla"), explicit numeric
 * ranges ("weight 100-200"), and the bare value/field scan. Duplicates (same
 * resulting action) keep their best score.
 */
export function SearchFilterIndex(
  index: SearchFieldEntry[],
  rawQuery: string,
  { filters, canAdd, maxResults = 8 }: SearchOptions,
): FilterSuggestion[] {
  const query = normalize(rawQuery);
  const mounted = mountedFields(filters);
  const usable = (entry: SearchFieldEntry) => mounted.has(entry.field) || canAdd;
  const pool: FilterSuggestion[] = [];

  // Empty box, focused: offer every filterable field as a starting point so
  // the vocabulary is discoverable without typing anything.
  if (!query) {
    return index
      .filter(usable)
      .map((entry) => ({
        field: entry.field,
        label: `Filter by ${entry.title}`,
        detail: fieldDetail(entry),
        score: STARTER_SCORE[entry.kind],
        action: { type: "add-field", field: entry.field } as FilterSearchAction,
      }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, maxResults);
  }

  // "material:" / "weight >" — the value is still being typed. Enumerate the
  // field's values as ready-to-apply completions; for range kinds fall back to
  // a field suggestion whose detail shows the live bounds to type against.
  const partial = PARTIAL_COMPARISON_RE.exec(query);
  if (partial) {
    const fieldPart = partial[1].trim();
    const rawPrefix = rawQuery.trimEnd();
    for (const entry of index) {
      const fieldScore = fieldMatchScore(entry, fieldPart);
      if (fieldScore === 0 || !usable(entry)) continue;

      if (entry.values.length > 0) {
        for (const v of entry.values) {
          pool.push({
            field: entry.field,
            label: `${entry.title}: ${v.label}`,
            detail: countDetail(v.count) ?? KIND_DETAIL[entry.kind],
            score:
              70 +
              fieldScore * 3 +
              Math.min(5, Math.log2(1 + (v.count ?? 0))),
            action:
              entry.kind === "string"
                ? { type: "string-value", field: entry.field, value: v.value }
                : { type: "options-value", field: entry.field, value: v.value },
            completion: `${rawPrefix} ${v.label}`,
          });
        }
        continue;
      }

      pool.push({
        field: entry.field,
        label: `Filter by ${entry.title}`,
        detail: fieldDetail(entry),
        score: 60 + fieldScore * 3,
        action: { type: "add-field", field: entry.field },
      });
    }
  }

  const comparison = partial ? null : COMPARISON_RE.exec(query);
  if (comparison) {
    const [, fieldPart, op, valuePart] = comparison;
    // The user's casing for free-text application — re-parse the raw query,
    // since `valuePart` went through normalization.
    const rawValue = COMPARISON_RE.exec(rawQuery.trim())?.[3]?.trim() ?? valuePart.trim();
    for (const entry of index) {
      const fieldScore = fieldMatchScore(entry, fieldPart.trim());
      if (fieldScore === 0 || !usable(entry)) continue;

      if (entry.kind === "number") {
        const num = Number(valuePart);
        if (!isFinite(num) || valuePart.trim() === "") continue;
        const range =
          op === ">" || op === ">="
            ? { min: num }
            : op === "<" || op === "<="
              ? { max: num }
              : { min: num, max: num };
        pool.push({
          field: entry.field,
          label: `${entry.title} ${comparisonLabel(op)} ${num}`,
          detail: KIND_DETAIL.number,
          score: 90 + fieldScore * 3,
          action: { type: "number-range", field: entry.field, ...range },
        });
        continue;
      }

      if (op !== ":" && op !== "=" && op !== "==") continue;

      if (entry.kind === "options" || entry.kind === "boolean") {
        const typedEnd = rawQuery.trimEnd();
        for (const v of entry.values) {
          const valueScore = Math.max(
            matchScore(normalize(v.label), valuePart.trim()),
            matchScore(normalize(v.value), valuePart.trim()),
          );
          if (valueScore === 0) continue;
          const completes =
            rawValue.length > 0 &&
            v.label.toLowerCase().startsWith(rawValue.toLowerCase()) &&
            typedEnd.toLowerCase().endsWith(rawValue.toLowerCase());
          pool.push({
            field: entry.field,
            label: `${entry.title}: ${v.label}`,
            detail: countDetail(v.count) ?? KIND_DETAIL[entry.kind],
            score: 85 + valueScore * 5 + fieldScore * 3,
            action: { type: "options-value", field: entry.field, value: v.value },
            completion: completes
              ? typedEnd.slice(0, typedEnd.length - rawValue.length) + v.label
              : undefined,
          });
        }
        continue;
      }

      if (entry.kind === "string") {
        // Free text: apply whatever the user typed, preserving their casing.
        pool.push({
          field: entry.field,
          label: `${entry.title} contains "${rawValue}"`,
          detail: KIND_DETAIL.string,
          score: 80 + fieldScore * 3,
          action: { type: "string-value", field: entry.field, value: rawValue },
        });
      }
    }
  }

  const range = RANGE_RE.exec(query);
  if (range) {
    const [, fieldPart, lo, hi] = range;
    const min = Math.min(Number(lo), Number(hi));
    const max = Math.max(Number(lo), Number(hi));
    for (const entry of index) {
      if (entry.kind !== "number") continue;
      const fieldScore = fieldMatchScore(entry, fieldPart.trim());
      if (fieldScore === 0 || !usable(entry)) continue;
      pool.push({
        field: entry.field,
        label: `${entry.title}: ${min} – ${max}`,
        detail: KIND_DETAIL.number,
        score: 90 + fieldScore * 3,
        action: { type: "number-range", field: entry.field, min, max },
      });
    }
  }

  // Bare scan: values first (the "PLA" case), then field names.
  for (const entry of index) {
    if (!usable(entry)) continue;

    for (const v of entry.values) {
      const valueScore = Math.max(
        matchScore(normalize(v.label), query),
        matchScore(normalize(v.value), query),
      );
      if (valueScore === 0) continue;
      const popularity = Math.min(5, Math.log2(1 + (v.count ?? 0)));
      pool.push({
        field: entry.field,
        label: `${entry.title}: ${v.label}`,
        detail: countDetail(v.count) ?? KIND_DETAIL[entry.kind],
        score: valueScore * 20 + KIND_BOOST[entry.kind] + popularity,
        action:
          entry.kind === "string"
            ? { type: "string-value", field: entry.field, value: v.value }
            : { type: "options-value", field: entry.field, value: v.value },
        completion: v.label.toLowerCase().startsWith(rawQuery.trim().toLowerCase())
          ? v.label
          : undefined,
      });
    }

    const fieldScore = fieldMatchScore(entry, query);
    if (fieldScore > 0) {
      pool.push({
        field: entry.field,
        label: `Filter by ${entry.title}`,
        detail: fieldDetail(entry),
        score: fieldScore * 10,
        action: { type: "add-field", field: entry.field },
      });
    }
  }

  // Dedupe on the resulting action, keeping the best-scored variant.
  const best = new Map<string, FilterSuggestion>();
  for (const s of pool) {
    const key = JSON.stringify(s.action);
    const prev = best.get(key);
    if (!prev || s.score > prev.score) best.set(key, s);
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, maxResults);
}

export interface ApplySuggestionContext {
  filters: Filters;
  change_filters: (name: string, key: string, value: unknown) => void;
  add_filter?: (field: string, initial?: FilterInitialValue) => string | null;
}

/** The filter-map key currently backed by `field`, if one is mounted. */
function mountedKeyFor(field: string, filters: Filters): string | null {
  for (const key of Object.keys(filters ?? {})) {
    if ((filters[key]?.field ?? baseFieldName(key)) === field) return key;
  }
  return null;
}

/**
 * Apply a suggestion to live filter state. Mounted filters are updated through
 * change_filters (options values union in; number ranges merge with the
 * current bounds); unmounted fields are instantiated via add_filter with the
 * parsed value as the seed. Returns the affected filter key, or null when the
 * action needed add_filter and it isn't wired / declined.
 */
export function ApplyFilterSuggestion(
  suggestion: FilterSuggestion,
  { filters, change_filters, add_filter }: ApplySuggestionContext,
): string | null {
  const action = suggestion.action;
  const key = mountedKeyFor(action.field, filters);

  switch (action.type) {
    case "options-value": {
      if (key) {
        const current = (filters[key].value as string[]) ?? [];
        if (!current.includes(action.value)) {
          change_filters(key, "value", [...current, action.value]);
        }
        return key;
      }
      return add_filter?.(action.field, [action.value]) ?? null;
    }

    case "string-value": {
      if (key) {
        change_filters(key, "value", action.value);
        return key;
      }
      return add_filter?.(action.field, action.value) ?? null;
    }

    case "number-range": {
      if (key) {
        const current = filters[key].value as NumberRange;
        change_filters(key, "value", {
          min: action.min ?? current.min,
          max: action.max ?? current.max,
        });
        return key;
      }
      const seed: Partial<NumberRange> = {};
      if (action.min !== undefined) seed.min = action.min;
      if (action.max !== undefined) seed.max = action.max;
      return add_filter?.(action.field, seed) ?? null;
    }

    case "add-field":
      return key ?? add_filter?.(action.field) ?? null;
  }
}
