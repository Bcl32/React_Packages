import type { ModelAttribute } from "./types";

/**
 * One way to turn a field's number into text, for every package that prints
 * one. Pure and React-free, so pure code (FilterSearch, tests, Node scripts)
 * can call it too.
 *
 * Two forms:
 * - exact (default): a value someone set or typed. At most 3 decimals from 1
 *   upward, 3 significant digits below 1, thousands separators, no trailing
 *   zeros. Never rounds a large integer (1,249,999 stays 1,249,999).
 * - compact: browsing a column's spread. 10K and up abbreviate ("1.2M"), 100
 *   and up round to a whole number, below that 3 significant digits.
 *
 * Anything that isn't a finite number prints "—". Strings are not coerced: a
 * "12" in a number column is a leak worth seeing, not a value to hide.
 */

/** How a unit is shown. Supplied per attribute once units can be switched (R8). */
export interface UnitAdapter {
  /** Shown after the number when `unit` is on, e.g. "in". */
  suffix?: string;
  /** Stored value → displayed value, e.g. cm → in. */
  toDisplay?: (value: number) => number;
  /** Displayed value → stored value, for typed input. */
  fromDisplay?: (value: number) => number;
  /** The whole text, for units that are not a number plus a suffix (6'10"). */
  format?: (value: number) => string;
  /**
   * Typed display text → stored value, for units whose text is not a plain
   * number (6'10"). Replaces parseNumber's own reading when present; the text
   * arrives trimmed and never empty.
   */
  parse?: (text: string, attr?: ModelAttribute) => ParseResult;
  /**
   * The text an editable box starts from: exact, and read back unchanged by
   * `parse` (never compact). Without it a box shows the displayed number.
   */
  formatEditable?: (value: number) => string;
  /** One nudge, in stored units (½″ as 1.27 cm). Overrides the range-derived step. */
  step?: number;
}

/**
 * What a typed number means. `null` is an empty box — "no value", which is
 * neither 0 nor "" — and an unreadable one is an error, never a silent clear.
 */
export type ParseResult =
  | { ok: true; value: number | null }
  | { ok: false; reason: "invalid" | "fraction" };

export interface FormatNumberOptions {
  /** Abbreviate for browsing (default false: exact). */
  compact?: boolean;
  /**
   * Print the unit after the number (default false). While titles still carry
   * the unit ("Ceiling height (cm)"), a suffix would repeat it.
   */
  unit?: boolean;
  adapter?: UnitAdapter | null;
  /** Default "en-CA": pinned so output does not depend on the browser. */
  locale?: string;
}

const DEFAULT_LOCALE = "en-CA";
const BLANK = "—";

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, kind: "fraction" | "significant" | "compact"): Intl.NumberFormat {
  const key = `${locale}|${kind}`;
  let nf = formatters.get(key);
  if (!nf) {
    const options: Intl.NumberFormatOptions =
      kind === "fraction"
        ? { maximumFractionDigits: 3 }
        : kind === "significant"
          ? { maximumSignificantDigits: 3 }
          : { notation: "compact", maximumFractionDigits: 1 };
    nf = new Intl.NumberFormat(locale, options);
    formatters.set(key, nf);
  }
  return nf;
}

function exactBody(value: number, locale: string): string {
  const kind = Math.abs(value) >= 1 || value === 0 ? "fraction" : "significant";
  return formatter(locale, kind).format(value);
}

function compactBody(value: number, locale: string): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 10000) return formatter(locale, "compact").format(value);
  if (magnitude >= 100 || Number.isInteger(value)) return String(Math.round(value));
  return String(+value.toPrecision(3));
}

/**
 * The suffix, or undefined. The attribute's `unit` is a UCUM code ("mm3",
 * "d"), not something to show, so only a display label counts: the adapter's
 * suffix, else the attribute's `unit_label`.
 */
function unitSuffix(attr: ModelAttribute | undefined, opts: FormatNumberOptions): string | undefined {
  if (!opts.unit) return undefined;
  if (opts.adapter?.suffix) return opts.adapter.suffix;
  return attr?.unit_label || undefined;
}

