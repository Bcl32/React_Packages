import { describe, expect, it } from "vitest";

import { ApplyFilters } from "./ApplyFilters";
import type { FilterValue } from "./types";

// Characterization tests: they record what ApplyFilters does today.

const numberFilter = (min: number, max: number, extra: Partial<FilterValue> = {}): FilterValue => ({
  type: "number",
  value: { min, max },
  filter_empty: { min, max },
  rule: ">",
  ...extra,
});

const optionsFilter = (value: string[], extra: Partial<FilterValue> = {}): FilterValue => ({
  type: "options",
  value,
  filter_empty: [],
  rule: "any",
  ...extra,
});

describe("ApplyFilters", () => {
  it("drops null and non-object rows before filtering", () => {
    expect(ApplyFilters([null, undefined, 3, { a: 1 }], {})).toEqual([{ a: 1 }]);
  });

  it("matches strings case-insensitively by contains or equals", () => {
    const rows = [{ name: "Oak Shelf" }, { name: "oak" }, { name: "Pine" }, { name: null }];
    const contains: FilterValue = { type: "string", value: "OAK", filter_empty: "", rule: "contains" };
    const equals: FilterValue = { ...contains, rule: "equals" };

    expect(ApplyFilters(rows, { name: contains })).toEqual([{ name: "Oak Shelf" }, { name: "oak" }]);
    expect(ApplyFilters(rows, { name: equals })).toEqual([{ name: "oak" }]);
  });

  it("an empty string filter keeps every row", () => {
    const rows = [{ name: "a" }, { name: null }];
    const filter: FilterValue = { type: "string", value: "", filter_empty: "", rule: "contains" };

    expect(ApplyFilters(rows, { name: filter })).toEqual(rows);
  });

  it("keeps numbers inside the range, inclusive", () => {
    const rows = [{ w: 1 }, { w: 5 }, { w: 10 }, { w: 11 }, { w: "7" }];

    expect(ApplyFilters(rows, { w: numberFilter(5, 10) })).toEqual([{ w: 5 }, { w: 10 }, { w: "7" }]);
  });

  it("drops null number cells but lets an empty string through as 0", () => {
    // The ApplyFilters half of B4: Number("") is 0.
    const rows = [{ w: null }, { w: "" }, { w: 3 }];

    expect(ApplyFilters(rows, { w: numberFilter(0, 10) })).toEqual([{ w: "" }, { w: 3 }]);
  });

  it("matches a scalar-array number filter when any element is in range", () => {
    const rows = [{ axes: [1, 9] }, { axes: [20] }, { axes: 5 }];
    const filter = numberFilter(8, 10, { source_kind: "scalar-array" });

    expect(ApplyFilters(rows, { axes: filter })).toEqual([{ axes: [1, 9] }]);
  });

  it("reads the column from `field`, not the map key", () => {
    const rows = [{ w: 1 }, { w: 50 }];

    expect(ApplyFilters(rows, { "w#2": numberFilter(10, 100, { field: "w" }) })).toEqual([{ w: 50 }]);
  });

  it("applies any / all / equals rules to options", () => {
    const rows = [{ tags: ["a", "b"] }, { tags: ["a"] }, { tags: ["c"] }];
    const base = { source_kind: "scalar-array" as const };

    expect(ApplyFilters(rows, { tags: optionsFilter(["a", "c"], base) })).toHaveLength(3);
    expect(ApplyFilters(rows, { tags: optionsFilter(["a", "b"], { ...base, rule: "all" }) })).toEqual([
      { tags: ["a", "b"] },
    ]);
    expect(ApplyFilters(rows, { tags: optionsFilter(["a"], { ...base, rule: "equals" }) })).toHaveLength(2);
  });

  it("matches object-array options by value_key", () => {
    const rows = [{ systems: [{ id: "s1" }, { id: "s2" }] }, { systems: [{ id: "s3" }] }];
    const filter = optionsFilter(["s2"], { source_kind: "object-array", value_key: "id" });

    expect(ApplyFilters(rows, { systems: filter })).toEqual([rows[0]]);
  });

  it("compares colour tokens by normalised hex", () => {
    const rows = [{ colour: "#ff0000" }, { colour: "#00FF00FF" }];

    expect(ApplyFilters(rows, { colour: optionsFilter(["#FF0000FF"]) })).toEqual([{ colour: "#ff0000" }]);
  });

  it("keeps datetimes inside the timespan and drops empty cells", () => {
    const rows = [{ t: "2026-01-15T00:00:00Z" }, { t: "2026-03-01T00:00:00Z" }, { t: "" }];
    const filter: FilterValue = {
      type: "datetime",
      value: { timespan_begin: "2026-01-01T00:00:00Z", timespan_end: "2026-02-01T00:00:00Z" },
      filter_empty: { timespan_begin: "", timespan_end: "" },
    };

    expect(ApplyFilters(rows, { t: filter })).toEqual([{ t: "2026-01-15T00:00:00Z" }]);
  });
});
