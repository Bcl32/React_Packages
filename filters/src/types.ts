// Core filter types used across the package

import type * as React from "react";
import type {
  AttributeFilterType,
  ColourPresetsConfig,
  FilterCellShape,
  FilterDisplay,
  FilterSelection,
  ModelAttribute,
} from "@bcl32/data-utils";

// The attribute's own vocabulary lives in data-utils, beside ModelAttribute,
// and is re-exported here so imports from @bcl32/filters keep working.
export type {
  AttributeFilterType,
  ColourPresetsConfig,
  FilterCellShape,
  FilterDisplay,
  FilterSelection,
} from "@bcl32/data-utils";

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
export interface OptionsSubFilterSpec {
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

/**
 * A sub-filter the app draws and matches itself: a control that is not a
 * toggle group (a footprint grid, a colour wheel, a calendar) hanging under
 * one parent value like any other sub-filter — same scoping, chip, ordering
 * and reset. `build` sees only the rows in that value, so it can size its
 * control from the data (the largest footprint among the Gridfinity parts),
 * and returns null where the value gets no such filter (a system that is not
 * Gridfinity). A parent field may carry several specs; each custom one needs
 * an `id`, which becomes part of the sub-filter's key.
 */
export interface CustomSubFilterSpec {
  /** Distinguishes this sub-filter from its siblings under the same value. */
  id: string;
  build: (parent: SubFilterParentOption, rows: Record<string, unknown>[]) => CustomFilterBuild | null;
  /** The card's heading; defaults to the parent value's label. */
  title?: (parent: SubFilterParentOption) => string;
}

export type SubFilterSpec = OptionsSubFilterSpec | CustomSubFilterSpec;

/** What a CustomSubFilterSpec builds: the idle value plus the filter's behaviour. */
export interface CustomFilterBuild<V = unknown> extends CustomFilterDef<V> {
  /** The "no filter" value; cloned into `value` and `filter_empty`. */
  empty: V;
}

/**
 * A `custom` filter's behaviour, supplied by the app and carried on the
 * FilterValue (`custom`). The package calls these the way it calls its own
 * predicates: `isActive` decides whether the chip shows and the rows are
 * tested, `rowTest` is the per-row test while active, `describe` is the chip
 * text, and `component` draws the card. `data` is whatever the component
 * wants to read back (a domain, counts) — the package never looks at it.
 */
export interface CustomFilterDef<V = unknown> {
  component: React.ComponentType<CustomFilterProps>;
  // Method signatures, not function-typed properties: TypeScript checks
  // methods bivariantly, so an app's `isActive(v: Range)` fits the package's
  // `unknown`-valued FilterValue without a cast at every spec.
  isActive(value: V): boolean;
  rowTest(value: V, row: Record<string, unknown>): boolean;
  describe(value: V): string;
  data?: unknown;
  /**
   * `"half"`: the card takes the right half of the filter panel instead of
   * one column — for a control that needs the room (a 20-step strip with a
   * row of toggles under it). Cards keep their order; the one before it
   * fills the left half, and anything that does not fit beside it moves
   * down. Omit for an ordinary one-column card.
   */
  width?: "half";
}

/** What a custom filter's component receives; it reads its value from useFilterContext. */
export interface CustomFilterProps {
  /** The filter's key in the Filters map. */
  name: string;
  title?: string;
  /** Supplied for user-added instances — renders the ✕ that drops the slot. */
  onRemove?: () => void;
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
export type FilterKind = AttributeFilterType | "custom";

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
  // `custom` filters only: the app-supplied control and predicate.
  custom?: CustomFilterDef;
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

/** One filter as FilterElement draws it: its value plus its key in the Filters map. */
export type FilterData = FilterValue & { name: string };

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
