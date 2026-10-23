import { ApplyFilters } from "./ApplyFilters";
import { baseFieldName } from "./BuildFilterCatalog";
import { GetActiveFilters } from "./GetActiveFilters";
import { extractRowValues, matchesSubOption, rowInParent, type Row } from "./predicates";
import type {
  FilterValue,
  Filters,
  SubFilterOption,
  SubFilterParent,
  SubFilterParentOption,
  SubFilterSpec,
} from "./types";

/**
 * Sub-filters live in the same Filters map as everything else, keyed
 * `<parentKey>><value>` ("systems>7cf4…"), so chips, ApplyFilters and the
 * filter bar handle them with no special casing. Each is an ordinary options
 * filter with a `parent` link; the options predicate sees the link and scopes
 * the test to the parent value's rows (predicates.ts).
 *
 * `>` and not `#`: `#` marks a user-added instance ("weight_g#2") and
 * baseFieldName would read the parent's field back out of it. A sub-filter's
 * `field` is its own key, which matches no attribute, so it never picks up the
 * parent's option sizes or icons, never gets its options overwritten by
 * syncEnrichedAttributes, and stays out of the Add-filter catalog.
 */
export function subFilterKey(parentKey: string, token: string): string {
  return `${parentKey}>${token}`;
}

/**
 * Bring the sub-filters in line with their parents: one per selected value of
 * every parent that has a spec, none for a value no longer selected (its
 * choices go with it). Options are rebuilt on every pass, so they follow late
 * parent options and new rows; a kept sub-filter keeps the choices that still
 * exist. Each sub-filter is placed straight after its parent in the map.
 *
 * Without specs the map is returned untouched.
 */
export function reconcileSubFilters(
  filters: Filters,
  specs: Record<string, SubFilterSpec> | undefined,
  rows: Row[],
): Filters {
  if (!specs || Object.keys(specs).length === 0) return filters;
  const next: Filters = {};
  for (const key of Object.keys(filters)) {
    const filter = filters[key];
    if (filter.parent) continue; // rebuilt below, after its parent
    next[key] = filter;
    const spec = specs[filter.field ?? baseFieldName(key)];
    if (!spec || filter.type !== "options") continue;
    const selected = Array.isArray(filter.value) ? (filter.value as unknown[]).map(String) : [];
    for (const token of selected) {
      const childKey = subFilterKey(key, token);
      const child = buildSubFilter(key, filter, token, spec, rows, filters[childKey]);
      if (child) next[childKey] = child;
    }
  }
  return next;
}

function buildSubFilter(
  parentKey: string,
  parentFilter: FilterValue,
  token: string,
  spec: SubFilterSpec,
  rows: Row[],
  existing: FilterValue | undefined,
): FilterValue | null {
  const parentOption = findParentOption(parentFilter, token);
  const parent: SubFilterParent = {
    key: parentKey,
    column: parentFilter.field ?? baseFieldName(parentKey),
    cell_shape: parentFilter.cell_shape,
    value_key: parentFilter.value_key,
    token,
  };

  let options = spec.options?.(parentOption) ?? null;
  let derived = false;
  if (options == null && spec.derive) {
    options = deriveOptions(rows, parent, spec.derive.field);
    derived = true;
  }
  if (!options || options.length === 0) return null;

  const values = new Set(options.map((o) => o.value));
  const kept = Array.isArray(existing?.value)
    ? (existing!.value as string[]).filter((v) => values.has(v))
    : [];

  return {
    type: "options",
    value: kept,
    filter_empty: [],
    rule: "any",
    options,
    subOptions: options,
    cell_shape: "scalar",
    selection: "multi",
    display: "toggle-buttons",
    field: subFilterKey(parentKey, token),
    title: spec.title?.(parentOption, { derived }) ?? parentOption.label,
    parent,
    optionSize: spec.size,
    primaryFilter: parentFilter.primaryFilter ?? false,
    dynamic: false,
  };
}

/** The parent's option for `token` as fetched (it may carry extra fields, like a system's kind). */
function findParentOption(parentFilter: FilterValue, token: string): SubFilterParentOption {
  const found = (parentFilter.options ?? []).find((o) => String(o.value) === token);
  return (found as SubFilterParentOption | undefined) ?? { value: token, label: token };
}

/** One option per distinct value of `field` among the parent value's rows, most common first. */
function deriveOptions(rows: Row[], parent: SubFilterParent, field: string): SubFilterOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!rowInParent(row, parent)) continue;
    const raw = row?.[field];
    for (const v of extractRowValues(raw, Array.isArray(raw) ? "scalar-array" : "scalar", "value")) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => ({ value: v, label: v, match: { field, anyOf: [v] } }));
}

/**
 * Put a count on every sub-filter option: the rows it would leave under every
 * OTHER active filter (its own choices excluded, so picking Connectors doesn't
 * zero out Supports). An option with nothing to show is disabled, unless it is
 * already chosen, which must stay clickable to undo. Derived for display; the
 * stored filters are left alone.
 */
export function withSubFilterCounts(rows: Row[], filters: Filters): Filters {
  const childKeys = Object.keys(filters).filter((k) => filters[k].parent);
  if (childKeys.length === 0) return filters;
  const active = GetActiveFilters(filters);
  const next: Filters = { ...filters };
  for (const key of childKeys) {
    const child = filters[key];
    const rest: Filters = { ...active };
    delete rest[key];
    const inParent = ApplyFilters(rows, rest).filter((r) => rowInParent(r, child.parent!));
    const all = child.subOptions ?? [];
    const selected = Array.isArray(child.value) ? (child.value as string[]) : [];
    next[key] = {
      ...child,
      options: all.map((o) => {
        const count = inParent.filter((r) => matchesSubOption(r, o, all)).length;
        return { ...o, count, disabled: count === 0 && !selected.includes(o.value) };
      }),
    };
  }
  return next;
}
