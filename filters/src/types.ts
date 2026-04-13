// Core filter types used across the package

export type FilterDisplay =
  | "dropdown"
  | "combobox"
  | "chip-toggle"
  | "swatch-grid"
  | "toggle-buttons";

export type FilterSourceKind = "scalar" | "scalar-array" | "object-array";

export type FilterSelection = "single" | "multi";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterValue {
  type: "string" | "number" | "datetime" | "options";
  value: unknown;
  rule?: string;
  filter_empty: unknown;
  options?: FilterOption[];
  source_kind?: FilterSourceKind;
  selection?: FilterSelection;
  display?: FilterDisplay;
  value_key?: string;
  label_key?: string;
  colour_presets?: ColourPresetsConfig;
  timespan_begin?: string;
  primaryFilter?: boolean;
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
  options?: FilterOption[];
  colour_presets?: ColourPresetsConfig;
  [key: string]: unknown;
}

export interface ColourPresetsConfig {
  get_api_url: string;
  group_by?: string;
}

export interface GroupedFilters {
  primary_filters: FilterData[];
  string_filters: FilterData[];
  numeric_filters: FilterData[];
  options_filters: FilterData[];
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

export interface DatetimeFilterValue {
  timespan_begin: string;
  timespan_end: string;
}

export interface NumberRange {
  min: number;
  max: number;
}

export interface ClickPayload {
  payload: {
    name: string;
    [key: string]: unknown;
  };
}

export interface ChartClickEvent {
  activePayload?: ClickPayload[];
}
