// Core filter types used across the package

export interface FilterValue {
  type: "string" | "number" | "datetime" | "select" | "list";
  value: unknown;
  rule?: string;
  filter_empty: unknown;
  options?: string[];
  timespan_begin?: string;
}

export interface Filters {
  [key: string]: FilterValue;
}

export interface FilterContextValue {
  filters: Filters;
  change_filters: (name: string, key: string, value: unknown) => void;
}

export interface FilterData {
  name: string;
  type: string;
  options?: string[];
  [key: string]: unknown;
}

export interface GroupedFilters {
  string_filters: FilterData[];
  numeric_filters: FilterData[];
  select_filters: FilterData[];
  list_filters: FilterData[];
  time_filters: FilterData[];
}

export interface ChartMetadata {
  name: string;
  type: string;
  subkey?: string;
  subkeys?: string[];
}

export interface ChartDataEntry {
  name: string;
  length?: number;
  count?: number;
  fill?: string;
  range?: string;
  x0?: number;
  [key: string]: unknown;
}

export type { ModelAttribute, ModelData } from "@bcl32/data-utils";

export interface StatValue {
  name: string;
  value: unknown;
}

export interface DatasetStats {
  [key: string]: StatValue[];
}

export interface ProcessedDataset {
  active_filters: Filters;
  filteredData: Record<string, unknown>[];
  datasetStats: DatasetStats;
  filteredStats: DatasetStats;
}
