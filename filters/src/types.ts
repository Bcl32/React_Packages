// Core filter types used across the package

import type * as React from "react";
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

/**
 * A toggle-buttons filter's option size — the @bcl32/utils ToggleGroup cva
 * size names. `xs` is the default caption row; a page declares a larger one
 * per field through useDataTableFilterBar's `optionSizes`. `tile` stacks the
 * option's mark above a small label in a square-ish button.
 */
export type FilterOptionSize = "xs" | "sm" | "default" | "lg" | "tile";

/**
 * Draws a mark in front of one option's label in a toggle-buttons or
 * chip-toggle filter, or nothing for an option that gets none. The label text
 * is always printed by the filter itself, so the mark never changes a button's
 * accessible name; return an `aria-hidden` icon. Option lists usually come from
 * an API as `{value, label}`, which is why the page supplies this per field
 * (useDataTableFilterBar's `optionIcons`). An option that carries its own
 * `icon` (a sub-filter's) wins over it.
 */
export type FilterOptionIcon = (option: FilterOption) => React.ReactNode;

export interface FilterOption {
  value: string;
  label: string;
  /** A mark drawn in front of the label; see FilterOptionIcon. */
  icon?: React.ReactNode;
  /** Rows this option would leave, under every other active filter. */
  count?: number;
  /** Greyed out and unclickable: an option that would leave no rows. */
  disabled?: boolean;
}

/**
 * A sub-filter: a toggle group that opens under one selected value of an
 * options filter and narrows only the rows in that value. Pick HomeRacker in
 * Systems and "HomeRacker › Kind" appears; choosing Connectors drops the
 * HomeRacker parts that aren't connectors and leaves every other system's
 * parts alone. Declared per parent field through useEntityFilters'
 * `subFilters`; see subFilters.ts.
 */
export interface SubFilterSpec {
  /**
   * The fixed option list for one parent value, or null/undefined to fall
   * through to `derive`. An empty list means "no sub-filter for this value".
   */
  options?: (parent: SubFilterParentOption) => SubFilterOption[] | null | undefined;
  /** Otherwise the distinct values of this column among the parent value's rows. */
  derive?: { field: string };
  /** The group's heading; defaults to the parent value's label. */
  title?: (parent: SubFilterParentOption, info: { derived: boolean }) => string;
  /** Toggle size for the group (default `xs`). */
  size?: FilterOptionSize;
}

/** The parent filter's option for the selected value, as the API sent it. */
export interface SubFilterParentOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

/**
 * One sub-filter option. Plain data, so a list can live in code or come from
 * an API: it matches a row holding any of `match.anyOf` in `match.field`
 * (case-insensitive). `other` instead matches rows that no other option in the
 * list matches.
 */
export interface SubFilterOption extends FilterOption {
  match?: { field: string; anyOf: string[] };
  other?: boolean;
}

/** Where a sub-filter hangs: the parent filter and the one value it opened under. */
export interface SubFilterParent {
  /** The parent's key in the Filters map. */
  key: string;
  /** The parent's data column, and how to read it. */
  column: string;
  cell_shape?: FilterCellShape;
  value_key?: string;
  /** The parent value this sub-filter belongs to. */
  token: string;
}

/**
 * What a filter asks of a row: a filter's runtime `type`, which is also its
 * picker section and search kind. resolveFilterKind decides it for an
 * attribute.
 */
export type FilterKind = "number" | "datetime" | "date" | "string" | "boolean" | "options";

/**
 * A boolean filter's value. null is "no filter"; "unknown" selects the rows
 * whose cell is empty, and is only offered on a nullable field.
 */
export type BooleanFilterValue = true | false | "unknown" | null;

/** A date filter's relative choices; see dateOnly.ts DATE_PRESETS. */
export type DatePreset = "past" | "today" | "next7" | "has" | "none";

/**
 * A `date` field's filter: a relative preset, or an inclusive range of
 * calendar days (`YYYY-MM-DD`, either end may be ""). A preset is stored as
 * its token and never as the days it resolved to, so "Today" still means today
 * tomorrow. Empty is `{ preset: null, from: "", to: "" }`.
 */
export interface DateFilterValue {
  preset: DatePreset | null;
  from: string;
  to: string;
}

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
  // Sub-filters only (see SubFilterSpec): the parent value this filter narrows
  // within, its full option list with match rules, and its toggle size.
  parent?: SubFilterParent;
  subOptions?: SubFilterOption[];
  optionSize?: FilterOptionSize;
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
  // strings) for "datetime" and "date", a distinct-value count for "string". They're
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
  | Partial<DateFilterValue>
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
