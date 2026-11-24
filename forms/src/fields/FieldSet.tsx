import * as React from "react";

import { fieldLabel } from "../fieldLabel";
import { issueText } from "../validate/issueText";
import type { FieldBase, FieldIssue, FieldIssueCode } from "../validate/types";
import { lightRenderers } from "./lightRenderers";
import { RegisteredField } from "./RegisteredField";
import { lookupRenderer, useFieldRegistry, type FieldRegistry } from "./registry";

export type ShowErrors = "always" | "touched" | "submitted";

export interface FieldSetProps<A extends FieldBase, V extends Record<string, unknown>> {
  attrs: readonly A[];
  /** Controlled; never mutated. */
  value: V;
  /** A NEW object every time, with the names of the keys that changed. */
  onChange: (next: V, changed: string[]) => void;
  /** Issues by field (from `validate`), or already-worded strings. */
  errors?: Readonly<Partial<Record<string, FieldIssue | string | null>>>;
  /**
   * When an error shows: "touched" (default) once its field has changed or
   * lost focus, or after a submit; "submitted" only after a submit;
   * "always" at once (its text uses Intl, so avoid it on prerendered pages).
   */
  showErrors?: ShowErrors;
  submitted?: boolean;
  /** Touched fields, when the page tracks them (`useFieldSetState`); otherwise FieldSet does. */
  touched?: Readonly<Record<string, boolean>>;
  onBlur?: (name: string) => void;
  onParseError?: (name: string, reason: FieldIssueCode | null) => void;
  /** Over the context registry, over `lightRenderers`. */
  renderers?: FieldRegistry<A>;
  /** Which attrs to draw; default `attr.editable !== false`. An attr with no renderer is skipped. */
  filter?: (attr: A) => boolean;
  /** Control ids are idPrefix + name. Default "input_". */
  idPrefix?: string;
  /** After each label; default "". */
  labelSuffix?: string;
  /** Layout: given the drawn fields in order. Default: a vertical stack. */
  children?: (fields: { attr: A; node: React.ReactNode }[]) => React.ReactNode;
}

const defaultFilter = (attr: FieldBase) => attr.editable !== false;

/**
 * A controlled group of fields for any descriptor type: each attr's renderer
 * (props, then context, then `lightRenderers`) inside a label / hint / error
 * shell. No `<form>`, no submit, no fetch, no toast: the page owns those.
 * Renders on a server with no providers.
 */
export function FieldSet<A extends FieldBase, V extends Record<string, unknown>>({
  attrs,
  value,
  onChange,
  errors,
  showErrors = "touched",
  submitted = false,
  touched: touchedProp,
  onBlur,
  onParseError,
  renderers,
  filter = defaultFilter,
  idPrefix = "input_",
  labelSuffix = "",
  children,
}: FieldSetProps<A, V>) {
  const context = useFieldRegistry<A>();
  const [ownTouched, setOwnTouched] = React.useState<Record<string, boolean>>({});
  const touched = touchedProp ?? ownTouched;
  const touch = (names: string[]) => {
    if (touchedProp) return;
    setOwnTouched((prev) => (names.every((n) => prev[n]) ? prev : { ...prev, ...Object.fromEntries(names.map((n) => [n, true])) }));
  };

  const fields: { attr: A; node: React.ReactNode }[] = [];
  for (const attr of attrs) {
    if (!filter(attr)) continue;
    const renderer = lookupRenderer<A>(attr.type, renderers, context, lightRenderers);
    if (!renderer) continue;
    const name = attr.name;
    const label = fieldLabel(attr);
    const issue = errors?.[name];
    const visible =
      showErrors === "always" || submitted || (showErrors === "touched" && !!touched[name]);
    const error = issue && visible ? (typeof issue === "string" ? issue : issueText(label, issue, attr)) : undefined;
    const set = (patch: Record<string, unknown>) => {
      const changed = Object.keys(patch);
      touch(changed);
      onChange({ ...value, ...patch }, changed);
    };
    fields.push({
      attr,
      node: (
        <RegisteredField<A>
          key={name}
          renderer={renderer}
          attr={attr}
          id={idPrefix + name}
          label={label}
          labelSuffix={labelSuffix}
          value={value[name]}
          values={value}
          onChange={(next) => set({ [name]: next })}
          onChangeMany={set}
          onBlur={() => {
            touch([name]);
            onBlur?.(name);
          }}
          onParseError={onParseError ? (reason) => onParseError(name, reason) : undefined}
          error={error}
        />
      ),
    });
  }

  if (children) return <>{children(fields)}</>;
  return <div className="space-y-4">{fields.map((f) => f.node)}</div>;
}

/**
 * The state a FieldSet page needs, without a form library: the value,
 * touched fields, whether a submit was tried, and the number boxes' parse
 * errors (pass them to `validate` as `parseErrors`). `bind` spreads onto
 * FieldSet.
 */
export function useFieldSetState<V extends Record<string, unknown>>(initial: V | (() => V)) {
  const [value, setValue] = React.useState<V>(initial);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [parseErrors, setParseErrors] = React.useState<Record<string, FieldIssueCode | undefined>>({});

  const markTouched = React.useCallback((names: string[]) => {
    setTouched((prev) => (names.every((n) => prev[n]) ? prev : { ...prev, ...Object.fromEntries(names.map((n) => [n, true])) }));
  }, []);
  const onChange = React.useCallback(
    (next: V, changed: string[]) => {
      setValue(next);
      markTouched(changed);
    },
    [markTouched],
  );
  const onBlur = React.useCallback((name: string) => markTouched([name]), [markTouched]);
  const onParseError = React.useCallback((name: string, reason: FieldIssueCode | null) => {
    setParseErrors((prev) => {
      if ((prev[name] ?? null) === reason) return prev;
      const next = { ...prev };
      if (reason) next[name] = reason;
      else delete next[name];
      return next;
    });
  }, []);
  const markSubmitted = React.useCallback(() => setSubmitted(true), []);
  const reset = React.useCallback((next: V) => {
    setValue(next);
    setTouched({});
    setSubmitted(false);
    setParseErrors({});
  }, []);

  return {
    value,
    setValue,
    touched,
    submitted,
    markSubmitted,
    parseErrors,
    onParseError,
    reset,
    bind: { value, onChange, touched, onBlur, submitted, onParseError },
  };
}
