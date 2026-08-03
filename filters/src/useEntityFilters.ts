import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useOptionsEnrichment } from "@bcl32/hooks/useOptionsEnrichment";
import { CalculateFeatureStats } from "@bcl32/data-utils/CalculateFeatureStats";
import { ProcessDataset } from "./ProcessDataset";
import { InitializeFilters } from "./InitializeFilters";
import type { DynamicFilterKind } from "./BuildFilterCatalog";
import { CreateFilter } from "./CreateFilter";
import { BuildFilterCatalog, baseFieldName, makeInstanceKey } from "./BuildFilterCatalog";
import { BuildFilterSearchIndex, type SearchFieldEntry } from "./FilterSearch";
import type {
  Filters,
  ModelData,
  ModelAttribute,
  ProcessedDataset,
  DatasetStats,
  FilterCatalogEntry,
  FilterInitialValue,
  NumberRange,
  DatetimeFilterValue,
} from "./types";

export interface AddFilterOptions {
  /**
   * Create the filter as a pinned one rather than a removable instance: it
   * sorts with the primary filters and its ✕ resets instead of removing. Used
   * for defaults the UI seeds on the user's behalf.
   */
  pinned?: boolean;
}

export interface UseEntityFiltersOptions {
  /**
   * Which filter kinds are created on demand rather than at mount — `true` for
   * all of them, or an array to narrow it. Defaults to off; see
   * InitializeFiltersOptions for why. Consumers that opt in must also pass
   * addFilter / removeFilter / filterCatalog to their filter UI.
   */
  dynamicFilters?: boolean | DynamicFilterKind[];
}

export interface UseEntityFiltersReturn {
  filters: Filters;
  changeFilters: (name: string, key: string, value: unknown) => void;
  addFilter: (
    field: string,
    initial?: FilterInitialValue,
    options?: AddFilterOptions,
  ) => string | null;
  removeFilter: (name: string) => void;
  filterCatalog: FilterCatalogEntry[];
  /**
   * Whether the entity declares any primaryFilter at all. Read from the model
   * attributes, so it's correct from the first render — unlike inspecting
   * `filters`, which is empty until the dataset lands.
   */
  hasPrimaryFilters: boolean;
  searchIndex: SearchFieldEntry[];
  filteredData: Record<string, unknown>[];
  activeFilters: Filters;
  datasetStats: DatasetStats;
  filteredStats: DatasetStats;
  filteredCount: number;
  totalCount: number;
  enrichedModelData: ModelData;
}

