import { useState, useMemo, useEffect, useCallback } from "react";
import { useOptionsEnrichment } from "@bcl32/hooks/useOptionsEnrichment";
import { CalculateFeatureStats } from "@bcl32/data-utils/CalculateFeatureStats";
import { ProcessDataset } from "./ProcessDataset";
import { InitializeFilters } from "./InitializeFilters";
import type { Filters, ModelData, ProcessedDataset, DatasetStats } from "./types";

export interface UseEntityFiltersReturn {
  filters: Filters;
  changeFilters: (name: string, key: string, value: unknown) => void;
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
  ModelData: ModelData
): UseEntityFiltersReturn {
  const { enrichedModelData } = useOptionsEnrichment(ModelData);

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
    InitializeFilters(enrichedModelData.model_attributes, datasetStats)
  );

  // Re-initialize when data arrives (useState initializer only runs once).
  useEffect(() => {
    if (
      Object.keys(filters).length === 0 &&
      Object.keys(datasetStats).length > 0
    ) {
      setFilters(InitializeFilters(enrichedModelData.model_attributes, datasetStats));
    }
  }, [datasetStats, enrichedModelData.model_attributes]);

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
        const cur = next[attr.name];
        if (!cur) continue;
        if ((cur as { options?: unknown }).options === newOptions) continue;
        next[attr.name] = { ...cur, options: newOptions } as typeof cur;
        changed = true;
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

  return {
    filters,
    changeFilters,
    filteredData: processed.filteredData,
    activeFilters: processed.active_filters,
    datasetStats: processed.datasetStats,
    filteredStats: processed.filteredStats,
    filteredCount: processed.filteredData.length,
    totalCount: safeDataset.length,
    enrichedModelData,
  };
}
