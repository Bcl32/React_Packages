/** FK reference metadata for "id" type fields */
export interface ReferenceInfo {
  get_api_url: string;
  display_field: string;
}

/** Base attribute definition for a model field */
export interface ModelAttribute {
  name: string;
  /**
   * Discriminant consumed by FormElement: "string" | "number" | "boolean" |
   * "list" | "select" | "date" | "datetime" | "colour" | "colour_array" |
   * "id" | "file". `date` is a calendar day ("YYYY-MM-DD", a native date
   * input); `datetime` is the dayjs-backed date-and-time control.
   * Typed as `string` for forward-compatibility with app-specific extensions.
   */
  type: string;
  default?: unknown;
  editable?: boolean;
  help_text?: string;
  description?: string;
  options?: unknown;
  filter?: boolean;
  filter_empty?: unknown;
  filter_rule?: string;
  stats?: boolean;
  groupBy?: string;
  reference?: ReferenceInfo;
  /** HTML file-input `accept` filter, used when `type === "file"` (e.g. ".stl,.3mf"). */
  accept?: string;
  [key: string]: unknown;
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
