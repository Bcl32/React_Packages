import * as React from "react";

import type { FieldBase, FieldIssue, FieldIssueCode } from "../validate/types";

/**
 * What a registered control receives. `value` is this field's; `values` is a
 * read-only view of the whole form, for UI that depends on other fields.
 */
export interface FieldRenderProps<A extends FieldBase = FieldBase, V = unknown> {
  attr: A;
  /** The control's id, which the label names: "input_" + name by default. */
  id: string;
  name: string;
  value: V;
  onChange: (value: V) => void;
  /** Set several keys at once (a colour and its sibling `*_ids`, say). */
  onChangeMany: (patch: Record<string, unknown>) => void;
  values: Readonly<Record<string, unknown>>;
  onBlur?: () => void;
  /** The field has an issue to show; set `aria-invalid` from it. */
  invalid: boolean;
  /** Ids of the hint and the error, for `aria-describedby`. */
  describedBy?: string;
  /** For a control that holds text it cannot yet read (the number box's "1e"): why, or null once it can. */
  onParseError?: (reason: FieldIssueCode | null) => void;
}

export interface FieldRenderer<A extends FieldBase = FieldBase, V = unknown> {
  /**
   * A function component (memo and forwardRef ones fit). Typed as a call
   * signature rather than ComponentType so a registry written for any
   * descriptor type merges with `lightRenderers` without a cast.
   */
  Control: (props: FieldRenderProps<A, V>) => React.ReactNode;
  /**
   * How the shell labels the control:
   * - "label" (default): a `<label for={id}>` above it;
   * - "legend": a `<fieldset>` with a `<legend>`, for a group of inputs (radios, swatches);
   * - "inline": the control first, then its label on the same line (a checkbox);
   * - "none": the control draws its own label.
   */
  labelAs?: "label" | "legend" | "inline" | "none";
  /** What counts as empty for `required` (default: `isEmptyValue` from `./validate`). */
  isEmpty?: (value: V) => boolean;
  /** An extra rule for this type, run by `validate` after the generic ones. */
  validate?: (attr: A, value: V, values: Readonly<Record<string, unknown>>) => FieldIssue | null;
}

/** Renderers by field type. A registered type overrides a built-in one of the same name. */
export type FieldRegistry<A extends FieldBase = FieldBase> = Readonly<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, FieldRenderer<A, any> | undefined>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FieldRegistryContext = React.createContext<FieldRegistry<any> | null>(null);

/**
 * Makes a registry visible to every `FormElement` and `FieldSet` below it,
 * including the Add / Edit / Bulk-edit forms that `@bcl32/datatable` hosts,
 * with no change to the host. Nested providers merge: the inner one wins per
 * type.
 *
 * A registered type overrides the built-in renderer of the same name for
 * everything below the provider, so mount it as low as the page allows.
 */
export function FieldRegistryProvider<A extends FieldBase>({
  registry,
  children,
}: {
  registry: FieldRegistry<A>;
  children: React.ReactNode;
}) {
  const parent = React.useContext(FieldRegistryContext);
  const merged = React.useMemo(() => (parent ? { ...parent, ...registry } : registry), [parent, registry]);
  return <FieldRegistryContext.Provider value={merged}>{children}</FieldRegistryContext.Provider>;
}

/** The registry from the nearest `FieldRegistryProvider`, or null outside one. */
export function useFieldRegistry<A extends FieldBase = FieldBase>(): FieldRegistry<A> | null {
  return React.useContext(FieldRegistryContext);
}

/** One registry from several; later ones win per type. */
export function mergeRegistries<A extends FieldBase>(
  ...registries: (FieldRegistry<A> | null | undefined)[]
): FieldRegistry<A> {
  return Object.assign({}, ...registries.filter(Boolean));
}

/**
 * The renderer for a type: the prop registry, then the context one. Only a
 * plain object counts as a registry, so a stray second argument (an array
 * index from `.filter(fn)`) is ignored.
 */
export function lookupRenderer<A extends FieldBase>(
  type: string,
  ...registries: (FieldRegistry<A> | null | undefined)[]
): FieldRenderer<A> | undefined {
  for (const registry of registries) {
    // Own keys only: a type called "constructor" is not Object.prototype's.
    if (registry && typeof registry === "object" && Object.prototype.hasOwnProperty.call(registry, type)) {
      const found = registry[type];
      if (found) return found;
    }
  }
  return undefined;
}
