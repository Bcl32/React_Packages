import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiFetch } from "./apiFetch";

interface AttrLike {
  options_source?: { url?: string };
  options?: unknown;
  [key: string]: unknown;
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

  const dataByUrl = useMemo(() => {
    const m: Record<string, unknown[]> = {};
    sources.forEach((url, i) => {
      const data = queries[i]?.data;
      m[url] = Array.isArray(data) ? data : [];
    });
    return m;
  }, [sources, queries]);

  const enrichedModelData = useMemo<T>(() => {
    let changed = false;
    const attrs = modelData.model_attributes.map((attr) => {
      const url = attr.options_source?.url;
      if (!url) return attr;
      const options = dataByUrl[url];
      if (!options || options.length === 0) return attr;
      changed = true;
      return { ...attr, options } as AttrLike;
    });
    return (changed ? { ...modelData, model_attributes: attrs } : modelData) as T;
  }, [modelData, dataByUrl]);

  function getLookup(url: string): unknown[] {
    return dataByUrl[url] ?? [];
  }

  return { enrichedModelData, getLookup };
}
