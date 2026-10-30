import { describe, expect, it } from "vitest";

import { formatEditable, formatNumber, parseNumber, toNumberValue, type UnitAdapter } from "./numbers";
import type { ModelAttribute } from "./types";

const width = { name: "width_cm", type: "number" } as ModelAttribute;
const rating = { name: "rating", type: "number", integer: true } as ModelAttribute;

describe("parseNumber", () => {
  it.each([
    ["12", 12],
    [" 3.5 ", 3.5],
    ["-4", -4],
    ["+4", 4],
    [".5", 0.5],
    ["12.", 12],
    ["1e3", 1000],
    ["1,5", 1.5],
    ["1,249,999", 1249999],
    ["1,234.5", 1234.5],
    ["0", 0],
  ])("reads %j as %s", (text, value) => {
    expect(parseNumber(text, width)).toEqual({ ok: true, value });
  });

  it.each(["", "   "])("reads %j as an emptied box, never 0", (text) => {
    expect(parseNumber(text, width)).toEqual({ ok: true, value: null });
  });

  it.each(["1e", "-", ".", "30abc", "0x10", "Infinity", "1,2,3", "1.2.3", "1,5.5", "1e999"])(
    "refuses %j instead of guessing",
    (text) => {
      expect(parseNumber(text, width)).toEqual({ ok: false, reason: "invalid" });
    },
  );

  it("refuses a fraction on an integer field, and never rounds it", () => {
    expect(parseNumber("2.5", rating)).toEqual({ ok: false, reason: "fraction" });
    expect(parseNumber("3", rating)).toEqual({ ok: true, value: 3 });
    expect(parseNumber("2.5", width)).toEqual({ ok: true, value: 2.5 });
  });

  it("reads back what formatNumber prints", () => {
    for (const v of [0.125, 12.346, 1249999, -5]) {
      expect(parseNumber(formatNumber(v))).toEqual({ ok: true, value: v });
    }
  });

  describe("with an adapter", () => {
    const INCHES: UnitAdapter = { toDisplay: (cm) => cm / 2.54, fromDisplay: (inches) => inches * 2.54 };

    it("converts typed display units to stored units", () => {
      const r = parseNumber("80", width, { adapter: INCHES });
      expect(r.ok && r.value).toBeCloseTo(203.2, 9);
    });

    it("still reads an empty box as null", () => {
      expect(parseNumber(" ", width, { adapter: INCHES })).toEqual({ ok: true, value: null });
    });

    it("hands the trimmed text to adapter.parse when there is one", () => {
      const seen: string[] = [];
      const feet: UnitAdapter = {
        parse: (text) => {
          seen.push(text);
          const m = /^(\d+)'(\d+)"$/.exec(text);
          return m ? { ok: true, value: (+m[1] * 12 + +m[2]) * 2.54 } : { ok: false, reason: "invalid" };
        },
      };
      const r = parseNumber(` 6'10" `, width, { adapter: feet });
      expect(seen).toEqual([`6'10"`]);
      expect(r.ok && r.value).toBeCloseTo(208.28, 9);
      expect(parseNumber("6'", width, { adapter: feet })).toEqual({ ok: false, reason: "invalid" });
    });
  });
});

describe("toNumberValue", () => {
  it.each([
    [80, 80],
    ["12.50", 12.5],
    ["0", 0],
    [null, null],
    [undefined, null],
    ["", null],
    ["abc", null],
    [Number.NaN, null],
    [true, null],
  ])("turns %j into %s", (value, expected) => {
    expect(toNumberValue(value)).toBe(expected);
  });
});

describe("formatEditable", () => {
  const INCHES: UnitAdapter = { toDisplay: (cm) => cm / 2.54, fromDisplay: (inches) => inches * 2.54 };

  it.each([
    [80, "80"],
    [12.5, "12.5"],
    [1249999, "1249999"],
    [-0, "0"],
    [null, ""],
    [undefined, ""],
    ["12", ""],
  ])("shows %j as %j", (value, text) => {
    expect(formatEditable(value)).toBe(text);
  });

  it("shows the display unit, trimmed of float noise, and parses back to the value", () => {
    expect(formatEditable(203.2, { adapter: INCHES })).toBe("80");
    const r = parseNumber(formatEditable(203.2, { adapter: INCHES }), undefined, { adapter: INCHES });
    expect(r.ok && r.value).toBeCloseTo(203.2, 9);
  });

  it("uses the adapter's own edit text when it has one", () => {
    expect(formatEditable(208.28, { adapter: { formatEditable: () => `6' 10"` } })).toBe(`6' 10"`);
  });
});
