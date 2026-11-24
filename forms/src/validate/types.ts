/**
 * The validation vocabulary, shared by `@bcl32/forms/validate` (pure, no
 * React) and `@bcl32/forms/fields` (the renderer registry). Types only.
 */

/**
 * The least a field descriptor carries. Structural: a generated
 * `ModelAttribute` satisfies it, and so does an app's own hand-written
 * descriptor type, which may add whatever keys its renderers read.
 */
export interface FieldBase {
  name: string;
  type: string;
  title?: string;
  help_text?: string;
  nullable?: boolean;
  editable?: boolean;
}

/**
 * The keys the rules read. Numbers use the keys schema_utils already writes;
 * the string keys (`min_length`, `max_length`, `pattern`) and `required` /
 * `charset` / `normalise` are read when present, so a hand-written
 * descriptor can carry them today without any change to `ModelAttribute`.
 */
export interface RuleSource extends FieldBase {
  // numbers (generated)
  min?: number;
  max?: number;
  min_exclusive?: boolean;
  max_exclusive?: boolean;
  integer?: boolean;
  decimals?: number;
  format?: string;
  // strings
  /**
   * Counted in code points after NFC (`textLength`). Plain Pydantic counts code
   * points without NFC, so the server must normalise first to agree.
   */
  min_length?: number;
  max_length?: number;
  /** Searched, not anchored, like Pydantic and JSON Schema: anchor it with ^…$ to match whole values. */
  pattern?: string;
  // hand-written descriptors
  /** Empty (`isEmptyValue`, or the renderer's `isEmpty`) is refused. */
  required?: boolean;
  /** A named policy, looked up in `ValidateOptions.charsets`. */
  charset?: string;
  /** "NFC": the pattern is tested against the NFC form. Lengths and charsets always use it. */
  normalise?: "NFC";
  options?: readonly ({ value: string; label: string } | string)[];
}

/** Today's number-box reasons, as `parseNumber` and `fieldErrors` report them. */
export type NumberIssueCode = "invalid" | "fraction" | "decimals" | "range";

/** An app's own rule ("x-fits", "x-min-stroke"). `message`, when set, is what `issueText` shows. */
export interface CustomIssue {
  code: `x-${string}`;
  message?: string;
  [key: string]: unknown;
}

/** Why a field's value would be refused. Carries what the message needs, never the value itself. */
export type FieldIssue =
  | { code: "required" }
  | { code: NumberIssueCode }
  | { code: "too_short"; min: number }
  | { code: "too_long"; max: number }
  | { code: "pattern" }
  /** The offending characters, de-duplicated, in the order they first appear. */
  | { code: "charset"; chars: string[] }
  | { code: "not_an_option" }
  | CustomIssue;

export type FieldIssueCode = FieldIssue["code"];

/** Whether one code point is allowed. */
export type CharsetPolicy = (codePoint: number) => boolean;

/**
 * What `validate` reads from a renderer registry: per type, how emptiness is
 * judged and an extra rule. A `FieldRegistry` from `@bcl32/forms/fields`
 * satisfies it; validate itself never imports React.
 */
export type RuleRegistry<A extends FieldBase = RuleSource> = Readonly<
  Record<
    string,
    | {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isEmpty?: (value: any) => boolean;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        validate?: (attr: A, value: any, values: Readonly<Record<string, unknown>>) => FieldIssue | null;
      }
    | undefined
  >
>;

/** A rule over several fields. Returns the issues it finds, each against one field. */
export type CrossFieldRule<A extends FieldBase = RuleSource> = (
  values: Readonly<Record<string, unknown>>,
  attrs: readonly A[],
) => { field: string; issue: FieldIssue }[];

export interface ValidateOptions<A extends FieldBase = RuleSource> {
  /** Check only these fields: bulk edit's ticked ones, an edit's changed ones. */
  only?: (name: string) => boolean;
  /** Text a number box could not read, by field (FieldInput's `onInvalid` reasons fit as they are). */
  parseErrors?: Readonly<Record<string, FieldIssueCode | FieldIssue | null | undefined>>;
  /** Named charset policies, for descriptors with `charset`. A name with no policy is not checked. */
  charsets?: Readonly<Record<string, CharsetPolicy>>;
  /** Per-type `isEmpty` and `validate` (a `FieldRegistry` fits). */
  registry?: RuleRegistry<A>;
  /**
   * The registry key per attribute, as `FieldSet`'s `resolve` picks it: its
   * entry's `isEmpty` / `validate` are used, else the one for `attr.type`.
   * The generic rules (a select's options, say) still go by `attr.type`.
   */
  resolve?: (attr: A) => string | null | undefined;
  crossField?: readonly CrossFieldRule<A>[];
  /**
   * `undefined` is "untouched". By default a `required` field that is
   * untouched is empty; with this set, untouched fields are not checked at all
   * (an edit form that sends only what changed).
   */
  skipUntouched?: boolean;
  /**
   * Strip leading and trailing whitespace from a string before the required,
   * length, charset and pattern checks, as Pydantic's `str_strip_whitespace`
   * does (Unicode White_Space, the set Rust's `trim` uses). Default false: the
   * value is checked as typed. The value in the form is never changed.
   */
  trim?: boolean;
}
