import { GetActiveFilters } from "./GetActiveFilters";
import { ApplyFilters } from "./ApplyFilters";
import { CalculateFeatureStats } from "@bcl32/data-utils/CalculateFeatureStats";
import type { DatasetStats, Filters, ModelData, ProcessedDataset } from "./types";

export function ProcessDataset(
  dataset: Record<string, unknown>[],
  filters: Filters,
  ModelData: ModelData,
  // Stats over the full, unfiltered dataset don't depend on `filters`. Callers
  // that re-run ProcessDataset on every filter change (e.g. useEntityFilters)
  // pass their own memoized value here so only the filtered pass recomputes.
  precomputedDatasetStats?: DatasetStats
): ProcessedDataset {
  const active_filters = GetActiveFilters(filters);
  const filteredData = ApplyFilters(dataset, active_filters);

  const datasetStats =
    precomputedDatasetStats ??
    CalculateFeatureStats(ModelData.model_attributes, dataset);
  const filteredStats = CalculateFeatureStats(
    ModelData.model_attributes,
    filteredData
  );

  return {
    active_filters,
    filteredData,
    datasetStats,
    filteredStats,
  };
}
