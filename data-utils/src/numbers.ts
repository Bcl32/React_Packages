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
}

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
