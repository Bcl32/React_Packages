import { useMemo, type ReactNode } from "react";
import type { ModelAttribute, ModelData, FilterOption } from "./types";

export interface EntityGroup {
  value: string;
  label: string;
  count: number;
  visual?: ReactNode;
  isNone?: boolean;
}

export type GroupVisualResolver = (
  attr: ModelAttribute,
  value: string,
  sampleRow: Record<string, unknown> | undefined,
) => ReactNode | undefined;

interface UseEntityGroupsOptions {
  resolveVisual?: GroupVisualResolver;
}

export const NONE_VALUE = "_none";
const NONE_LABEL = "Untagged";

export function getGroupableAttrs(modelData: ModelData): ModelAttribute[] {
  return modelData.model_attributes.filter(
    (a) => a.filter === true && (a as ModelAttribute).filter_type === "options",
  );
}

/**
 * Distinct values above which lanes stop reading as lanes and start reading as
 * a spreadsheet. Roughly what fits on screen before the board scrolls further
 * sideways than anyone will follow.
 */
export const MAX_DISCRETE_GROUPS = 12;

/**
 * Rows a lane must average before the grouping is worth offering.
 *
 * An absolute cap alone is not enough: six distinct names across six rows is
 * under any cap and still useless, because a column whose values are as many as
 * its rows is an identifier, not a category. Requiring lanes to hold two rows
 * on average is what separates "grouped by size" from "listed, sideways".
 */
const MIN_ROWS_PER_GROUP = 2;

/**
 * Groupable attributes for a *board*, which tolerates more than the group-cards
 * landing view: `options` attributes as before, plus number and string
 * attributes whose distinct values *in this dataset* are few enough to read as
 * lanes.
 *
 * Deliberately a sibling of `getGroupableAttrs` rather than a widening of it.
 * That function's result is rendered as a `ToggleGroup` by `EntityGroupCards`,
 * so broadening it in place would silently add a dozen buttons to every page
 * with a landing view.
 *
 * Takes rows because cardinality is a property of the data, not of the schema:
 * the same integer column is four lanes on one record and forty on the next,
 * and only the rows know which. Whatever cannot produce at least two lanes is
 * dropped — offering a grouping that collapses to a single "Untagged" column is
 * worse than not offering it, because the picker implies it will do something.
 */
export function getDiscreteGroupableAttrs(
  modelData: ModelData,
  rows: Record<string, unknown>[] | undefined | null,
): ModelAttribute[] {
  const dataset = Array.isArray(rows) ? rows : [];

  return modelData.model_attributes.filter((a) => {
    if (a.filter !== true) return false;
    const attr = a as ModelAttribute;

    const isOptions = attr.filter_type === "options";
    if (!isOptions && attr.filter_type !== "number" && attr.filter_type !== "string") {
      return false;
    }

    // Only genuinely scalar columns get the widened treatment. A number_list
    // such as per-axis lengths is `scalar-array`, and laning it would put one
    // row in three lanes — one per axis — which says nothing about the row.
    // Options attributes are legitimately multi-valued and keep their own kinds.
    const sourceKind = attr.source_kind ?? "scalar";
    if (!isOptions && sourceKind !== "scalar") return false;

    // Declared options are seeded as lanes by useEntityGroups even at zero
    // count — an unused status is a fact worth showing — so they count towards
    // the total independently of what the rows contain.
    const seeded = isOptions && Array.isArray(attr.options) ? attr.options.length : 0;

    const distinct = new Set<string>();
    for (const row of dataset) {
      for (const { value } of rowGroupValues(row, attr)) {
        if (value !== NONE_VALUE) distinct.add(value);
      }
      // Nothing below can bring the count back down, so stop once it is clear
      // this attribute is too fine-grained to lane.
      if (!isOptions && distinct.size > MAX_DISCRETE_GROUPS) return false;
    }

    // Options attributes skip the density rule: their values are a declared
    // vocabulary, so even one row per status is a meaningful board.
    if (!isOptions && distinct.size * MIN_ROWS_PER_GROUP > dataset.length) return false;

    // One lane is the table with extra steps.
    return Math.max(seeded, distinct.size) > 1;
  });
}

interface GroupAccumulator {
  count: number;
  sampleRow?: Record<string, unknown>;
  label?: string;
}

function objectArrayValue(item: unknown, valueKey: string): string | undefined {
  if (item == null || typeof item !== "object") return undefined;
  const v = (item as Record<string, unknown>)[valueKey];
  return v == null ? undefined : String(v);
}

