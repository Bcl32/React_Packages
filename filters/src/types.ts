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
  // The data column this filter reads. Defaults to the Filters map key — only
  // dynamic instances (which use a synthetic key like "weight_g#2") set it to
  // something different. Everything that touches row data resolves the column
  // as `filter.field ?? key`.
  field?: string;
  // True for user-created instances added at runtime via add_filter. Drives
  // "✕ removes the slot" instead of "✕ resets to the full range".
  dynamic?: boolean;
  // Schema-provided display label ("Size (mm)"); components fall back to a
  // humanized field name when absent.
  title?: string;
  filterOrder?: number;
  // Distribution of the column over the FULL dataset, attached to number
  // filters at creation. Drives the histogram above the range slider; bars
  // outside the selected range render faded. Full-dataset (not filtered) on
  // purpose — a domain that moved while you dragged would be unusable.
  histogram?: HistogramBin[];
}

export interface Filters {
  [key: string]: FilterValue;
}

// One addable attribute offered by the "+ Add numeric filter" picker. Built by
// crossing the model attributes with the dataset stats, so a row can show the
// live data range before the user commits to a slot.
export interface FilterCatalogEntry {
  field: string;
  title: string;
  // The picker's *kind*, which is not always the created filter's `type`: a
  // boolean attribute is catalogued as "boolean" (its own picker section) but
  // the filter it creates is an options filter over a fixed Yes/No list.
  type: FilterValue["type"] | "boolean";
  // Bounds are kind-specific: min/max for "number", earliest/latest (ISO
  // strings) for "datetime", a distinct-value count for "string". They're
  // absent when the column has no usable stats, in which case `disabled` is
  // set and `reason` says why.
  min?: number;
  max?: number;
  earliest?: string;
  latest?: string;
  distinct?: number;
  // Shape previews, so a row says what the data looks like and not just how
  // wide it is. Both come from stats CalculateFeatureStats already computes:
  // `histogram` is the bin counts behind a numeric range, `topValues` the most
  // common values of a text column.
  histogram?: number[];
  topValues?: { value: string; count: number }[];
  disabled: boolean;
  reason?: string;
  usedCount: number;
}

/** Opening value for a filter created on demand — kind-specific. A string[]
 * seeds an options-typed filter's selection (booleans included). */
export type FilterInitialValue =
  | Partial<NumberRange>
  | Partial<DatetimeFilterValue>
  | string
  | string[];

export interface FilterContextValue {
  filters: Filters;
  change_filters: (name: string, key: string, value: unknown) => void;
  // Optional so consumers that build the context by hand keep type-checking;
  // the dynamic UI only renders when these are supplied.
  add_filter?: (field: string, initial?: FilterInitialValue) => string | null;
  remove_filter?: (name: string) => void;
  filter_catalog?: FilterCatalogEntry[];
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
  subgroup_by?: string;
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

/** One bar of a numeric column's distribution, over the full dataset. */
export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
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
