import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplyFilters } from "./ApplyFilters";
import { resolveFilterKind, BuildFilterCatalog } from "./BuildFilterCatalog";
import { CreateFilter } from "./CreateFilter";
import { addDays, cellDay, dayTest } from "./dateOnly";
import { ApplyFilterSuggestion, BuildFilterSearchIndex, SearchFilterIndex } from "./FilterSearch";
import { chipLabel, summaryValue } from "./filterText";
import { setFilterValueIn } from "./filterWrites";
import { PREDICATES } from "./predicates";
import type { DatasetStats, DateFilterValue, FilterValue, Filters, ModelAttribute } from "./types";

/**
 * The date filter's whole reason to exist is one bug: comparing a bare
 * `YYYY-MM-DD` with a local-time bound drops the first day of the range
 * anywhere west of UTC. These tests run in Toronto: the file pins the zone
 * itself (Node re-reads TZ when it is assigned), because neither CI nor the
 * root vitest config sets one, and a UTC machine would pass them vacuously.
 */
const ZONE = "America/Toronto";
const PREVIOUS_TZ = process.env.TZ;
process.env.TZ = ZONE;
afterAll(() => {
  if (PREVIOUS_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = PREVIOUS_TZ;
});

function dateFilter(value: Partial<DateFilterValue>): FilterValue {
  return {
    type: "date",
    value: { preset: null, from: "", to: "", ...value },
    filter_empty: { preset: null, from: "", to: "" },
    field: "due_date",
  };
}

const ROWS = [
  { id: "a", due_date: "2026-06-14" },
  { id: "b", due_date: "2026-06-15" },
  { id: "c", due_date: "2026-06-16" },
  { id: "d", due_date: "2026-06-22" },
  { id: "e", due_date: "2026-06-23" },
  { id: "f", due_date: null },
];

const ids = (filters: Filters) => ApplyFilters(ROWS, filters).map((r) => r.id);

const attr = (over: Partial<ModelAttribute> = {}): ModelAttribute =>
  ({
    name: "due_date",
    title: "Due date",
    type: "date",
    filter: true,
    filter_type: "date",
    filter_empty: { preset: null, from: "", to: "" },
    ...over,
  }) as ModelAttribute;

const STATS: DatasetStats = {
  due_date: [
    {
      name: "count",
      value: [
        { name: "2026-06-22", length: 1 },
        { name: "2026-06-14", length: 2 },
        { name: "null", length: 1 },
      ],
    },
  ],
};

describe("date filter, west of UTC", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 21:30 on June 15 in Toronto is already June 16 in UTC: the hour at which
    // a UTC reading of "today" would be wrong.
    vi.setSystemTime(new Date("2026-06-16T01:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("runs in the zone it claims to", () => {
    expect(process.env.TZ).toBe(ZONE);
    expect(new Date().getDate()).toBe(15);
  });

  it("keeps June 15 in 'from June 15'", () => {
    expect(ids({ due_date: dateFilter({ from: "2026-06-15" }) })).toEqual(["b", "c", "d", "e"]);
  });

  it("keeps both ends of a range", () => {
    expect(ids({ due_date: dateFilter({ from: "2026-06-15", to: "2026-06-16" }) })).toEqual(["b", "c"]);
    expect(ids({ due_date: dateFilter({ to: "2026-06-15" }) })).toEqual(["a", "b"]);
  });

  it("reads today as the local day", () => {
    expect(ids({ due_date: dateFilter({ preset: "today" }) })).toEqual(["b"]);
    expect(ids({ due_date: dateFilter({ preset: "past" }) })).toEqual(["a"]);
  });

  it("counts the next 7 days from today, inclusive, and not the past", () => {
    expect(ids({ due_date: dateFilter({ preset: "next7" }) })).toEqual(["b", "c", "d"]);
  });

  it("splits on whether there is a date", () => {
    expect(ids({ due_date: dateFilter({ preset: "has" }) })).toEqual(["a", "b", "c", "d", "e"]);
    expect(ids({ due_date: dateFilter({ preset: "none" }) })).toEqual(["f"]);
  });

  it("asks the clock when the rows are tested, not when the filter was made", () => {
    const filters = { due_date: dateFilter({ preset: "today" }) };
    expect(ids(filters)).toEqual(["b"]);
    vi.setSystemTime(new Date("2026-06-16T16:00:00Z"));
    expect(ids(filters)).toEqual(["c"]);
  });

  it("reads an instant's day in local time", () => {
    expect(cellDay("2026-06-16T01:30:00Z")).toBe("2026-06-15");
    expect(cellDay("2026-06-15")).toBe("2026-06-15");
    expect(cellDay("")).toBeNull();
    expect(cellDay("not a date")).toBeNull();
  });

  it("steps across a DST change without losing a day", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-11-01", 7)).toBe("2026-11-08");
  });
});

