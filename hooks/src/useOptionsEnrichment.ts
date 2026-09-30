import { useMemo, useRef } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

/**
 * Where an attribute's options come from.
 *
 * With `url` alone the endpoint already answers `{value, label}[]` — the
 * `/tags` and `/systems/names` shape, used as-is. With `value_key` /
 * `label_key` the endpoint is an ordinary LIST route (a bare array or a
 * `{items: [...]}` ListResponse) and each row is mapped into an option: this is
 * how a foreign key is filtered by the record it points at, the generator's
 * reference filter. `fallback_label_key` covers a row whose label is blank (a
 * user with no display name has an email), and `none_label` appends the choice
 * that matches an EMPTY cell — the filters package's `_none` token.
 */
export interface OptionsSource {
  url?: string;
  value_key?: string;
  label_key?: string;
  fallback_label_key?: string;
  /** A second field that tells apart two rows sharing a label — a room's
   *  `floor`, so two Halls read "Hall · Main Floor" and "Hall · Lower Level".
   *  Only colliding labels get it; a unique name stays short. */
  detail_key?: string;
  none_label?: string;
}

interface AttrLike {
  options_source?: OptionsSource;
  options?: unknown;
  [key: string]: unknown;
}

/** Shared with `@bcl32/filters`' `NONE_VALUE`: the option meaning "no value". */
export const NONE_OPTION_VALUE = "_none";

function rowsOf(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const items = (data as { items?: unknown } | null | undefined)?.items;
  return Array.isArray(items) ? items : [];
}

/**
 * Make every label unique, in place.
 *
 * Load-bearing, not cosmetic: the filters package's combobox is a list of
 * STRINGS, and it maps a picked label back to its value — so two rooms both
 * called "Hall" are one entry that can only ever select one of them. A
 * colliding label gains its row's `detail_key` field, and anything still
 * colliding after that (or with no detail to give) gains a counter.
 */
function disambiguate(
  options: { value: string; label: string }[],
  rows: Record<string, unknown>[],
  valueKey: string,
  detailKey?: string,
): void {
  const count = (list: typeof options) => {
    const n = new Map<string, number>();
    for (const o of list) n.set(o.label, (n.get(o.label) ?? 0) + 1);
    return n;
  };
  let seen = count(options);
  if (detailKey) {
    const detailOf = new Map(rows.map((r) => [String(r[valueKey]), r[detailKey]]));
    for (const o of options) {
      const detail = detailOf.get(o.value);
      if ((seen.get(o.label) ?? 0) > 1 && detail != null && String(detail).trim()) {
        o.label = `${o.label} · ${String(detail).trim()}`;
      }
    }
    seen = count(options);
  }
  const used = new Map<string, number>();
  for (const o of options) {
    if ((seen.get(o.label) ?? 0) < 2) continue;
    const k = (used.get(o.label) ?? 0) + 1;
    used.set(o.label, k);
    if (k > 1) o.label = `${o.label} (${k})`;
  }
}

/**
 * One source's response as options. Exported so a page that renders its own
 * picker gets the same labels the filter bar shows.
 */
export function optionsFromSource(data: unknown, source: OptionsSource): unknown[] {
  if (!source.value_key && !source.label_key) {
    // The pre-shaped `{value, label}[]` contract, unchanged.
    return Array.isArray(data) ? data : [];
  }
  const valueKey = source.value_key ?? "value";
  const labelKey = source.label_key ?? "label";
  const text = (v: unknown) => (v == null ? "" : String(v).trim());
  const options = rowsOf(data)
    .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
    .filter((row) => row[valueKey] != null)
    .map((row) => ({
      value: String(row[valueKey]),
      label:
        text(row[labelKey]) ||
        (source.fallback_label_key ? text(row[source.fallback_label_key]) : "") ||
        String(row[valueKey]),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  disambiguate(options, rowsOf(data) as Record<string, unknown>[], valueKey, source.detail_key);
  // Last, after the sort: "No project" is not a project and should not be
  // alphabetised in among them.
  if (source.none_label) options.push({ value: NONE_OPTION_VALUE, label: source.none_label });
  return options;
}

interface ModelDataLike {
  model_attributes: AttrLike[];
  [key: string]: unknown;
}

interface UseOptionsEnrichmentReturn<T> {
  enrichedModelData: T;
  getLookup: (url: string) => unknown[];
}

/**
 * Fetch any `options_source.url` declared on a ModelData attribute and
 * inject the response as `attr.options`. Backend endpoints return the
 * canonical `{value, label}[]` shape, so no client-side transformation
 * is needed.
 *
 * Used by useEntityFilters internally; can also be called directly on
 * pages that need enriched options without a filter bar (e.g. detail
 * pages with editable forms).
 */
export function useOptionsEnrichment<T extends ModelDataLike>(
  modelData: T,
): UseOptionsEnrichmentReturn<T> {
  const sources = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const attr of modelData.model_attributes) {
      const url = attr.options_source?.url;
      if (url && !seen.has(url)) {
        seen.add(url);
        list.push(url);
      }
    }
    return list;
  }, [modelData]);

  const queries = useQueries({
    queries: sources.map((url) => ({
      queryKey: [url],
      queryFn: async () => {
        try {
          const resp = await apiFetch(url);
          return await resp.json();
        } catch {
          return [];
        }
      },
      staleTime: 30_000,
    })),
  });

  // `useQueries` hands back a fresh array on every render, so memoizing on it
  // rebuilds `dataByUrl` — and therefore `enrichedModelData` and every consumer
  // memo chained off it — even when nothing fetched. On a table page that means
  // the column defs are rebuilt and the whole row model recomputes on any
  // unrelated state change. Key the cache on the individual `data` references
  // instead: react-query's structural sharing keeps those stable across
  // refetches that return equal payloads.
  const dataRefs = queries.map((q) => q.data);
  const cacheRef = useRef<{
    sources: string[];
    dataRefs: unknown[];
    value: Record<string, unknown>;
  } | null>(null);

  const cached = cacheRef.current;
  const cacheHit =
    cached !== null &&
    cached.sources === sources &&
    cached.dataRefs.length === dataRefs.length &&
    cached.dataRefs.every((d, i) => d === dataRefs[i]);

  // Raw responses, not options: two attributes may read one url through
  // different keys, and a ListResponse is an object — flattening it to `[]`
  // here (as this once did for anything that was not already an array) would
  // silently give every reference filter no options at all.
  if (!cacheHit) {
    const m: Record<string, unknown> = {};
    sources.forEach((url, i) => {
      m[url] = dataRefs[i];
    });
    cacheRef.current = { sources, dataRefs, value: m };
  }

  const dataByUrl = cacheRef.current!.value;

  const enrichedModelData = useMemo<T>(() => {
    let changed = false;
    const attrs = modelData.model_attributes.map((attr) => {
      const source = attr.options_source;
      const url = source?.url;
      if (!source || !url) return attr;
      const options = optionsFromSource(dataByUrl[url], source);
      if (options.length === 0) return attr;
      changed = true;
      return { ...attr, options } as AttrLike;
    });
    return (changed ? { ...modelData, model_attributes: attrs } : modelData) as T;
  }, [modelData, dataByUrl]);

  function getLookup(url: string): unknown[] {
    return rowsOf(dataByUrl[url]);
  }

  return { enrichedModelData, getLookup };
}
