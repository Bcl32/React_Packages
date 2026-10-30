import { describe, expect, it } from "vitest";

import { formatNumber, formatNumberRange } from "./numbers";
import type { ModelAttribute } from "./types";

const height: ModelAttribute = { name: "ceiling_height_cm", type: "number", unit: "cm" };

describe("formatNumber — exact (the default)", () => {
  it.each([
    [12.3456, "12.346"],
    [1234567, "1,234,567"],
    [12012.3456, "12,012.346"],
    [250, "250"],
    [2.5, "2.5"], // trailing zeros dropped
    [0, "0"],
    [0.4, "0.4"],
    [0.08, "0.08"],
    [0.0123456, "0.0123"], // below 1: three significant digits
    [1e-7, "0.0000001"], // no exponent notation
    [-5.25, "-5.25"],
  ])("%s → %s", (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
  });

  it("prints -0 as 0", () => {
    expect(formatNumber(-0)).toBe("0");
  });

  it("keeps a large integer whole instead of rounding it to significant digits", () => {
    expect(formatNumber(1249999)).toBe("1,249,999");
  });
});

describe("formatNumber — compact (browsing a column's spread)", () => {
  it.each([
    [12.3456, "12.3"],
    [123.5, "124"],
    [1234, "1234"],
    [9999.6, "10000"],
    [10000, "10K"],
    [1234567, "1.2M"],
    [1249999, "1.2M"],
    [7, "7"],
  ])("%s → %s", (value, expected) => {
    expect(formatNumber(value, undefined, { compact: true })).toBe(expected);
  });

  it("prints -0 as 0", () => {
    expect(formatNumber(-0, undefined, { compact: true })).toBe("0");
  });
});

describe("formatNumber — blanks", () => {
  it.each([[null], [undefined], [NaN], [Infinity], [-Infinity], [""], ["12 cm"], ["0x10"], ["Infinity"], [{}]])(
    "%s → —",
    (value) => {
      expect(formatNumber(value)).toBe("—");
      expect(formatNumber(value, undefined, { compact: true })).toBe("—");
    },
  );

  // R13: a Decimal arrives as a string by design, so a plain decimal string reads as its number.
  it("reads a plain decimal string as its number", () => {
    expect(formatNumber("12")).toBe("12");
    expect(formatNumber(" 1249999.50 ")).toBe("1,249,999.5");
  });
});

describe("formatNumber — locale", () => {
  it("pins en-CA by default", () => {
    expect(formatNumber(1234567.891)).toBe("1,234,567.891");
  });

  it("takes an override", () => {
    expect(formatNumber(1234567.891, undefined, { locale: "de-DE" })).toBe("1.234.567,891");
  });
});

describe("formatNumber — unit suffix", () => {
  it("prints no suffix by default, even when the attribute has a unit", () => {
    expect(formatNumber(250, height)).toBe("250");
  });

  it("does not print the raw UCUM code: unit is a code, not a label", () => {
    expect(formatNumber(250, height, { unit: true })).toBe("250");
  });

  it("prints the attribute's unit_label when asked", () => {
    expect(formatNumber(250, { ...height, unit_label: "cm" }, { unit: true })).toBe("250 cm");
  });

  it("an adapter converts and supplies its own suffix", () => {
    const inches = { suffix: "in", toDisplay: (cm: number) => cm / 2.54 };
    expect(formatNumber(254, height, { adapter: inches, unit: true })).toBe("100 in");
    expect(formatNumber(254, height, { adapter: inches })).toBe("100");
  });

  it("an adapter's own format wins outright", () => {
    const feet = { format: () => `6'10"` };
    expect(formatNumber(208, height, { adapter: feet, unit: true })).toBe(`6'10"`);
  });
});

describe("formatNumberRange", () => {
  it("joins with a spaced en dash", () => {
    expect(formatNumberRange(12.3456, 1234567)).toBe("12.346 – 1,234,567");
    expect(formatNumberRange(12.3456, 1234567, undefined, { compact: true })).toBe("12.3 – 1.2M");
  });

  it("keeps negative ranges readable", () => {
    expect(formatNumberRange(-5, -2)).toBe("-5 – -2");
  });

  it("collapses equal ends to one value", () => {
    expect(formatNumberRange(7, 7)).toBe("7");
  });

  it("puts the suffix once, after both ends", () => {
    const attr = { ...height, unit_label: "cm" };
    expect(formatNumberRange(10, 50, attr, { unit: true })).toBe("10 – 50 cm");
  });

  it("blanks each missing end on its own", () => {
    expect(formatNumberRange(10, undefined)).toBe("10 – —");
    expect(formatNumberRange("", "")).toBe("—");
  });

  it("an adapter with its own format gets no extra suffix", () => {
    const feet = { format: (cm: number) => `${Math.round(cm)}ft`, suffix: "ft" };
    expect(formatNumberRange(1, 2, height, { adapter: feet, unit: true })).toBe("1ft – 2ft");
  });
});
