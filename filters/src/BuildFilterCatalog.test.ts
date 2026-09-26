import { describe, expect, it } from "vitest";

import {
  BuildFilterCatalog,
  dynamicFilterKind,
  filterTypeFor,
  resolveFilterKind,
} from "./BuildFilterCatalog";
import { CreateFilter } from "./CreateFilter";
import { BuildFilterSearchIndex } from "./FilterSearch";
import type { DatasetStats, ModelAttribute } from "./types";

const attr = (over: Partial<ModelAttribute>): ModelAttribute => ({
  name: "f",
  type: "string",
  filter: true,
  ...over,
});

describe("resolveFilterKind", () => {
  it.each([
    ["not filterable", attr({ filter: false }), null],
    ["boolean, whatever filter_type says", attr({ type: "boolean", filter_type: "options" }), "boolean"],
    ["declared number", attr({ type: "number", filter_type: "number" }), "number"],
    ["declared datetime on a date field", attr({ type: "date", filter_type: "datetime" }), "datetime"],
    ["declared string on a date field", attr({ type: "date", filter_type: "string" }), "string"],
    ["no filter_type, scalar data type", attr({ type: "number" }), "number"],
    ["no filter_type, select", attr({ type: "select" }), "options"],
    ["invalid declared filter_type", attr({ type: "select", filter_type: "select" }), "options"],
  ])("%s", (_label, item, expected) => {
    expect(resolveFilterKind(item)).toBe(expected);
  });

  it("keeps dynamicFilterKind as the same function", () => {
    expect(dynamicFilterKind).toBe(resolveFilterKind);
  });
});

describe("filterTypeFor", () => {
  it("turns boolean into options and leaves the rest alone", () => {
    expect(filterTypeFor("boolean")).toBe("options");
    expect(filterTypeFor("number")).toBe("number");
    expect(filterTypeFor("options")).toBe("options");
  });
});

describe("the three builders agree", () => {
  const attrs: ModelAttribute[] = [
    attr({ name: "weight_g", type: "number", filter_type: "number", filter_empty: { min: "", max: "" }, unit: "g" }),
    attr({ name: "done", type: "boolean", filter_type: "options", filter_empty: [], options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] }),
    attr({ name: "material", type: "select", filter_type: "select", filter_empty: [], options: [{ value: "PLA", label: "PLA" }] }),
  ];
  const stats: DatasetStats = {
    weight_g: [
      { name: "min", value: 1 },
      { name: "max", value: 9 },
    ],
    done: [],
    material: [{ name: "count", value: [{ name: "PLA", length: 3 }] }],
  };

  it("builds the runtime type the catalog's kind implies", () => {
    const catalog = BuildFilterCatalog(attrs, stats, {});
    for (const entry of catalog) {
      const filter = CreateFilter(entry.attr, stats)!;
      expect(filter.type).toBe(filterTypeFor(entry.type));
    }
  });

  it("points every catalog entry, search entry and filter at the same attribute", () => {
    const catalog = BuildFilterCatalog(attrs, stats, {});
    const index = BuildFilterSearchIndex(attrs, stats);

    for (const item of attrs) {
      expect(catalog.find((e) => e.field === item.name)!.attr).toBe(item);
      expect(CreateFilter(item, stats)!.attr).toBe(item);
    }
    for (const entry of index) {
      expect(entry.attr).toBe(attrs.find((a) => a.name === entry.field));
    }
    expect(index.find((e) => e.field === "weight_g")!.attr.unit).toBe("g");
  });
});
