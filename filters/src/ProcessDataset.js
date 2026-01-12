import { GetActiveFilters } from "./GetActiveFilters";
import { ApplyFilters } from "./ApplyFilters";
import { CalculateFeatureStats } from "@bcl32/utils/CalculateFeatureStats";

export function ProcessDataset(dataset, filters, ModelData) {
  var active_filters = GetActiveFilters(filters);
  var filteredData = ApplyFilters(dataset, active_filters);

  var datasetStats = CalculateFeatureStats(ModelData.model_attributes, dataset);
  var filteredStats = CalculateFeatureStats(
    ModelData.model_attributes,
    filteredData
  );

  return {
    active_filters: active_filters,
    filteredData: filteredData,
    datasetStats: datasetStats,
    filteredStats: filteredStats,
  };
}
