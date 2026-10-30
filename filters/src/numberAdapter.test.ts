import { describe, expect, it } from "vitest";

import type { UnitAdapter } from "@bcl32/data-utils/numbers";
import { NO_ADAPTER, type AdapterResolver } from "@bcl32/utils/NumberAdapter";

import { SearchFilterIndex, type SearchFieldEntry } from "./FilterSearch";
import { chipLabel, summaryValue } from "./filterText";
import type { FilterValue, ModelAttribute } from "./types";

// R8: the pure text and search functions take the app's resolver as an
// argument. Without one (every app today) the output is what it was; with an
// inch adapter on centimetre fields, numbers read in inches and typed numbers
// are stored in centimetres.

const INCHES: UnitAdapter = {
  suffix: "in",
  toDisplay: (cm) => cm / 2.54,
  fromDisplay: (inches) => inches * 2.54,
};
const inchesForCm: AdapterResolver = (attr) => (attr.unit === "cm" ? INCHES : null);

const ceiling = { name: "ceiling_cm", type: "number", unit: "cm" } as ModelAttribute;
const weight = { name: "weight_g", type: "number", unit: "g" } as ModelAttribute;

const filter = (attr: ModelAttribute, min: number, max: number): FilterValue => ({
  type: "number",
  value: { min, max },
  filter_empty: { min: 0, max: 1000 },
  title: attr.name === "ceiling_cm" ? "Ceiling" : "Weight (g)",
  attr,
});

describe("chip and summary text", () => {
  it("are unchanged with no resolver or the default one", () => {
    const f = filter(ceiling, 203.2, 254);
    expect(chipLabel("ceiling_cm", f)).toBe("Ceiling: 203.2 – 254");
    expect(chipLabel("ceiling_cm", f, NO_ADAPTER)).toBe("Ceiling: 203.2 – 254");
    expect(summaryValue(f, NO_ADAPTER)).toBe("203.2 – 254");
  });

  it("go through the field's adapter, and only that field's", () => {
    expect(chipLabel("ceiling_cm", filter(ceiling, 203.2, 254), inchesForCm)).toBe("Ceiling: 80 – 100");
    expect(summaryValue(filter(ceiling, 203.2, 254), inchesForCm)).toBe("80 – 100");
    expect(chipLabel("weight_g", filter(weight, 10, 50), inchesForCm)).toBe("Weight (g): 10 – 50");
  });

  it("leave a filter with no attr alone", () => {
    const { attr: _attr, ...bare } = filter(ceiling, 203.2, 254);
    expect(chipLabel("ceiling_cm", bare as FilterValue, inchesForCm)).toBe("Ceiling: 203.2 – 254");
  });
});

describe("SearchFilterIndex with a resolver", () => {
  const index: SearchFieldEntry[] = [
    { field: "ceiling_cm", title: "Ceiling", aliases: [], kind: "number", values: [], min: 200, max: 300, attr: ceiling },
  ];

  it("stores a typed comparison in the stored unit and labels it in the display unit", () => {
    const [top] = SearchFilterIndex(index, "ceiling > 80", { filters: {}, canAdd: true, adapterFor: inchesForCm });
    expect(top.label).toBe("Ceiling > 80");
    expect(top.action).toMatchObject({ type: "number-range", field: "ceiling_cm" });
    expect((top.action as { min: number }).min).toBeCloseTo(203.2, 9);
  });

  it("converts both ends of a typed range", () => {
    const [top] = SearchFilterIndex(index, "ceiling 80-100", { filters: {}, canAdd: true, adapterFor: inchesForCm });
    expect(top.label).toBe("Ceiling: 80 – 100");
    const { min, max } = top.action as { min: number; max: number };
    expect(min).toBeCloseTo(203.2, 9);
    expect(max).toBeCloseTo(254, 9);
  });

  it("reads typed numbers as stored values without a resolver", () => {
    const [top] = SearchFilterIndex(index, "ceiling > 80", { filters: {}, canAdd: true });
    expect(top.label).toBe("Ceiling > 80");
    expect((top.action as { min: number }).min).toBe(80);
  });
});
