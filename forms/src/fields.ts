/**
 * @bcl32/forms/fields — the light field layer: one field contract for admin
 * CRUD forms and customer-facing forms on a prerendered page.
 *
 * Renders on a server with no providers. It must never import @bcl32/hooks,
 * react-query, sonner, dayjs, Combobox, DateTimePicker, Tooltip,
 * RelationCollectionField or ColourField; fields.imports.test.ts walks the
 * import graph and fails if it does.
 */
export { FieldInput } from "./fields/FieldInput";
export type { FieldInputProps, NumberFieldError } from "./fields/FieldInput";
export { FieldShell } from "./fields/FieldShell";
export type { FieldShellProps } from "./fields/FieldShell";
export { FieldSet, useFieldSetState } from "./fields/FieldSet";
export type { FieldSetProps, ShowErrors } from "./fields/FieldSet";
export { FieldRegistryProvider, useFieldRegistry, mergeRegistries } from "./fields/registry";
export type { FieldRegistry, FieldRenderer, FieldRenderProps } from "./fields/registry";
export { lightRenderers } from "./fields/lightRenderers";
export type { FieldBase, FieldIssue, FieldIssueCode } from "./validate/types";
