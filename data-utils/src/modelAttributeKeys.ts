import type { ModelAttribute } from "./types";

/**
 * Where a ModelAttribute key comes from.
 *
 * - `generated`: schema_utils writes it into every app's `*ModelData.js`.
 * - `hand-written`: an app sets it on an attribute it writes by hand.
 * - `react-only`: package code reads it, and an app may add it; nothing
 *   generates it.
 * - `planned`: package code reads it ahead of the generator emitting it.
 */
export type ModelAttributeKeyOrigin = "generated" | "hand-written" | "react-only" | "planned";

/**
 * Every top-level ModelAttribute key, with its origin. The `satisfies` makes
 * this the type's key list: a key declared on ModelAttribute and missing here,
 * or listed here and not declared, fails to compile. A check that the
 * generator emits no key outside this table belongs beside the generator's
 * output (tools/), which this package cannot see. Nested shapes
 * (`options_source`, `reference`, `colour_presets`) are typed, not tabled.
 */
export const MODEL_ATTRIBUTE_KEYS = {
  name: "generated",
  source: "generated",
  type: "generated",
  title: "generated",
  stats: "generated",
  unit: "generated",
  format: "generated",
  options: "generated",
  nullable: "generated",
  help_text: "generated",
  colour_presets: "generated",
  editable: "generated",
  default: "generated",
  reference: "generated",
  filter: "generated",
  filter_excluded_reason: "generated",
  filter_type: "generated",
  filter_empty: "generated",
  filter_rule: "generated",
  cell_shape: "generated",
  selection: "generated",
  display: "generated",
  value_key: "generated",
  label_key: "generated",
  primaryFilter: "generated",
  checkedValue: "generated",
  checkedLabel: "generated",
  filterOrder: "generated",
  options_source: "generated",
  endpoint: "generated",
  sortable: "generated",
  thumbnail: "generated",
  sub_fields: "generated",
  accept: "hand-written",
  description: "react-only",
  groupBy: "react-only",
  searchAliases: "react-only",
  unit_label: "planned",
  integer: "planned",
} as const satisfies Record<keyof ModelAttribute, ModelAttributeKeyOrigin>;
