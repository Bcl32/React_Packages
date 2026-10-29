/** FK reference metadata for "id" type fields */
export interface ReferenceInfo {
  get_api_url: string;
  display_field: string;
  /** A second field that tells two same-named rows apart (a room's floor). */
  detail_field?: string;
}

/**
 * How a filter is drawn. Options filters use the first five; a boolean filter
 * is drawn as "segmented" (Any / Yes / No, the default) or "checkbox" (one
 * side only, set per field with checkedValue and checkedLabel). Re-exported by
 * `@bcl32/filters`.
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
 * What the generator writes as `filter_type`. `@bcl32/filters`' FilterKind is
 * this plus "custom", which only an app-built filter has.
 */
export type AttributeFilterType = "string" | "number" | "datetime" | "date" | "boolean" | "options";

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

/**
 * Where an attribute's options come from. The same shape as `@bcl32/hooks`'
 * OptionsSource, which documents each key; declared here rather than imported
 * because hooks does not depend on data-utils.
 */
export interface AttributeOptionsSource {
  url?: string;
  value_key?: string;
  label_key?: string;
  fallback_label_key?: string;
  detail_key?: string;
  none_label?: string;
}

/** Every `type` the generator writes, plus `file`, which only hand-written attributes use. */
export type AttributeType =
  | "string"
  | "textarea"
  | "number"
  | "number_list"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "single_combobox"
  | "list"
  | "colour"
  | "colour_array"
  | "children"
  | "id_list"
  | "id"
  | "object"
  | "array"
  | "relation_collection"
  | "file";

/**
 * Base attribute definition for a model field: every key schema_utils writes,
 * plus the few that hand-written attributes and package code use. No index
 * signature, so a misspelt key is an error; MODEL_ATTRIBUTE_KEYS
 * (modelAttributeKeys.ts) lists them all with where each comes from.
 */
export interface ModelAttribute {
  name: string;
  /**
   * The discriminant FormElement switches on. `date` is a calendar day
   * ("YYYY-MM-DD", a native date input); `datetime` is the dayjs-backed
   * date-and-time control. Open to any other string, so an app can extend it.
   */
  type: AttributeType | (string & {});
  title?: string;
  /** "db" for the columns the database fills (id, time_created, time_updated). */
  source?: "main" | "db";
  // Forms
  editable?: boolean;
  default?: unknown;
  help_text?: string;
  /** The schema allows null. Written only when true. */
  nullable?: boolean;
  /** `{value, label}` pairs on a select; plain strings on a single_combobox. */
  options?: { value: string; label: string }[] | string[];
  reference?: ReferenceInfo;
  colour_presets?: ColourPresetsConfig;
  unit?: string;
  format?: "bytes";
  // Filters
  filter?: boolean;
  filter_type?: AttributeFilterType;
  filter_empty?: unknown;
  /** null on datetime and date filters; absent on booleans. */
  filter_rule?: string | null;
  filter_excluded_reason?: string;
  cell_shape?: FilterCellShape;
  selection?: FilterSelection;
  display?: FilterDisplay;
  value_key?: string;
  label_key?: string;
  checkedValue?: boolean;
  checkedLabel?: string;
  primaryFilter?: boolean;
  filterOrder?: number;
  options_source?: AttributeOptionsSource;
  // relation_collection
  endpoint?: string;
  sortable?: boolean;
  thumbnail?: boolean;
  sub_fields?: ModelAttribute[];
  // Not generated
  /** HTML file-input `accept` filter, used when `type === "file"` (e.g. ".stl,.3mf"). */
  accept?: string;
  /** Other words the filter search matches this field by. */
  searchAliases?: string[];
  /** The suffix formatNumber prints when asked for a unit. Nothing emits it yet. */
  unit_label?: string;
  /** @deprecated Generated attributes carry `help_text`; nothing sets this. */
  description?: string;
  stats?: unknown;
  /** @deprecated Nothing emits or sets it. */
  groupBy?: string;
}

/** Model definition with attributes and optional API endpoints */
export interface ModelData {
  model_name?: string;
  model_attributes: ModelAttribute[];
  add_api_url?: string;
  update_api_url?: string;
  delete_api_url?: string;
  /**
   * Emitted only when the API really has a bulk-update route; absent means
   * there is none. Read it through {@link resolveBulkUpdateUrl} rather than
   * directly, so the "presence is the capability" rule stays in one place —
   * and so a hand-built ModelData that omits it reads as "no bulk route"
   * everywhere at once.
   */
  bulk_update_api_url?: string;
  /** The plural the pages print ("Browse Widgets by"). */
  set_name?: string;
  /** Attribute names the model's charts are drawn for. */
  chart_filters?: string[];
  api_url_base?: string;
  get_api_url?: string;
  [key: string]: unknown;
}

/** Standard row shape for data tables */
export interface RowData {
  id: string | number;
  time_created?: string;
  time_updated?: string;
  /**
   * Attribution ids stamped server-side by `bcl32-auth`'s `before_flush`
   * listener — a `users.id` UUID, or null on rows written before the
   * attribution migration (and on system writes with no identity bound).
   *
   * Declared explicitly rather than left to the index signature so
   * `@bcl32/datatable`'s `AttributionContext` can read them type-safely.
   */
  created_by?: string | null;
  updated_by?: string | null;
  [key: string]: unknown;
}
