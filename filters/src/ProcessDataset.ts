import { GetActiveFilters } from "./GetActiveFilters";
import { ApplyFilters } from "./ApplyFilters";
import { CalculateFeatureStats } from "@bcl32/data-utils/CalculateFeatureStats";
import type { Filters, ModelData, ProcessedDataset } from "./types";

export function ProcessDataset(
  dataset: Record<string, unknown>[],
  filters: Filters,
  ModelData: ModelData
): ProcessedDataset {
  const active_filters = GetActiveFilters(filters);
  const filteredData = ApplyFilters(dataset, active_filters);

  const datasetStats = CalculateFeatureStats(
    ModelData.model_attributes as Parameters<typeof CalculateFeatureStats>[0],
    dataset
  );
  const filteredStats = CalculateFeatureStats(
    ModelData.model_attributes as Parameters<typeof CalculateFeatureStats>[0],
    filteredData
  );

  return {
    active_filters,
    filteredData,
    datasetStats,
    filteredStats,
  };
}
