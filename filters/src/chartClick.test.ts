import { describe, expect, it } from "vitest";

import { chartClickValue, chartSelection } from "./chartClick";
import type { FilterValue } from "./types";

// Characterization tests for the bar and pie chart filters' click logic.

const options: FilterValue = { type: "options", value: [], filter_empty: [], rule: "any" };
const text: FilterValue = { type: "string", value: "", filter_empty: "", rule: "equals" };
const number: FilterValue = { type: "number", value: { min: 0, max: 9 }, filter_empty: { min: 0, max: 9 } };

describe("chartSelection", () => {
  it("is empty for a missing or inactive filter", () => {
    expect(chartSelection(undefined)).toEqual([]);
    expect(chartSelection(options)).toEqual([]);
    expect(chartSelection(text)).toEqual([]);
  });

  it("lists an options selection, or a scalar value as one entry", () => {
    expect(chartSelection({ ...options, value: ["a", "b"] })).toEqual(["a", "b"]);
    expect(chartSelection({ ...text, value: "parse_failed" })).toEqual(["parse_failed"]);
  });
});

describe("chartClickValue", () => {
  it("selects just the clicked value on an options filter", () => {
    expect(chartClickValue(options, "PLA", [])).toEqual(["PLA"]);
    expect(chartClickValue({ ...options, value: ["PETG"] }, "PLA", ["PETG"])).toEqual(["PLA"]);
  });

  it("resets to a fresh copy of filter_empty when the active value is clicked", () => {
    const active = { ...options, value: ["PLA"] };
    const next = chartClickValue(active, "PLA", ["PLA"]);

    expect(next).toEqual([]);
    expect(next).not.toBe(active.filter_empty);
  });

  it("writes the bare string to any other filter type", () => {
    expect(chartClickValue(text, "parse_failed", [])).toBe("parse_failed");
    // Pinned as-is: a number filter gets a string, not a range.
    expect(chartClickValue(number, "5", [])).toBe("5");
  });
});
