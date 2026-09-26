import { describe, expect, it } from "vitest";

import { applyInitialValues, setFilterValueIn } from "./filterWrites";
import { InitializeFilters } from "./InitializeFilters";
import type { DatasetStats, Filters, ModelAttribute } from "./types";

// Attributes for a small print-job-like entity: one pinned options filter
// (built at mount) and two add-on-demand ones.
const attrs: ModelAttribute[] = [
  {
    name: "status",
    type: "select",
    filter: true,
    filter_type: "options",
    filter_empty: [],
    filter_rule: "any",
    primaryFilter: true,
    options: [
      { value: "done", label: "done" },
      { value: "failed", label: "failed" },
    ],
  },
  {
    name: "archived",
    type: "boolean",
    filter: true,
    filter_type: "options",
    filter_empty: [],
    filter_rule: "any",
  },
  {
    name: "started_at",
    type: "datetime",
    filter: true,
    filter_type: "datetime",
    filter_empty: { timespan_begin: "", timespan_end: "" },
  },
];

const stats: DatasetStats = {
  status: [{ name: "count", value: [] }],
  archived: [],
  started_at: [
    { name: "earliest", value: "2026-01-01T00:00:00Z" },
    { name: "latest", value: "2026-03-01T00:00:00Z" },
  ],
};

const initial = (): Filters => InitializeFilters(attrs, stats, { dynamicFilters: true });

describe("applyInitialValues", () => {
  it("returns the filters unchanged with no opening values", () => {
    const filters = initial();

    expect(applyInitialValues(filters, undefined, attrs, stats)).toBe(filters);
  });

  it("seeds a filter that exists and creates a pinned one that doesn't", () => {
    expect(Object.keys(initial())).toEqual(["status"]); // the rest are on demand

    const next = applyInitialValues(initial(), { status: ["failed"], archived: ["false"] }, attrs, stats);

    expect(next.status.value).toEqual(["failed"]);
    expect(next.archived).toMatchObject({ value: ["false"], primaryFilter: true, dynamic: false });
  });

  it("ignores an empty datetime start instead of comparing against an invalid date", () => {
    const next = applyInitialValues(
      initial(),
      { started_at: { timespan_begin: "", timespan_end: "2026-02-01T00:00:00Z" } },
      attrs,
      stats,
    );

    expect(next.started_at.value).toEqual({
      timespan_begin: "2026-01-01T00:00:00Z",
      timespan_end: "2026-02-01T00:00:00Z",
    });
  });

  it("doesn't create a filter the value would leave inactive, or one for an unknown field", () => {
    const next = applyInitialValues(initial(), { archived: [], nope: ["x"] }, attrs, stats);

    expect(Object.keys(next)).toEqual(["status"]);
  });

  it("doesn't touch the map it was given", () => {
    const filters = initial();
    applyInitialValues(filters, { status: ["done"] }, attrs, stats);

    expect(filters.status.value).toEqual([]);
  });
});

describe("setFilterValueIn", () => {
  it("changes a filter that exists", () => {
    const { filters, key } = setFilterValueIn(initial(), "status", ["done"], attrs, stats);

    expect(key).toBe("status");
    expect(filters.status.value).toEqual(["done"]);
  });

  it("clears a filter with an empty value, including a string filter with \"\"", () => {
    const withStatus = setFilterValueIn(initial(), "status", ["done"], attrs, stats).filters;

    expect(setFilterValueIn(withStatus, "status", [], attrs, stats).filters.status.value).toEqual([]);

    const text: Filters = { note: { type: "string", value: "abc", filter_empty: "", rule: "contains" } };
    expect(setFilterValueIn(text, "note", "", [], {}).filters.note.value).toBe("");
  });

  it("creates a missing filter, pinned", () => {
    const { filters, key } = setFilterValueIn(initial(), "archived", ["true"], attrs, stats);

    expect(key).toBe("archived");
    expect(filters.archived).toMatchObject({ value: ["true"], primaryFilter: true });
  });

  it("does nothing when clearing a filter that isn't there, or for an unknown field", () => {
    const prev = initial();

    expect(setFilterValueIn(prev, "archived", [], attrs, stats)).toEqual({ filters: prev, key: null });
    expect(setFilterValueIn(prev, "nope", ["x"], attrs, stats)).toEqual({ filters: prev, key: null });
  });

  it("creates a missing instance key from its column", () => {
    const { key } = setFilterValueIn(initial(), "archived#2", ["true"], attrs, stats);

    expect(key).toBe("archived");
  });

  it("keeps the rest of the filter (rule, attr) when changing its value", () => {
    const prev = initial();
    const { filters } = setFilterValueIn(prev, "status", ["done"], attrs, stats);

    expect(filters.status.rule).toBe("any");
    expect(filters.status.attr).toBe(prev.status.attr);
  });
});
