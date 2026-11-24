import * as React from "react";

import type { FieldBase, FieldIssue, FieldIssueCode } from "../validate/types";
import type { FieldClassNames, FieldSize } from "./style";

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
  /** Resolved: the FieldSet's prop, else the FieldStyleProvider's, else "md". */
  size: FieldSize;
  /** Resolved the same way; the control reads `control` and `input`. */
  classNames: FieldClassNames;
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

/**
 * Picks the registry key for one attribute, so a renderer can be chosen per
 * field and not only per `attr.type` ("radio-cards" for the lid's selects,
 * the built-in select for the rest). Return undefined (or null) to let the
 * type decide; a key that no registry holds is ignored the same way.
 */
export type FieldResolver<A extends FieldBase = FieldBase> = (attr: A) => string | null | undefined;

interface RegistryContextValue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: FieldRegistry<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve?: FieldResolver<any>;
}

const FieldRegistryContext = React.createContext<RegistryContextValue | null>(null);

/**
 * `first`, then `second` when it gives no key. Either may be absent; a value
 * that is not a function (an array from `.filter`) counts as absent.
 */
export function chainResolvers<A extends FieldBase>(
  first?: FieldResolver<A> | null,
  second?: FieldResolver<A> | null,
): FieldResolver<A> | undefined {
  const a = typeof first === "function" ? first : undefined;
  const b = typeof second === "function" ? second : undefined;
  if (a && b) return (attr) => a(attr) ?? b(attr);
  return a ?? b;
}

/**
 * Makes a registry visible to every `FormElement` and `FieldSet` below it,
 * including the Add / Edit / Bulk-edit forms that `@bcl32/datatable` hosts,
 * with no change to the host. Nested providers merge: the inner one wins per
 * type, and the inner `resolve` is asked first (the outer one when it gives
 * no key).
 *
 * A registered type overrides the built-in renderer of the same name for
 * everything below the provider, so mount it as low as the page allows, or
 * register the control under its own key and pick it per field with
 * `resolve`.
 */
export function FieldRegistryProvider<A extends FieldBase>({
  registry,
  resolve,
  children,
}: {
  registry?: FieldRegistry<A>;
  /** Per attribute, the registry key to draw it with (see `FieldResolver`). */
  resolve?: FieldResolver<A>;
  children: React.ReactNode;
}) {
  const parent = React.useContext(FieldRegistryContext);
  const merged = React.useMemo<RegistryContextValue>(
    () => ({
      registry: parent ? (registry ? { ...parent.registry, ...registry } : parent.registry) : (registry ?? {}),
      resolve: chainResolvers<A>(resolve, parent?.resolve),
    }),
    [parent, registry, resolve],
  );
  return <FieldRegistryContext.Provider value={merged}>{children}</FieldRegistryContext.Provider>;
}

/** The registry from the nearest `FieldRegistryProvider`, or null outside one. */
export function useFieldRegistry<A extends FieldBase = FieldBase>(): FieldRegistry<A> | null {
  return React.useContext(FieldRegistryContext)?.registry ?? null;
}

/** The nearest providers' `resolve` (inner first), or undefined. */
export function useFieldResolver<A extends FieldBase = FieldBase>(): FieldResolver<A> | undefined {
  return React.useContext(FieldRegistryContext)?.resolve;
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

/**
 * The renderer for one attribute. The key `resolve(attr)` gives is looked up
 * first, through every registry in order; then `attr.type`, the same way. So
 * a resolved key beats a registered type even in a later registry, and a key
 * no registry holds falls back to the type.
 */
export function resolveRenderer<A extends FieldBase>(
  attr: A,
  resolve: FieldResolver<A> | null | undefined,
  ...registries: (FieldRegistry<A> | null | undefined)[]
): FieldRenderer<A> | undefined {
  const key = typeof resolve === "function" ? resolve(attr) : undefined;
  if (typeof key === "string" && key) {
    const found = lookupRenderer(key, ...registries);
    if (found) return found;
  }
  return lookupRenderer(attr.type, ...registries);
}