function body(value: unknown, opts: FormatNumberOptions): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return BLANK;
  const adapter = opts.adapter;
  if (adapter?.format) return adapter.format(value);
  // + 0 turns -0 into 0; Intl would print "-0".
  const shown = (adapter?.toDisplay ? adapter.toDisplay(value) : value) + 0;
  const locale = opts.locale ?? DEFAULT_LOCALE;
  return opts.compact ? compactBody(shown, locale) : exactBody(shown, locale);
}

/** One number as text, e.g. `12.346`, `1.2M` (compact), `—` (missing). */
export function formatNumber(
  value: unknown,
  attr?: ModelAttribute,
  opts: FormatNumberOptions = {},
): string {
  const text = body(value, opts);
  const suffix = text === BLANK || opts.adapter?.format ? undefined : unitSuffix(attr, opts);
  return suffix ? `${text} ${suffix}` : text;
}

/**
 * Two numbers as a range: a spaced en dash (readable with negatives:
 * `-5 – -2`), the unit once at the end, equal ends collapsed to one value.
 */
export function formatNumberRange(
  min: unknown,
  max: unknown,
  attr?: ModelAttribute,
  opts: FormatNumberOptions = {},
): string {
  const lo = body(min, opts);
  const hi = body(max, opts);
  const text = lo === hi ? lo : `${lo} – ${hi}`;
  const suffix = text === BLANK || opts.adapter?.format ? undefined : unitSuffix(attr, opts);
  return suffix ? `${text} ${suffix}` : text;
}

// Plain decimal text: an optional sign, digits with at most one point, an
// optional exponent. Narrower than Number(), which also reads "0x10", "0b1"
// and "Infinity" — nothing anyone means in a measurement box.
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
// Thousands groups as formatNumber prints them in en-CA ("1,249,999.5").
const GROUPED = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;

/**
 * Text typed into a number box → the stored number. Pure and React-free, so
 * forms, the number filter, the filter search and the apps share one reading.
 *
 * - "" (after trimming) is `{ok: true, value: null}`: the box was emptied.
 * - An adapter with `parse` reads the text itself (inches, 6'10").
 * - Thousands commas are accepted ("1,249,999", what formatNumber prints), and
 *   a lone comma with no point is a decimal comma ("1,5" → 1.5).
 * - A fraction on an `integer` field is refused, never rounded.
 */
export function parseNumber(
  text: string,
  attr?: ModelAttribute,
  opts: { adapter?: UnitAdapter | null } = {},
): ParseResult {
  const t = text.trim();
  if (t === "") return { ok: true, value: null };
  if (opts.adapter?.parse) return opts.adapter.parse(t, attr);

  let plain = t;
  if (GROUPED.test(t)) plain = t.replace(/,/g, "");
  else if (/^[^.,]*,[^.,]*$/.test(t)) plain = t.replace(",", ".");
  if (!DECIMAL.test(plain)) return { ok: false, reason: "invalid" };

  const typed = Number(plain);
  if (!Number.isFinite(typed)) return { ok: false, reason: "invalid" };
  const value = opts.adapter?.fromDisplay ? opts.adapter.fromDisplay(typed) : typed;
  if (attr?.integer && !Number.isInteger(value)) return { ok: false, reason: "fraction" };
  return { ok: true, value };
}

/**
 * The text an editable box shows for a stored value: exact, unformatted and
 * read back unchanged by parseNumber — never compact, no thousands commas, no
 * unit. "" for no value. Through the adapter's `formatEditable`, else its
 * `toDisplay` (rounded to 12 significant digits, so 203.2 cm reads 80, not
 * 80.00000000000001), else the number itself.
 */
export function formatEditable(value: unknown, opts: { adapter?: UnitAdapter | null } = {}): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const adapter = opts.adapter;
  if (adapter?.formatEditable) return adapter.formatEditable(value);
  const shown = adapter?.toDisplay ? +adapter.toDisplay(value).toPrecision(12) : value;
  return String(shown + 0);
}

/**
 * A loaded or default value → `number | null`: a row's 80, a Decimal's
 * "12.50", a default's "0", or null / "" for none. What a form compares typed
 * numbers against, so "12.50" and a retyped 12.5 are the same value.
 */
export function toNumberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = parseNumber(value);
  return parsed.ok ? parsed.value : null;
}