describe("date filter value", () => {
  const P = PREDICATES.date;

  it("is inactive empty, and active with a preset or either end", () => {
    expect(P.isActive(dateFilter({}))).toBe(false);
    expect(P.isActive(dateFilter({ preset: "has" }))).toBe(true);
    expect(P.isActive(dateFilter({ to: "2026-01-01" }))).toBe(true);
    expect(P.isActive(dateFilter({ from: "garbage" }))).toBe(false);
  });

  it("has no test for a value that narrows nothing", () => {
    expect(dayTest({ preset: null, from: "", to: "" }, "2026-06-15")).toBeNull();
  });

  it("seeds from a preset token or a partial range, and clears on anything else", () => {
    const f = dateFilter({});
    P.seed(f, "past");
    expect(f.value).toEqual({ preset: "past", from: "", to: "" });
    const g = dateFilter({});
    P.seed(g, { from: "2026-02-01" });
    expect(g.value).toEqual({ preset: null, from: "2026-02-01", to: "" });
    const h = dateFilter({});
    P.seed(h, "overdue");
    expect(P.isActive(h)).toBe(false);
  });

  it("describes itself in words", () => {
    expect(chipLabel("due_date", { ...dateFilter({ preset: "past" }), title: "Due date" })).toBe(
      "Due date: Before today",
    );
    expect(summaryValue(dateFilter({ from: "2026-06-15", to: "2026-06-30" }))).toBe(
      "Jun 15, 2026 → Jun 30, 2026",
    );
    expect(summaryValue(dateFilter({ from: "2026-06-15" }))).toBe("From Jun 15, 2026");
  });
});

describe("date filter plumbing", () => {
  it("resolves only when the metadata says date", () => {
    expect(resolveFilterKind(attr())).toBe("date");
    // Metadata generated before the kind existed keeps its text box.
    expect(resolveFilterKind(attr({ filter_type: "string" }))).toBe("string");
  });

  it("is built with an empty value and no rule", () => {
    const f = CreateFilter(attr(), STATS)!;
    expect(f.type).toBe("date");
    expect(f.value).toEqual({ preset: null, from: "", to: "" });
    expect(f.rule).toBeUndefined();
  });

  it("is offered by the picker with the span of its days", () => {
    const [entry] = BuildFilterCatalog([attr()], STATS, {});
    expect(entry).toMatchObject({ type: "date", earliest: "2026-06-14", latest: "2026-06-22", distinct: 2 });
  });

  it("can be created pinned by a page, and clearing an absent one is a no-op", () => {
    const { filters, key } = setFilterValueIn({}, "due_date", "past", [attr()], STATS);
    expect(key).toBe("due_date");
    expect(filters.due_date.value).toEqual({ preset: "past", from: "", to: "" });
    expect(setFilterValueIn({}, "due_date", "", [attr()], STATS).key).toBeNull();
  });

  it("answers search with its presets", () => {
    const index = BuildFilterSearchIndex([attr()], STATS);
    const [top] = SearchFilterIndex(index, "due: before", { filters: {}, canAdd: true });
    expect(top.action).toEqual({ type: "date-preset", field: "due_date", value: "past" });
    const change = vi.fn();
    const add = vi.fn(() => "due_date");
    ApplyFilterSuggestion(top, { filters: {}, change_filters: change, add_filter: add });
    expect(add).toHaveBeenCalledWith("due_date", "past");
  });
});
