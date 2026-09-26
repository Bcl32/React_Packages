import { describe, expect, it } from "vitest";

import { GetActiveFilters } from "./GetActiveFilters";
import type { FilterValue } from "./types";

// Characterization tests: they record what GetActiveFilters does today.

describe("GetActiveFilters", () => {
  it("treats a filter as active only when its value differs from filter_empty", () => {
    const filters: Record<string, FilterValue> = {
      name: { type: "string", value: "", filter_empty: "" },
      note: { type: "string", value: "x", filter_empty: "" },
      w: { type: "number", value: { min: 1, max: 9 }, filter_empty: { min: 1, max: 9 } },
      h: { type: "number", value: { min: 2, max: 9 }, filter_empty: { min: 1, max: 9 } },
      tags: { type: "options", value: [], filter_empty: [] },
      kind: { type: "options", value: ["a"], filter_empty: [] },
    };

    expect(Object.keys(GetActiveFilters(filters))).toEqual(["note", "h", "kind"]);
  });

  it("returns the same filter objects, with no marker on a moved datetime start", () => {
    // It used to return a copy tagged timespan_begin: "filter", which nothing read.
    const empty = { timespan_begin: "2026-01-01", timespan_end: "2026-02-01" };
    const filters: Record<string, FilterValue> = {
      start: { type: "datetime", value: { ...empty, timespan_begin: "2026-01-10" }, filter_empty: empty },
      end: { type: "datetime", value: { ...empty, timespan_end: "2026-01-20" }, filter_empty: empty },
      idle: { type: "datetime", value: { ...empty }, filter_empty: empty },
    };

    const active = GetActiveFilters(filters);

    expect(Object.keys(active)).toEqual(["start", "end"]);
    expect(active.start).toBe(filters.start);
    expect(active.start).not.toHaveProperty("timespan_begin");
  });

  it("never counts a filter of an unknown type as active", () => {
    const filters = {
      odd: { type: "select", value: ["x"], filter_empty: [] },
    } as unknown as Record<string, FilterValue>;

    expect(GetActiveFilters(filters)).toEqual({});
  });

  it("treats two unparseable timestamps as equal", () => {
    const bad = { timespan_begin: "not a date", timespan_end: "also not" };
    const filters: Record<string, FilterValue> = {
      t: { type: "datetime", value: { ...bad }, filter_empty: { ...bad } },
    };

    expect(GetActiveFilters(filters)).toEqual({});
  });
});
