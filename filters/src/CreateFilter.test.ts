import { CalculateFeatureStats } from "@bcl32/data-utils";
import { describe, expect, it } from "vitest";

import { CreateFilter } from "./CreateFilter";
import type { DatasetStats, ModelAttribute, NumberRange } from "./types";

// Characterization tests: they record what CreateFilter does today, known bugs
// included (numbered as in the Pipeline Refactor Review). A test marked with a
// bug number should change when that bug is fixed.

const numberAttr: ModelAttribute = {
  name: "weight_g",
  type: "number",
  title: "Weight (g)",
  filter: true,
  filter_type: "number",
  filter_empty: { min: "", max: "" },
  filter_rule: ">",
};

describe("CreateFilter", () => {
  it("returns null for a non-filterable attribute or one without stats", () => {
    expect(CreateFilter({ ...numberAttr, filter: false }, { weight_g: [] })).toBeNull();
    expect(CreateFilter(numberAttr, {})).toBeNull();
  });

  it("builds a number filter bounded by the dataset range", () => {
    // Stats come from @bcl32/data-utils through the vitest source alias.
    const rows = [5, 10, 15, 20, 25, 30].map((weight_g) => ({ weight_g }));
    const stats = CalculateFeatureStats([numberAttr], rows) as unknown as DatasetStats;

    const filter = CreateFilter(numberAttr, stats)!;

    expect(filter.type).toBe("number");
    expect(filter.field).toBe("weight_g");
    expect(filter.title).toBe("Weight (g)");
    expect(filter.rule).toBe(">");
    expect(filter.value).toEqual({ min: 5, max: 30 });
    expect(filter.filter_empty).toEqual({ min: 5, max: 30 });
    expect(filter.histogram!.length).toBeGreaterThan(1);
  });

  it("clones filter_empty, so bounding one filter never mutates the attribute", () => {
    const stats: DatasetStats = {
      weight_g: [
        { name: "min", value: 1 },
        { name: "max", value: 9 },
      ],
    };

    const filter = CreateFilter(numberAttr, stats)!;
    (filter.value as NumberRange).min = 4;

    expect(numberAttr.filter_empty).toEqual({ min: "", max: "" });
    expect((filter.filter_empty as NumberRange).min).toBe(1);
  });

  it("throws on a number attribute with no filter_empty (B3)", () => {
    // Security-Benchmarks' hand-built judge_score attributes have this shape.
    const { filter_empty: _omit, ...bare } = numberAttr;
    const stats: DatasetStats = { weight_g: [{ name: "min", value: 0 }] };

    expect(() => CreateFilter(bare, stats)).toThrow(TypeError);
  });

  it("copies the options config keys onto an options filter", () => {
    const attr: ModelAttribute = {
      name: "material",
      type: "select",
      filter: true,
      filter_type: "options",
      filter_empty: [],
      filter_rule: "any",
      options: [{ value: "PLA", label: "PLA" }],
      source_kind: "scalar",
      selection: "single",
      display: "dropdown",
      primaryFilter: true,
      filterOrder: 2,
    };

    const filter = CreateFilter(attr, { material: [] })!;

    expect(filter).toMatchObject({
      type: "options",
      value: [],
      options: [{ value: "PLA", label: "PLA" }],
      source_kind: "scalar",
      selection: "single",
      display: "dropdown",
      primaryFilter: true,
      filterOrder: 2,
    });
  });

  it("drops attribute keys outside its fixed list (why R4 carries the attribute)", () => {
    const filter = CreateFilter({ ...numberAttr, unit: "g" }, {
      weight_g: [
        { name: "min", value: 1 },
        { name: "max", value: 2 },
      ],
    })!;

    expect(filter).not.toHaveProperty("unit");
  });

  it("falls back to options for an attribute with no filter_type", () => {
    const attr: ModelAttribute = { name: "is_active", type: "boolean", filter: true, filter_empty: [] };

    expect(CreateFilter(attr, { is_active: [] })!.type).toBe("options");
  });

  it("bounds a datetime filter by the earliest and latest values", () => {
    const attr: ModelAttribute = {
      name: "time_created",
      type: "datetime",
      filter: true,
      filter_type: "datetime",
      filter_empty: { timespan_begin: "", timespan_end: "" },
    };
    const stats: DatasetStats = {
      time_created: [
        { name: "earliest", value: "2026-01-01T00:00:00Z" },
        { name: "latest", value: "2026-02-01T00:00:00Z" },
      ],
    };

    expect(CreateFilter(attr, stats)!.value).toEqual({
      timespan_begin: "2026-01-01T00:00:00Z",
      timespan_end: "2026-02-01T00:00:00Z",
    });
  });

  it("leaves a date field's datetime filter unbounded (B9)", () => {
    // The bounds branch checks item.type, not the resolved filter type.
    const attr: ModelAttribute = {
      name: "due_on",
      type: "date",
      filter: true,
      filter_type: "datetime",
      filter_empty: { timespan_begin: "", timespan_end: "" },
    };
    const stats: DatasetStats = {
      due_on: [
        { name: "earliest", value: "2026-01-01" },
        { name: "latest", value: "2026-02-01" },
      ],
    };

    expect(CreateFilter(attr, stats)!.value).toEqual({ timespan_begin: "", timespan_end: "" });
  });
});
