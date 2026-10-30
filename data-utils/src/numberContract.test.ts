import { describe, expect, it } from "vitest";

import { formatNumber, formatNumberRange, numberDecimals, parseNumber, withinBounds } from "./numbers";
import type { UnitAdapter } from "./numbers";
import type { ModelAttribute } from "./types";

// R13: bounds, decimal places and money — three facts the server already
// knows, read by the one parser and the one formatter.

const n = (extra: Partial<ModelAttribute>): ModelAttribute => ({ name: "x", type: "number", ...extra });

const rating = n({ integer: true, min: 1, max: 5 });
const payment = n({ format: "money", min: 0, min_exclusive: true });
const budgetItem = n({ format: "money", decimals: 2, min: 0 });
const cm1 = n({ decimals: 1 });
const CAD: UnitAdapter = { currency: "CAD" };

describe("parseNumber — bounds", () => {
  it.each([
    [rating, "1", 1],
    [rating, "5", 5],
    [budgetItem, "0", 0],
    [payment, "0.01", 0.01],
  ])("accepts %#: %s", (attr, text, value) => {
    expect(parseNumber(text, attr)).toEqual({ ok: true, value });
  });

  it.each([
    [rating, "6"],
    [rating, "0"],
    [budgetItem, "-1"],
    [payment, "0"], // gt 0: zero is out
  ])("refuses %#: %s as out of range", (attr, text) => {
    expect(parseNumber(text, attr)).toEqual({ ok: false, reason: "range" });
  });

  it("checks a fraction before the range, and an emptied box is still null", () => {
    expect(parseNumber("2.5", rating)).toEqual({ ok: false, reason: "fraction" });
    expect(parseNumber("", rating)).toEqual({ ok: true, value: null });
  });

  it("honours exclusive max", () => {
    const pct = n({ max: 100, max_exclusive: true });
    expect(withinBounds(99.9, pct)).toBe(true);
    expect(withinBounds(100, pct)).toBe(false);
    expect(withinBounds(100, n({ max: 100 }))).toBe(true);
  });
});

describe("parseNumber — decimal places", () => {
  it("refuses more digits than the column holds", () => {
    expect(parseNumber("12.345", budgetItem)).toEqual({ ok: false, reason: "decimals" });
    expect(parseNumber("12.34", budgetItem)).toEqual({ ok: true, value: 12.34 });
    expect(parseNumber("203.25", cm1)).toEqual({ ok: false, reason: "decimals" });
    expect(parseNumber("203.2", cm1)).toEqual({ ok: true, value: 203.2 });
  });

  it("gives money 2 places when the column says nothing", () => {
    expect(numberDecimals(n({ format: "money" }))).toBe(2);
    expect(numberDecimals(n({ format: "money", decimals: 4 }))).toBe(4);
    expect(numberDecimals(n({}))).toBeUndefined();
    expect(parseNumber("19.999", payment)).toEqual({ ok: false, reason: "decimals" });
  });

  it("is not fooled by float noise", () => {
    expect(parseNumber("0.1", budgetItem)).toEqual({ ok: true, value: 0.1 });
    expect(parseNumber("1.15", budgetItem)).toEqual({ ok: true, value: 1.15 });
    expect(parseNumber("99999999.99", budgetItem)).toEqual({ ok: true, value: 99999999.99 });
  });

  it("rounds a converted value to the column's scale instead of refusing it", () => {
    const inches: UnitAdapter = { toDisplay: (cm) => cm / 2.54, fromDisplay: (i) => i * 2.54 };
    // 80.1 in = 203.454 cm: the person typed one decimal; the extra digits are the conversion's.
    expect(parseNumber("80.1", cm1, { adapter: inches })).toEqual({ ok: true, value: 203.5 });
  });
});

describe("formatNumber — decimals and money", () => {
  it("shows a column's scale in place of the 3-decimal cap", () => {
    expect(formatNumber(1.23456, n({ decimals: 4 }))).toBe("1.2346");
    expect(formatNumber(0.05, n({ decimals: 2 }))).toBe("0.05");
    expect(formatNumber(203.25, cm1)).toBe("203.3");
  });

  it("prints money at its full places, as currency with one", () => {
    expect(formatNumber("1249.5", n({ format: "money" }), { adapter: CAD })).toBe("$1,249.50");
    expect(formatNumber(1249.5, n({ format: "money" }))).toBe("1,249.50");
    expect(formatNumber(-2100, n({ format: "money" }), { adapter: CAD })).toBe("-$2,100.00");
    expect(formatNumber(0.1234, n({ format: "money", decimals: 4 }), { adapter: CAD })).toBe("$0.1234");
  });

  it("abbreviates large money when compact", () => {
    expect(formatNumber(539056.89, n({ format: "money" }), { adapter: CAD, compact: true })).toBe("$539.1K");
    expect(formatNumber(950, n({ format: "money" }), { adapter: CAD, compact: true })).toBe("$950.00");
  });

  it("formats a money range once per end", () => {
    expect(formatNumberRange("1200", "5000", n({ format: "money" }), { adapter: CAD })).toBe("$1,200.00 – $5,000.00");
  });

  it("leaves a plain number alone without decimals or money", () => {
    expect(formatNumber(12.34567)).toBe("12.346");
  });
});
