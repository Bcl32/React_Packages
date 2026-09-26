import { describe, expect, it } from "vitest";

import { seedFilter } from "./seedFilter";
import type { FilterValue } from "./types";

// Characterization tests for addFilter's opening value, per filter type.

const make = (over: Partial<FilterValue>): FilterValue =>
  structuredClone({ type: "string", value: "", filter_empty: "", ...over }) as FilterValue;

describe("seedFilter", () => {
  it("leaves the filter alone with no initial value", () => {
    const filter = make({ type: "number", value: { min: 0, max: 9 }, filter_empty: { min: 0, max: 9 } });

    expect(seedFilter(filter).value).toEqual({ min: 0, max: 9 });
  });

  it("takes a numeric min and/or max for a number filter", () => {
    const range = () => make({ type: "number", value: { min: 0, max: 9 }, filter_empty: { min: 0, max: 9 } });

    expect(seedFilter(range(), { min: 3 }).value).toEqual({ min: 3, max: 9 });
    expect(seedFilter(range(), { max: 4 }).value).toEqual({ min: 0, max: 4 });
    // Non-numeric bounds are ignored.
    expect(seedFilter(range(), { min: "3" as unknown as number }).value).toEqual({ min: 0, max: 9 });
  });

  it("takes a string for a string filter and ignores anything else", () => {
    expect(seedFilter(make({}), "pla").value).toBe("pla");
    expect(seedFilter(make({}), ["pla"]).value).toBe("");
  });

  it("copies an array into an options filter", () => {
    const initial = ["PLA"];
    const filter = seedFilter(make({ type: "options", value: [], filter_empty: [] }), initial);

    expect(filter.value).toEqual(["PLA"]);
    expect(filter.value).not.toBe(initial);
  });

  it("takes non-empty timespan ends for a datetime filter", () => {
    const span = () =>
      make({
        type: "datetime",
        value: { timespan_begin: "2026-01-01", timespan_end: "2026-02-01" },
        filter_empty: { timespan_begin: "2026-01-01", timespan_end: "2026-02-01" },
      });

    expect(seedFilter(span(), { timespan_begin: "2026-01-10" }).value).toEqual({
      timespan_begin: "2026-01-10",
      timespan_end: "2026-02-01",
    });
    // An empty start is ignored, so the filter keeps its data bound rather
    // than comparing against an invalid date.
    expect(seedFilter(span(), { timespan_begin: "", timespan_end: "2026-01-20" }).value).toEqual({
      timespan_begin: "2026-01-01",
      timespan_end: "2026-01-20",
    });
  });
});