export function useEntityFilters(
  dataset: unknown[] | undefined | null,
  ModelData: ModelData,
  options: UseEntityFiltersOptions = {}
): UseEntityFiltersReturn {
  const { enrichedModelData } = useOptionsEnrichment(ModelData);
  const dynamicFilters = options.dynamicFilters;

  const safeDataset = useMemo(
    () => (Array.isArray(dataset) ? (dataset as Record<string, unknown>[]) : []),
    [dataset]
  );

  // Stats over the full, unfiltered dataset. These don't depend on `filters`,
  // so memoize them on the data alone and reuse the value below — otherwise the
  // unfiltered pass re-runs on every filter change inside ProcessDataset.
  const datasetStats = useMemo<DatasetStats>(() => {
    if (safeDataset.length === 0) return {};
    return CalculateFeatureStats(enrichedModelData.model_attributes, safeDataset);
  }, [safeDataset, enrichedModelData]);

  // Initialize filters synchronously
  const [filters, setFilters] = useState<Filters>(() =>
    InitializeFilters(enrichedModelData.model_attributes, datasetStats, {
      dynamicFilters,
    })
  );

  // Re-initialize when data arrives (the useState initializer only runs once).
  // Tracked with a ref instead of `Object.keys(filters).length === 0`: with
  // add-on-demand range filters an entity whose filters are ALL dynamic
  // legitimately stays empty, and the old test would re-initialize forever.
  const initializedRef = useRef(Object.keys(filters).length > 0);
  useEffect(() => {
    if (!initializedRef.current && Object.keys(datasetStats).length > 0) {
      setFilters(
        InitializeFilters(enrichedModelData.model_attributes, datasetStats, {
          dynamicFilters,
        })
      );
      initializedRef.current = true;
    }
  }, [datasetStats, enrichedModelData.model_attributes, dynamicFilters]);

  // Sync newly-fetched options into existing filter state without clobbering
  // the user's value/rule. Without this, options that arrive after filter
  // initialization (e.g. via useOptionsEnrichment) never reach the UI.
  useEffect(() => {
    setFilters((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next: Filters = { ...prev };
      for (const attr of enrichedModelData.model_attributes) {
        const newOptions = attr.options as unknown[] | undefined;
        if (!newOptions || newOptions.length === 0) continue;
        // Match on the resolved column, so instances (key "tags#2") pick new
        // options up as well — not just the schema-declared entry.
        for (const key of Object.keys(next)) {
          const cur = next[key];
          if ((cur.field ?? baseFieldName(key)) !== attr.name) continue;
          if ((cur as { options?: unknown }).options === newOptions) continue;
          next[key] = { ...cur, options: newOptions } as typeof cur;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [enrichedModelData.model_attributes]);

  // Process dataset with current filters
  const processed = useMemo<ProcessedDataset>(() => {
    if (safeDataset.length === 0) {
      return {
        active_filters: {},
        filteredData: [],
        datasetStats: {},
        filteredStats: {},
      };
    }
    return ProcessDataset(safeDataset, filters, enrichedModelData, datasetStats);
  }, [safeDataset, filters, enrichedModelData, datasetStats]);

  // Stable change callback
  const changeFilters = useCallback(
    (name: string, key: string, value: unknown) => {
      setFilters((prev) => ({
        ...prev,
        [name]: { ...prev[name], [key]: value },
      }));
    },
    []
  );

  // Attribute lookup for on-demand creation, so addFilter stays O(1) no matter
  // how many attributes the entity declares.
  const attributesByName = useMemo(() => {
    const map = new Map<string, ModelAttribute>();
    for (const attr of enrichedModelData.model_attributes) map.set(attr.name, attr);
    return map;
  }, [enrichedModelData.model_attributes]);

  /**
   * Create a filter instance for `field` and return its key, or null when the
   * attribute is unknown or its stats aren't ready. Adding the same field twice
   * is allowed — the second instance gets a synthetic "field#2" key.
   */
  const addFilter = useCallback(
    (
      field: string,
      initial?: FilterInitialValue,
      addOptions?: AddFilterOptions,
    ): string | null => {
      const attr = attributesByName.get(field);
      if (!attr) return null;
      const filter = CreateFilter(attr, datasetStats);
      if (!filter) return null;

      if (initial && filter.type === "number") {
        const seed = initial as Partial<NumberRange>;
        const value = filter.value as NumberRange;
        if (typeof seed.min === "number") value.min = seed.min;
        if (typeof seed.max === "number") value.max = seed.max;
      }

      if (initial && filter.type === "string" && typeof initial === "string") {
        filter.value = initial;
      }

      // Seed an options-typed filter's selection (the search bar creating a
      // boolean/options instance with a value already chosen).
      if (initial && filter.type === "options" && Array.isArray(initial)) {
        filter.value = [...initial];
      }

      if (initial && filter.type === "datetime") {
        const seed = initial as Partial<DatetimeFilterValue>;
        const value = filter.value as DatetimeFilterValue;
        if (seed.timespan_begin) value.timespan_begin = seed.timespan_begin;
        if (seed.timespan_end) value.timespan_end = seed.timespan_end;
      }

      // Pick the key from current state so it can be returned synchronously
      // (the updater below runs later, on React's schedule). The updater still
      // re-derives the key against `prev` in case two adds land in one tick.
      const key = makeInstanceKey(field, filters);
      setFilters((prev) => {
        const safeKey = prev[key] ? makeInstanceKey(field, prev) : key;
        // primaryFilter is cleared on instances: a duplicate of a pinned
        // attribute belongs where it was added, not up with the pinned ones.
        return {
          ...prev,
          [safeKey]: addOptions?.pinned
            ? { ...filter, dynamic: false, primaryFilter: true }
            : { ...filter, dynamic: true, primaryFilter: false },
        };
      });
      return key;
    },
    [attributesByName, datasetStats, filters]
  );

  const removeFilter = useCallback((name: string) => {
    setFilters((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const hasPrimaryFilters = useMemo(
    () =>
      enrichedModelData.model_attributes.some(
        (attr) => attr.filter && (attr as { primaryFilter?: boolean }).primaryFilter,
      ),
    [enrichedModelData.model_attributes],
  );

  const filterCatalog = useMemo(
    () => BuildFilterCatalog(enrichedModelData.model_attributes, datasetStats, filters),
    [enrichedModelData.model_attributes, datasetStats, filters]
  );

  // Value-first search over every filterable attribute. Depends only on the
  // attributes + full-dataset stats, so it doesn't rebuild per filter change.
  const searchIndex = useMemo(
    () => BuildFilterSearchIndex(enrichedModelData.model_attributes, datasetStats),
    [enrichedModelData.model_attributes, datasetStats]
  );

  return {
    filters,
    changeFilters,
    addFilter,
    removeFilter,
    filterCatalog,
    hasPrimaryFilters,
    searchIndex,
    filteredData: processed.filteredData,
    activeFilters: processed.active_filters,
    datasetStats: processed.datasetStats,
    filteredStats: processed.filteredStats,
    filteredCount: processed.filteredData.length,
    totalCount: safeDataset.length,
    enrichedModelData,
  };
}
