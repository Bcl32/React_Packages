import { useState, useMemo, useEffect, useCallback } from "react";
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
}

export function useEntityFilters(
  dataset: unknown[] | undefined | null,
  ModelData: ModelData
): UseEntityFiltersReturn {
  const safeDataset = useMemo(
    () => (Array.isArray(dataset) ? (dataset as Record<string, unknown>[]) : []),
    [dataset]
  );

  // Calculate initial stats once
  const initialStats = useMemo(() => {
    if (safeDataset.length === 0) return {};
    return ProcessDataset(safeDataset, {}, ModelData).datasetStats;
  }, [safeDataset, ModelData]);

  // Initialize filters synchronously
  const [filters, setFilters] = useState<Filters>(() =>
    InitializeFilters(ModelData.model_attributes, initialStats)
  );

  // Re-initialize when data arrives (useState initializer only runs once)
  useEffect(() => {
    if (
      Object.keys(filters).length === 0 &&
      Object.keys(initialStats).length > 0
    ) {
      setFilters(InitializeFilters(ModelData.model_attributes, initialStats));
    }
  }, [initialStats, ModelData.model_attributes]);

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
    return ProcessDataset(safeDataset, filters, ModelData);
  }, [safeDataset, filters, ModelData]);

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
  };
}
