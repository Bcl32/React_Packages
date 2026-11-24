import { toNumberValue, withinBounds } from "@bcl32/data-utils/numbers";

import type { FieldBase, FieldIssue, RuleSource, ValidateOptions } from "./types";

/**
 * A string's length the way Python's `len()`, Pydantic's `max_length` and
 * JSON Schema's `maxLength` count it: code points, after NFC normalisation.
 * JS's own `.length` counts UTF-16 units, so "😀".length is 2; this is 1.
 * NFC first, so "é" typed as e + a combining accent counts once.
 */
export function textLength(s: string): number {
  // Array.from walks code points, not UTF-16 units.
  return Array.from(s.normalize("NFC")).length;
}

/**
 * Empty, for `required`: no value (undefined or null), an empty string, or
 * an empty list. `false` and `0` are values.
 */
export function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

// A pattern compiles once. null: neither with nor without the `u` flag, so the
// client does not check it (the server stays the authority) and never throws.
const compiled = new Map<string, RegExp | null>();

function patternRegExp(pattern: string): RegExp | null {
  if (compiled.has(pattern)) return compiled.get(pattern)!;
  let re: RegExp | null = null;
  for (const flags of ["u", ""]) {
    try {
      re = new RegExp(pattern, flags);
      break;
    } catch {
      // try the next dialect
    }
  }
  compiled.set(pattern, re);
  return re;
}

function decimalsOf(attr: RuleSource): number | undefined {
  if (typeof attr.decimals === "number") return attr.decimals;
  return attr.format === "money" ? 2 : undefined;
}

function fitsDecimals(value: number, decimals: number): boolean {
  return Number.isInteger(+(value * 10 ** decimals).toPrecision(15));
}

function numberIssue(attr: RuleSource, value: unknown): FieldIssue | null {
  const n = toNumberValue(value);
  if (n === null) return { code: "invalid" };
  if (attr.integer && !Number.isInteger(n)) return { code: "fraction" };
  const decimals = decimalsOf(attr);
  if (decimals !== undefined && !fitsDecimals(n, decimals)) return { code: "decimals" };
  if (!withinBounds(n, attr)) return { code: "range" };
  return null;
}

function stringIssue<A extends RuleSource>(attr: A, value: string, opts: ValidateOptions<A>): FieldIssue | null {
  const nfc = value.normalize("NFC");
  if (attr.min_length !== undefined || attr.max_length !== undefined) {
    const length = textLength(nfc);
    if (typeof attr.min_length === "number" && length < attr.min_length) return { code: "too_short", min: attr.min_length };
    if (typeof attr.max_length === "number" && length > attr.max_length) return { code: "too_long", max: attr.max_length };
  }
  const policy = attr.charset ? opts.charsets?.[attr.charset] : undefined;
  if (policy) {
    const bad: string[] = [];
    for (const ch of nfc) {
      if (!policy(ch.codePointAt(0)!) && !bad.includes(ch)) bad.push(ch);
    }
    if (bad.length) return { code: "charset", chars: bad };
  }
  if (attr.pattern) {
    const re = patternRegExp(attr.pattern);
    if (re && !re.test(attr.normalise === "NFC" ? nfc : value)) return { code: "pattern" };
  }
  return null;
}

function optionIssue(attr: RuleSource, value: string): FieldIssue | null {
  if (attr.type !== "select" || !Array.isArray(attr.options)) return null;
  const ok = attr.options.some((o) => (typeof o === "string" ? o : o.value) === value);
  return ok ? null : { code: "not_an_option" };
}

function asIssue(found: FieldIssue | FieldIssue["code"] | null | undefined): FieldIssue | null {
  if (!found) return null;
  return typeof found === "string" ? ({ code: found } as FieldIssue) : found;
}

/**
 * The first reason one field's value would be refused, or null. In order:
 * the number box's parse error, then emptiness (`required`; a non-nullable
 * number that is null; a string with `min_length` ≥ 1 that is ""), then the
 * type's rules (number bounds, string length / charset / pattern, a select's
 * options), then the registry's rule for the type. An empty optional value
 * passes the type rules: "" is "no value" here, as admin forms send it.
 */
export function validateField<A extends RuleSource>(
  attr: A,
  value: unknown,
  values: Readonly<Record<string, unknown>> = {},
  opts: ValidateOptions<A> = {},
): FieldIssue | null {
  const parsed = asIssue(opts.parseErrors?.[attr.name]);
  if (parsed) return parsed;
  if (value === undefined && opts.skipUntouched) return null;

  const registry = opts.registry;
  const renderer = registry && Object.prototype.hasOwnProperty.call(registry, attr.type) ? registry[attr.type] : undefined;
  const empty = renderer?.isEmpty ? renderer.isEmpty(value) : isEmptyValue(value);
  if (empty) {
    if (attr.required) return { code: "required" };
    if (attr.type === "number" && value === null && attr.nullable !== true) return { code: "required" };
    if (value === "" && typeof attr.min_length === "number" && attr.min_length >= 1) return { code: "required" };
  } else {
    const typeIssue =
      attr.type === "number"
        ? numberIssue(attr, value)
        : typeof value === "string"
          ? (stringIssue(attr, value, opts) ?? optionIssue(attr, value))
          : null;
    if (typeIssue) return typeIssue;
  }

  return renderer?.validate?.(attr, value, values) ?? null;
}

/**
 * Every field's first issue, by name: `validateField` per attribute, then the
 * cross-field rules, which only add to fields that have no issue yet (the
 * first issue per field wins). Fields with `editable: false`, and those
 * `only` excludes, are skipped, by the cross-field rules too. Pure: safe in
 * Node, on a server, in a worker.
 */
export function validate<A extends RuleSource>(
  attrs: readonly A[],
  values: Readonly<Record<string, unknown>>,
  opts: ValidateOptions<A> = {},
): Record<string, FieldIssue> {
  const issues: Record<string, FieldIssue> = {};
  const checked = (attr: FieldBase) => attr.editable !== false && (!opts.only || opts.only(attr.name));
  for (const attr of attrs) {
    if (!checked(attr)) continue;
    const issue = validateField(attr, values[attr.name], values, opts);
    if (issue) issues[attr.name] = issue;
  }
  for (const rule of opts.crossField ?? []) {
    for (const { field, issue } of rule(values, attrs)) {
      if (issues[field]) continue;
      const attr = attrs.find((a) => a.name === field);
      if (attr ? !checked(attr) : opts.only && !opts.only(field)) continue;
      issues[field] = issue;
    }
  }
  return issues;
}
