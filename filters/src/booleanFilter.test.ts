import { describe, expect, it, vi } from "vitest";

import { ApplyFilters } from "./ApplyFilters";
import { GetActiveFilters } from "./GetActiveFilters";
import { CreateFilter } from "./CreateFilter";
import { chartClickValue, chartSelection } from "./chartClick";
import { chipLabel, summaryValue } from "./filterText";
import { ApplyFilterSuggestion, BuildFilterSearchIndex, SearchFilterIndex } from "./FilterSearch";
import { getGroupableAttrs, rowGroupValues } from "./useEntityGroups";
import { parseBooleanValue } from "./predicates";
import type { FilterValue, ModelAttribute, ModelData } from "./types";

const boolFilter = (value: unknown, extra: Partial<FilterValue> = {}): FilterValue => ({
  type: "boolean",
  value,
  filter_empty: null,
  title: "Archived",
  ...extra,
});

const rows = [
  { id: 1, archived: true },
  { id: 2, archived: false },
  { id: 3, archived: null },
  { id: 4 },
];
const ids = (value: unknown) =>
  ApplyFilters(rows, { archived: boolFilter(value) }).map((r) => r.id);

describe("the boolean predicate", () => {
  it("matches Yes to true and No to false only", () => {
    expect(ids(true)).toEqual([1]);
    expect(ids(false)).toEqual([2]);
  });

  it("matches Unknown to an empty cell", () => {
    expect(ids("unknown")).toEqual([3, 4]);
  });

  it("is inactive at null, so GetActiveFilters drops it", () => {
    expect(ids(null)).toEqual([1, 2, 3, 4]);
    expect(GetActiveFilters({ a: boolFilter(null), b: boolFilter(false) })).toEqual({ b: boolFilter(false) });
  });

  it("reads string cells as booleans", () => {
    const stringRows = [{ archived: "true" }, { archived: "false" }];
    expect(ApplyFilters(stringRows, { archived: boolFilter(true) })).toEqual([{ archived: "true" }]);
  });
});

describe("parseBooleanValue", () => {
  it.each([
    [true, true],
    ["true", true],
    [["false"], false],
    ["unknown", "unknown"],
    ["_none", "unknown"],
    [null, null],
    [[], undefined],
    ["yes", undefined],
  ])("%j → %j", (token, expected) => {
    expect(parseBooleanValue(token)).toBe(expected);
  });
});

describe("CreateFilter for a boolean", () => {
  it("builds the boolean filter from metadata that still says options", () => {
    const attr: ModelAttribute = {
      name: "done",
      type: "boolean",
      filter: true,
      filter_type: "options",
      filter_empty: [],
      filter_rule: "any",
      cell_shape: "scalar",
      selection: "multi",
      display: "toggle-buttons",
      options: [{ value: "true", label: "Yes" }],
    };
    const filter = CreateFilter(attr, { done: [] })!;

    expect(filter).toMatchObject({ type: "boolean", value: null, filter_empty: null, rule: undefined });
    expect(filter.display).toBeUndefined();
    expect(filter.selection).toBeUndefined();
  });

  it("carries the checkbox settings and nullable", () => {
    const attr: ModelAttribute = {
      name: "archived",
      type: "boolean",
      filter: true,
      filter_type: "boolean",
      filter_empty: null,
      display: "checkbox",
      checkedValue: false,
      checkedLabel: "Hide archived",
      nullable: true,
    };

    expect(CreateFilter(attr, { archived: [] })).toMatchObject({
      display: "checkbox",
      checkedValue: false,
      checkedLabel: "Hide archived",
      nullable: true,
    });
  });
});

describe("boolean text", () => {
  it("reads as the label, its negation, or unknown", () => {
    expect(chipLabel("archived", boolFilter(true))).toBe("Archived");
    expect(chipLabel("archived", boolFilter(false))).toBe("Not archived");
    expect(chipLabel("archived", boolFilter("unknown"))).toBe("Archived: unknown");
    expect(summaryValue(boolFilter(false))).toBe("No");
    expect(summaryValue(boolFilter("unknown"))).toBe("Unknown");
  });

  it("uses a checkbox's own label for its checked side", () => {
    const checkbox = { display: "checkbox" as const, checkedValue: false, checkedLabel: "Hide archived" };
    expect(chipLabel("archived", boolFilter(false, checkbox))).toBe("Hide archived");
    expect(chipLabel("archived", boolFilter(true, checkbox))).toBe("Archived");
  });
});

describe("boolean chart clicks", () => {
  it("writes true / false, and resets on the selected category", () => {
    const filter = boolFilter(null);
    expect(chartClickValue(filter, "true", [])).toBe(true);
    expect(chartClickValue(filter, "false", [])).toBe(false);
    expect(chartClickValue(filter, "null", [])).toBe("unknown");
    expect(chartSelection(boolFilter(false))).toEqual(["false"]);
    expect(chartClickValue(boolFilter(false), "false", ["false"])).toBeNull();
  });
});

describe("boolean search", () => {
  const attrs: ModelAttribute[] = [
    { name: "archived", title: "Archived", type: "boolean", filter: true, filter_type: "boolean" },
    { name: "mirrored", title: "Mirrored", type: "boolean", filter: true, filter_type: "boolean", nullable: true },
  ];
  const index = BuildFilterSearchIndex(attrs, { archived: [], mirrored: [] });

  it("offers Unknown only on a nullable field", () => {
    expect(index.find((e) => e.field === "archived")!.values.map((v) => v.label)).toEqual(["Yes", "No"]);
    expect(index.find((e) => e.field === "mirrored")!.values.map((v) => v.label)).toEqual(["Yes", "No", "Unknown"]);
  });

  it("writes a boolean value, not a string list", () => {
    const [top] = SearchFilterIndex(index, "archived: no", { filters: {}, canAdd: true });
    expect(top.action).toEqual({ type: "boolean-value", field: "archived", value: false });

    const change_filters = vi.fn();
    ApplyFilterSuggestion(top, { filters: { archived: boolFilter(null, { field: "archived" }) }, change_filters });
    expect(change_filters).toHaveBeenCalledWith("archived", "value", false);

    const add_filter = vi.fn(() => "archived");
    ApplyFilterSuggestion(top, { filters: {}, change_filters, add_filter });
    expect(add_filter).toHaveBeenCalledWith("archived", false);
  });
});

describe("grouping by a boolean", () => {
  it("offers booleans as categories whatever their filter_type", () => {
    const modelData = {
      model_attributes: [
        { name: "archived", type: "boolean", filter: true, filter_type: "boolean" },
        { name: "done", type: "boolean", filter: true, filter_type: "options" },
        { name: "weight", type: "number", filter: true, filter_type: "number" },
      ],
    } as unknown as ModelData;

    expect(getGroupableAttrs(modelData).map((a) => a.name)).toEqual(["archived", "done"]);
  });

  it("puts a row in the true / false lane, and an empty cell in none", () => {
    const attr = { name: "archived", type: "boolean" } as ModelAttribute;
    expect(rowGroupValues({ archived: true }, attr)).toEqual([{ value: "true" }]);
    expect(rowGroupValues({ archived: null }, attr)).toEqual([{ value: "_none" }]);
  });
});
