import type { NumberRange } from "./types";

/**
 * The number filter's arithmetic: its domain, its step, and the one rule every
 * writer of a range goes through — both ends inside the domain, min ≤ max.
 * Pure, so each case is a one-line test; the card only calls these.
 *
 * Internal to the package: not re-exported from the barrel.
 */

export interface Domain {
  min: number;
  max: number;
}

/** The data's range, or null when it has none to offer (no rows, NaN bounds). */
export function numberDomain(empty: Partial<NumberRange> | undefined): Domain | null {
  const min = empty?.min;
  const max = empty?.max;
  return typeof min === "number" && typeof max === "number" && Number.isFinite(min) && Number.isFinite(max) && max >= min
    ? { min, max }
    : null;
}

/**
 * One nudge: about a hundred steps across the domain, rounded to 1, 2 or 5 ×
 * 10ⁿ so nudged values read cleanly (10–500 steps by 5, not 4.9). A unit's own
 * step wins; an integer column never steps by less than 1, and a column with
 * `decimals` never by less than its last place (money: 0.01), so a nudge
 * never lands on a value the column cannot store.
 */
export function stepFor(
  domain: Domain | null,
  opts: { step?: number; integer?: boolean; decimals?: number } = {},
): number {
  if (opts.step && opts.step > 0) return opts.step;
  const raw = domain ? (domain.max - domain.min) / 100 : 0;
  if (!(raw > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power; // 1 ≤ f < 10
  const step = +((f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * power).toPrecision(12);
  if (opts.integer) return Math.max(1, step);
  // 1 / 10 ** d, not 10 ** -d: 10 ** -4 is 0.00009999999999999999.
  return opts.decimals !== undefined ? Math.max(1 / 10 ** opts.decimals, step) : step;
}

export function clamp(value: number, domain: Domain | null): number {
  return domain ? Math.min(domain.max, Math.max(domain.min, value)) : value;
}

/**
 * Set one end. Clamped into the domain (every row past its edge is already
 * kept, so a bound beyond it changes nothing), and an inverted pair is swapped:
 * both numbers typed survive, and the slider, which sorts its thumbs, agrees.
 */
export function setBound(range: NumberRange, bound: "min" | "max", value: number, domain: Domain | null): NumberRange {
  const next = { ...range, [bound]: clamp(value, domain) };
  return next.min <= next.max ? next : { min: next.max, max: next.min };
}

/** One step of one end, stopping at the other end rather than crossing it. */
export function nudge(
  range: NumberRange,
  bound: "min" | "max",
  direction: 1 | -1,
  step: number,
  domain: Domain | null,
): NumberRange {
  const value = clamp(+(range[bound] + direction * step).toPrecision(12), domain);
  return bound === "min"
    ? { min: Math.min(value, range.max), max: range.max }
    : { min: range.min, max: Math.max(value, range.min) };
}

export function sameRange(a: NumberRange, b: NumberRange): boolean {
  return a.min === b.min && a.max === b.max;
}
