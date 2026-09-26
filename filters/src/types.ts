// Core filter types used across the package

import type { ModelAttribute } from "@bcl32/data-utils";

/**
 * How a filter is drawn. Options filters use the first five; a boolean filter
 * is drawn as "segmented" (Any / Yes / No, the default) or "checkbox" (one
 * side only, set per field with checkedValue and checkedLabel).
 */
export type FilterDisplay =
  | "dropdown"
  | "combobox"
  | "chip-toggle"
  | "swatch-grid"
  | "toggle-buttons"
  | "segmented"
  | "checkbox";

/** What the row's cell holds: one value, a list of values, or a list of objects. */
export type FilterCellShape = "scalar" | "scalar-array" | "object-array";

export type FilterSelection = "single" | "multi";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * What a filter asks of a row: a filter's runtime `type`, which is also its
 * picker section and search kind. resolveFilterKind decides it for an
 * attribute.
 */
export type FilterKind = "number" | "datetime" | "string" | "boolean" | "options";

/**
 * A boolean filter's value. null is "no filter"; "unknown" selects the rows
 * whose cell is empty, and is only offered on a nullable field.
 */
export type BooleanFilterValue = true | false | "unknown" | null;

export interface FilterValue {
  type: FilterKind;
  value: unknown;
  rule?: string;
  filter_empty: unknown;
  options?: FilterOption[];
  cell_shape?: FilterCellShape;
  selection?: FilterSelection;
  display?: FilterDisplay;
  value_key?: string;
  label_key?: string;
  colour_presets?: ColourPresetsConfig;
  primaryFilter?: boolean;
  // Boolean filters only. The value a checkbox means when ticked (default
  // true) and the text beside it ("Hide archived"; default the title).
  checkedValue?: boolean;
  checkedLabel?: string;
  // The field can be empty (the schema allows null). A boolean filter then
  // offers "Unknown" and never draws as a checkbox.
  nullable?: boolean;
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
  // The attribute this filter was built from, by reference rather than copied,
  // so every key on it (unit, searchAliases, whatever is added later) reaches
  // the controls without CreateFilter listing it. Read descriptive facts here
  // and the live option list from `options`; useEntityFilters swaps in the
  // enriched attribute when fetched options arrive, so the two agree. Nothing
  // may write to it. Optional because apps can build filter maps by hand.
  attr?: ModelAttribute;
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
  // The picker section, which is the type of the filter the row creates.
  type: FilterKind;
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
  // The attribute this row describes, by reference (see FilterValue.attr).
  attr: ModelAttribute;
}

/** Opening value for a filter created on demand — kind-specific. A string[]
 * seeds an options filter's selection; a boolean filter takes true, false or
 * "unknown" (or the same as a "true" / "false" / "unknown" token). */
export type FilterInitialValue =
  | Partial<NumberRange>
  | Partial<DatetimeFilterValue>
  | string
  | string[]
  | BooleanFilterValue;

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
  /**
   * Row column holding the IDENTITY of each selected preset, parallel to the
   * colour column the filter is declared on. When set, a swatch pick is stored
   * as the preset's id and matched against this column instead of by colour —
   * necessary wherever several presets share one hex, which a colour
   * comparison cannot tell apart. Supplied by the schema.
   */
  match_field?: string;
}

export interface ChartMetadata {
  name: string;
  type: string;
  subkey?: string;
  subkeys?: string[];
  // Display label for the chart's header ("Failure reason"); components fall
  // back to a humanized field name when absent.
  title?: string;
}

/**
 * Display-only rename for one chart category value.
 *
 * A chart category is a raw data value ("runner_crashed") that doubles as the
 * value a click writes into the filter. A labeller changes ONLY what is drawn
 * — axis ticks, legend text, tooltip names — and is never consulted on the
 * click path, so the filter round-trip keeps using the raw value.
 *
 * Returning "" (or the value unchanged) falls back to the default
 * `prettyOptionLabel` treatment, so a partial map is safe.
 */
export type ChartValueLabeller = (rawValue: string) => string;

/**
 * Either a single labeller for the chart at hand, or a map from chart
 * dimension name (`ChartMetadata.name`) to that dimension's labeller — the map
 * form lets a caller hand one object to every chart it renders.
 */
export type ChartValueLabelling =
  | ChartValueLabeller
  | Record<string, ChartValueLabeller>;

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