function objectArrayLabel(item: unknown, labelKey: string, fallback: string): string {
  if (item == null || typeof item !== "object") return fallback;
  const v = (item as Record<string, unknown>)[labelKey];
  return v == null ? fallback : String(v);
}

/** A row's membership in one group, plus the label that group should carry when
 *  only the row knows it (object-arrays hold their own labels). */
export interface RowGroupValue {
  value: string;
  label?: string;
}

/**
 * Which group(s) a row belongs to, for one attribute. Several, for the
 * multi-valued kinds: a part in two systems is genuinely in both.
 *
 * Exported because the board layout needs to place each row in a lane, and
 * placing rows with one function while counting them with another is how a
 * header ends up saying "(12)" above nine cards. Both go through here.
 */
export function rowGroupValues(
  row: Record<string, unknown>,
  attr: ModelAttribute,
): RowGroupValue[] {
  const sourceKind = attr.source_kind ?? "scalar";
  const valueKey = (attr.value_key as string) ?? "value";
  const labelKey = (attr.label_key as string) ?? "label";
  const raw = row[attr.name];

  if (sourceKind === "scalar-array") {
    const arr = Array.isArray(raw) ? raw : [];
    if (arr.length === 0) return [{ value: NONE_VALUE }];
    return arr
      .filter((v) => v != null)
      .map((v) => ({ value: String(v) }));
  }

  if (sourceKind === "object-array") {
    const arr = Array.isArray(raw) ? raw : [];
    if (arr.length === 0) return [{ value: NONE_VALUE }];
    const out: RowGroupValue[] = [];
    for (const item of arr) {
      const value = objectArrayValue(item, valueKey);
      if (value == null) continue;
      out.push({ value, label: objectArrayLabel(item, labelKey, value) });
    }
    return out;
  }

  // scalar / enum
  if (raw == null || raw === "") return [{ value: NONE_VALUE }];
  return [{ value: String(raw) }];
}

export function useEntityGroups(
  dataset: Record<string, unknown>[] | undefined | null,
  modelData: ModelData,
  attrName: string,
  options: UseEntityGroupsOptions = {},
): { groups: EntityGroup[]; attr: ModelAttribute | null } {
  const { resolveVisual } = options;

  const attr = useMemo<ModelAttribute | null>(() => {
    return modelData.model_attributes.find((a) => a.name === attrName) ?? null;
  }, [modelData.model_attributes, attrName]);

  const groups = useMemo<EntityGroup[]>(() => {
    if (!attr) return [];
    const rows = Array.isArray(dataset) ? dataset : [];

    const sourceKind = (attr as ModelAttribute).source_kind ?? "scalar";

    const buckets = new Map<string, GroupAccumulator>();
    const seed = (value: string, label?: string) => {
      if (!buckets.has(value)) buckets.set(value, { count: 0, label });
    };

    // Seed enum buckets up-front so zero-count options still appear.
    if (sourceKind === "scalar" && Array.isArray(attr.options)) {
      for (const opt of attr.options as FilterOption[]) {
        seed(String(opt.value), opt.label);
      }
    }

    for (const row of rows) {
      for (const { value, label } of rowGroupValues(row, attr)) {
        const acc = buckets.get(value) ?? { count: 0 };
        acc.count += 1;
        acc.sampleRow ??= row;
        // Only object-arrays carry a label on the row; everything else keeps
        // whatever the enum seeding put there.
        if (label !== undefined) acc.label = label;
        buckets.set(value, acc);
      }
    }

    const result: EntityGroup[] = [];
    for (const [value, acc] of buckets.entries()) {
      const isNone = value === NONE_VALUE;
      const label = isNone ? NONE_LABEL : (acc.label ?? value);
      const visual = resolveVisual && !isNone ? resolveVisual(attr, value, acc.sampleRow) : undefined;
      result.push({ value, label, count: acc.count, visual, isNone });
    }

    // Sort: real groups first, then "Untagged" at the end.
    //
    // Numeric lanes go in numeric order, not by size: 1U, 2U, 3U is the whole
    // point of grouping by a measurement, and popularity order reads as
    // shuffled. Everything else stays count-desc, which is what the landing
    // view and the existing boards were built around — and they only ever
    // group by `options`, so nothing there moves.
    const numeric = (attr as ModelAttribute).filter_type === "number";
    result.sort((a, b) => {
      if (a.isNone && !b.isNone) return 1;
      if (!a.isNone && b.isNone) return -1;
      if (numeric) return Number(a.value) - Number(b.value);
      return b.count - a.count;
    });

    return result;
  }, [dataset, attr, attrName, resolveVisual]);

  return { groups, attr };
}
