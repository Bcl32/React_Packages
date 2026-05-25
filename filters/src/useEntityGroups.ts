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

const NONE_VALUE = "_none";
const NONE_LABEL = "Untagged";

export function getGroupableAttrs(modelData: ModelData): ModelAttribute[] {
  return modelData.model_attributes.filter(
    (a) => a.filter === true && (a as ModelAttribute).filter_type === "options",
  );
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
    const valueKey = ((attr as ModelAttribute).value_key as string) ?? "value";
    const labelKey = ((attr as ModelAttribute).label_key as string) ?? "label";

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
      const raw = row[attrName];

      if (sourceKind === "scalar-array") {
        const arr = Array.isArray(raw) ? raw : [];
        if (arr.length === 0) {
          const acc = buckets.get(NONE_VALUE) ?? { count: 0 };
          acc.count += 1;
          acc.sampleRow ??= row;
          buckets.set(NONE_VALUE, acc);
          continue;
        }
        for (const v of arr) {
          if (v == null) continue;
          const key = String(v);
          const acc = buckets.get(key) ?? { count: 0 };
          acc.count += 1;
          acc.sampleRow ??= row;
          buckets.set(key, acc);
        }
      } else if (sourceKind === "object-array") {
        const arr = Array.isArray(raw) ? raw : [];
        if (arr.length === 0) {
          const acc = buckets.get(NONE_VALUE) ?? { count: 0 };
          acc.count += 1;
          acc.sampleRow ??= row;
          buckets.set(NONE_VALUE, acc);
          continue;
        }
        for (const item of arr) {
          const v = objectArrayValue(item, valueKey);
          if (v == null) continue;
          const acc = buckets.get(v) ?? { count: 0 };
          acc.count += 1;
          acc.sampleRow ??= row;
          acc.label = objectArrayLabel(item, labelKey, v);
          buckets.set(v, acc);
        }
      } else {
        // scalar / enum
        if (raw == null || raw === "") {
          const acc = buckets.get(NONE_VALUE) ?? { count: 0 };
          acc.count += 1;
          acc.sampleRow ??= row;
          buckets.set(NONE_VALUE, acc);
          continue;
        }
        const key = String(raw);
        const acc = buckets.get(key) ?? { count: 0 };
        acc.count += 1;
        acc.sampleRow ??= row;
        buckets.set(key, acc);
      }
    }

    const result: EntityGroup[] = [];
    for (const [value, acc] of buckets.entries()) {
      const isNone = value === NONE_VALUE;
      const label = isNone ? NONE_LABEL : (acc.label ?? value);
      const visual = resolveVisual && !isNone ? resolveVisual(attr, value, acc.sampleRow) : undefined;
      result.push({ value, label, count: acc.count, visual, isNone });
    }

    // Sort: real groups first by count desc, then "Untagged" at the end.
    result.sort((a, b) => {
      if (a.isNone && !b.isNone) return 1;
      if (!a.isNone && b.isNone) return -1;
      return b.count - a.count;
    });

    return result;
  }, [dataset, attr, attrName, resolveVisual]);

  return { groups, attr };
}
