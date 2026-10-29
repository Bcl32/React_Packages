import { describe, expect, it } from "vitest";

import { chipLabel, summaryValue } from "./filterText";
import type { FilterValue } from "./types";

// Characterization tests: they record how the toolbar chip and the
// FiltersSummary describe each filter type. Number ranges read the same in
// both since R5 (formatNumberRange); dates and options still differ, and those
// differences are pinned here so unifying them is a visible, deliberate change.

// No offset: dayjs parses these as local time, so the output doesn't depend
// on the machine's timezone.
const dates = { timespan_begin: "2026-01-10T09:30:00", timespan_end: "2026-02-01T17:05:00" };

const filters: Record<string, FilterValue> = {
  string: { type: "string", value: "pla", rule: "contains", filter_empty: "", title: "Material" },
  number: { type: "number", value: { min: 10, max: 50 }, filter_empty: { min: 0, max: 99 }, title: "Weight (g)" },
  options: {
    type: "options",
    value: ["in_progress", "done"],
    rule: "any",
    filter_empty: [],
    title: "Status",
    options: [
      { value: "in_progress", label: "in_progress" },
      { value: "done", label: "done" },
    ],
  },
  optionsAll: { type: "options", value: ["a", "b"], rule: "all", filter_empty: [], title: "Tags" },
  swatches: { type: "options", value: ["#ff0000"], rule: "any", filter_empty: [], display: "swatch-grid", title: "Colour" },
  datetime: { type: "datetime", value: dates, filter_empty: dates, title: "Created" },
};

describe("chipLabel", () => {
  it.each([
    ["string", 'Material contains "pla"'],
    ["number", "Weight (g): 10 – 50"],
    ["options", "Status: In progress, Done"],
    ["optionsAll", "Tags (all): A, B"],
    ["swatches", "Colour: 1 colour"],
    ["datetime", "Created: Jan 10, 2026 → Feb 1, 2026"],
  ])("describes a %s filter", (key, expected) => {
    expect(chipLabel(key, filters[key])).toBe(expected);
  });

  it("falls back to the humanized column, not a synthetic key", () => {
    const { title: _omit, ...untitled } = filters.number;

    expect(chipLabel("weight_g#2", { ...untitled, field: "weight_g" })).toBe("Weight g: 10 – 50");
  });
});

describe("summaryValue", () => {
  it.each([
    ["string", "contains pla"],
    ["number", "10 – 50"],
    // Unlike the chip, option labels are not prettified.
    ["options", "in_progress, done"],
    ["optionsAll", " (all)a, b"],
    ["swatches", "1 colour"],
    ["datetime", "Start: Jan, 10 2026 - 9:30am\n End: Feb, 1 2026 - 5:05pm"],
  ])("describes a %s filter", (key, expected) => {
    expect(summaryValue(filters[key])).toBe(expected);
  });
});

describe("number ranges in the chip and the summary", () => {
  // A + nudge adds its step to an unrounded minimum, so a set bound can carry
  // more decimals than anyone typed; the text shows it exactly, not in full.
  const nudged: FilterValue = {
    ...filters.number,
    title: "Ceiling height (cm)",
    value: { min: 12012.3456, max: 1234567 },
  };

  it("prints set bounds exactly, with separators and at most 3 decimals", () => {
    expect(chipLabel("ceiling_height_cm", nudged)).toBe("Ceiling height (cm): 12,012.346 – 1,234,567");
    expect(summaryValue(nudged)).toBe("12,012.346 – 1,234,567");
  });

  it("does not abbreviate: 1.2M would hide the bound that was chosen", () => {
    const set = { ...nudged, value: { min: 1200000, max: 1249999 } };
    expect(summaryValue(set)).toBe("1,200,000 – 1,249,999");
  });

  it("prints a missing bound as a dash rather than throwing", () => {
    const blank = { ...nudged, value: { min: "", max: "" } as unknown as FilterValue["value"] };
    expect(summaryValue(blank)).toBe("—");
  });
});
