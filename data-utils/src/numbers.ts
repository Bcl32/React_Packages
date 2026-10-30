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
 * A field's `decimals` (its column's scale) replaces the 3-decimal cap, and
 * `format: "money"` prints exactly `decimals ?? 2` places, as currency when the
 * adapter carries one (`$1,249.50`).
 *
 * A plain decimal string ("12.50") is read as its number: every Decimal column
 * arrives as one, by design, so no cent is lost to a float on the wire.
 * Anything else that isn't a finite number prints "—".
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
  /**
   * An ISO 4217 code ("CAD") a `format: "money"` field prints in. Set by
   * NumberAdapterProvider's `currency`, never per row.
   */
  currency?: string;
}

/** Whether an adapter changes the number itself, not only how money reads. */
export function convertsUnits(adapter: UnitAdapter | null | undefined): boolean {
  return !!(adapter && (adapter.toDisplay || adapter.fromDisplay || adapter.parse || adapter.format || adapter.formatEditable));
}

/**
 * The fractional digits a field holds: its `decimals` (the column's scale),
 * else 2 for money, else undefined (no limit).
 */
export function numberDecimals(attr: Pick<ModelAttribute, "decimals" | "format"> | undefined): number | undefined {
  if (typeof attr?.decimals === "number") return attr.decimals;
  return attr?.format === "money" ? 2 : undefined;
}

/**
 * What a typed number means. `null` is an empty box — "no value", which is
 * neither 0 nor "" — and an unreadable one is an error, never a silent clear.
 */
export type ParseResult =
  | { ok: true; value: number | null }
  | { ok: false; reason: ParseFailure };

/**
 * Why typed text is refused: not a number, a fraction on an `integer` field,
 * more digits than the field's `decimals`, or outside its `min`/`max`.
 */
export type ParseFailure = "invalid" | "fraction" | "decimals" | "range";

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

function cached(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let nf = formatters.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, options);
    formatters.set(key, nf);
  }
  return nf;
}

const SIGNIFICANT: Intl.NumberFormatOptions = { maximumSignificantDigits: 3 };
const COMPACT: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };

function exactBody(value: number, locale: string, decimals: number | undefined): string {
  // A column's scale is the whole answer: 0.05 at 2 places reads 0.05, not 0.0500.
  if (decimals !== undefined) return cached(locale, { maximumFractionDigits: decimals }).format(value);
  if (Math.abs(value) >= 1 || value === 0) return cached(locale, { maximumFractionDigits: 3 }).format(value);
  return cached(locale, SIGNIFICANT).format(value);
}

function compactBody(value: number, locale: string): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 10000) return cached(locale, COMPACT).format(value);
  if (magnitude >= 100 || Number.isInteger(value)) return String(Math.round(value));
  return String(+value.toPrecision(3));
}

/** Money: always its full places ($1,249.50, never $1,249.5); compact is $1.2K. */
function moneyBody(value: number, locale: string, decimals: number, currency: string | undefined, compact: boolean): string {
  const style: Intl.NumberFormatOptions = currency ? { style: "currency", currency } : {};
  if (compact && Math.abs(value) >= 10000) return cached(locale, { ...style, ...COMPACT }).format(value);
  return cached(locale, { ...style, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

/** The symbol a currency prints with in a locale ("CAD" → "$" in en-CA), for an input's prefix. */
export function currencySymbol(currency: string, locale: string = DEFAULT_LOCALE): string {
  const part = cached(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency");
  return part?.value ?? currency;
}

/** A number, or the number a plain decimal string ("12.50") spells. */
function numeric(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const t = value.trim();
  return DECIMAL.test(t) ? Number(t) : value;
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

function body(raw: unknown, attr: ModelAttribute | undefined, opts: FormatNumberOptions): string {
  const value = numeric(raw);
  if (typeof value !== "number" || !Number.isFinite(value)) return BLANK;
  const adapter = opts.adapter;
  if (adapter?.format) return adapter.format(value);
  // + 0 turns -0 into 0; Intl would print "-0".
  const shown = (adapter?.toDisplay ? adapter.toDisplay(value) : value) + 0;
  const locale = opts.locale ?? DEFAULT_LOCALE;
  // A converted value is no longer in the column's scale (203.2 cm is 80 in).
  const decimals = adapter?.toDisplay ? undefined : numberDecimals(attr);
  if (attr?.format === "money") {
    return moneyBody(shown, locale, decimals ?? 2, adapter?.currency, !!opts.compact);
  }
  return opts.compact ? compactBody(shown, locale) : exactBody(shown, locale, decimals);
}

/** One number as text, e.g. `12.346`, `1.2M` (compact), `$1,249.50` (money), `—` (missing). */
export function formatNumber(
  value: unknown,
  attr?: ModelAttribute,
  opts: FormatNumberOptions = {},
): string {
  const text = body(value, attr, opts);
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
  const lo = body(min, attr, opts);
  const hi = body(max, attr, opts);
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
 * - More digits than the field's `decimals` (money: 2) are refused; through a
 *   converting adapter the stored value is rounded to them instead, since the
 *   extra digits are the conversion's, not the person's.
 * - A value outside `min`/`max` (exclusive where flagged) is refused.
 * Checked in that order, so 2.5 on a 1–5 integer reads as a fraction.
 */
export function parseNumber(
  text: string,
  attr?: ModelAttribute,
  opts: { adapter?: UnitAdapter | null } = {},
): ParseResult {
  const t = text.trim();
  if (t === "") return { ok: true, value: null };
  const adapter = opts.adapter;
  let value: number;
  if (adapter?.parse) {
    const parsed = adapter.parse(t, attr);
    if (!parsed.ok || parsed.value === null) return parsed;
    value = parsed.value;
  } else {
    let plain = t;
    if (GROUPED.test(t)) plain = t.replace(/,/g, "");
    else if (/^[^.,]*,[^.,]*$/.test(t)) plain = t.replace(",", ".");
    if (!DECIMAL.test(plain)) return { ok: false, reason: "invalid" };
    const typed = Number(plain);
    if (!Number.isFinite(typed)) return { ok: false, reason: "invalid" };
    value = adapter?.fromDisplay ? adapter.fromDisplay(typed) : typed;
  }
  if (attr?.integer && !Number.isInteger(value)) return { ok: false, reason: "fraction" };

  const decimals = numberDecimals(attr);
  if (decimals !== undefined && !fitsDecimals(value, decimals)) {
    if (!convertsUnits(adapter)) return { ok: false, reason: "decimals" };
    value = +value.toFixed(decimals);
  }
  if (!withinBounds(value, attr)) return { ok: false, reason: "range" };
  return { ok: true, value };
}

/** Whether a value has no more than `decimals` fractional digits (float-noise tolerant). */
function fitsDecimals(value: number, decimals: number): boolean {
  return Number.isInteger(+(value * 10 ** decimals).toPrecision(15));
}

/** Whether a value lies inside the field's `min`/`max`, honouring exclusivity. */
export function withinBounds(
  value: number,
  attr: Pick<ModelAttribute, "min" | "max" | "min_exclusive" | "max_exclusive"> | undefined,
): boolean {
  if (typeof attr?.min === "number" && (attr.min_exclusive ? value <= attr.min : value < attr.min)) return false;
  if (typeof attr?.max === "number" && (attr.max_exclusive ? value >= attr.max : value > attr.max)) return false;
  return true;
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
