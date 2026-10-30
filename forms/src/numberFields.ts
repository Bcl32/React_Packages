import * as React from "react";

import type { ModelAttribute } from "@bcl32/data-utils";
import { toNumberValue } from "@bcl32/data-utils/numbers";

import type { NumberFieldError } from "./FieldInput";

/**
 * Why a form refuses to submit a field: its text is not a number ("invalid"),
 * a fraction on an integer field, or an emptied number the column can't hold.
 *
 * Internal to the package: not re-exported from the barrel.
 */
export type FieldError = NumberFieldError | "required";

/** The inline message under a field. */
export function fieldErrorText(label: string, error: FieldError): string {
  if (error === "required") return `${label} is required`;
  if (error === "fraction") return "Whole numbers only";
  return "Not a number";
}

/**
 * The fields a submit would send wrongly, by name. A number the person emptied
 * is null in form state (never "" and never undefined, which is "untouched");
 * null for a field whose schema is not `nullable` would be refused, or fail at
 * the database, so the form says so first. `only` narrows to the fields being
 * sent (bulk edit's ticked ones).
 */
export function fieldErrors(
  attrs: ModelAttribute[],
  formData: Record<string, unknown>,
  parseErrors: Record<string, NumberFieldError | undefined>,
  only?: (name: string) => boolean,
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};
  for (const attr of attrs) {
    if (!attr.editable || (only && !only(attr.name))) continue;
    const parseError = parseErrors[attr.name];
    if (parseError) errors[attr.name] = parseError;
    else if (attr.type === "number" && formData[attr.name] === null && attr.nullable !== true) {
      errors[attr.name] = "required";
    }
  }
  return errors;
}

/**
 * A row or a set of defaults with every number field as `number | null`: a
 * Decimal's "12.50" becomes 12.5 and a default's "0" becomes 0. A form starts
 * from this AND diffs against it, so a retyped value is never a change. Absent
 * keys stay absent: undefined is "untouched", and an Add omits it.
 */
export function normaliseNumbers<T extends Record<string, unknown>>(row: T, attrs: ModelAttribute[]): T {
  let out: T | null = null;
  for (const attr of attrs) {
    if (attr.type !== "number" || row[attr.name] === undefined) continue;
    const value = toNumberValue(row[attr.name]);
    if (value === row[attr.name]) continue;
    out ??= { ...row };
    (out as Record<string, unknown>)[attr.name] = value;
  }
  return out ?? row;
}

/** Each number field's parse error, as FieldInput's `onInvalid` reports it. */
export function useParseErrors() {
  const [parseErrors, setParseErrors] = React.useState<Record<string, NumberFieldError | undefined>>({});
  const onFieldError = React.useCallback((name: string, reason: NumberFieldError | null) => {
    setParseErrors((prev) => {
      if ((prev[name] ?? null) === reason) return prev;
      const next = { ...prev };
      if (reason) next[name] = reason;
      else delete next[name];
      return next;
    });
  }, []);
  return { parseErrors, onFieldError };
}
