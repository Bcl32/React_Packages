import { describe, expect, it } from "vitest";

import { ApplyFilters } from "./ApplyFilters";
import { GetActiveFilters } from "./GetActiveFilters";
import { OrderFilters } from "./OrderFilters";
import { reconcileSubFilters, subFilterKey, withSubFilterCounts } from "./subFilters";
import type { FilterValue, Filters, SubFilterSpec } from "./types";

// A Parts-shaped fixture: systems is a list of {value, label} objects, tags a
// list of strings. HR = HomeRacker, GF = Gridfinity.
const HR = { value: "hr", label: "HomeRacker", kind: "homeracker" };
const GF = { value: "gf", label: "Gridfinity", kind: "gridfinity" };
const sys = (...s: (typeof HR)[]) => s.map(({ value, label }) => ({ value, label }));

const rows = [
  { name: "hr connector", systems: sys(HR), tags: ["Connector"] },
  { name: "hr connectors", systems: sys(HR), tags: ["connectors"] },
  { name: "hr support", systems: sys(HR), tags: ["Support"] },
  { name: "hr custom", systems: sys(HR), tags: ["Custom"] },
  { name: "hr untagged", systems: sys(HR), tags: [] },
  { name: "gf base", systems: sys(GF), tags: ["Base"] },
  { name: "gf bin", systems: sys(GF), tags: ["Parametric"] },
  { name: "gf base 2", systems: sys(GF), tags: ["Base"] },
  { name: "loose", systems: [], tags: ["Connector"] },
  { name: "both shelf", systems: sys(HR, GF), tags: ["Shelving"] },
];

const kinds: SubFilterSpec = {
  options: (parent) =>
    parent.kind === "homeracker"
      ? [
          { value: "connectors", label: "Connectors", match: { field: "tags", anyOf: ["Connector", "Connectors"] } },
          { value: "supports", label: "Supports", match: { field: "tags", anyOf: ["Support"] } },
          { value: "drawers", label: "Drawers", match: { field: "tags", anyOf: ["Drawer"] } },
          { value: "other", label: "Other", other: true },
        ]
      : null,
  derive: { field: "tags" },
  title: (parent, { derived }) => `${parent.label} › ${derived ? "Tags" : "Kind"}`,
};

function systemsFilter(value: string[]): FilterValue {
  return {
    type: "options",
    value,
    filter_empty: [],
    rule: "any",
    cell_shape: "object-array",
    value_key: "value",
    selection: "multi",
    display: "toggle-buttons",
    options: [HR, GF],
    primaryFilter: true,
    filterOrder: 1,
  };
}

const build = (value: string[], extra: Filters = {}) =>
  reconcileSubFilters({ name: nameFilter(), systems: systemsFilter(value), ...extra }, { systems: kinds }, rows);

function nameFilter(value = ""): FilterValue {
  return { type: "string", value, filter_empty: "", rule: "contains", primaryFilter: true };
}

const HR_KEY = subFilterKey("systems", "hr");
const GF_KEY = subFilterKey("systems", "gf");
const names = (filters: Filters) =>
  ApplyFilters(rows, GetActiveFilters(filters)).map((r) => r.name);
const choose = (filters: Filters, key: string, value: string[]) => ({
  ...filters,
  [key]: { ...filters[key], value },
});

describe("reconcileSubFilters", () => {
  it("opens a sub-filter under each selected value, from the fixed list", () => {
    const filters = build(["hr"]);
    const child = filters[HR_KEY];
    expect(child).toMatchObject({
      type: "options",
      display: "toggle-buttons",
      title: "HomeRacker › Kind",
      value: [],
      parent: { key: "systems", column: "systems", token: "hr", cell_shape: "object-array" },
    });
    expect(child.options?.map((o) => o.value)).toEqual(["connectors", "supports", "drawers", "other"]);
    // Its field is its own key, so it never inherits the parent's icons/sizes.
    expect(child.field).toBe(HR_KEY);
  });

  it("falls back to the parent value's distinct tags, most common first", () => {
    const child = build(["gf"])[GF_KEY];
    expect(child.title).toBe("Gridfinity › Tags");
    expect(child.options?.map((o) => o.value)).toEqual(["Base", "Parametric", "Shelving"]);
  });

  it("opens nothing for a value whose list is empty and has no fallback", () => {
    const filters = reconcileSubFilters(
      { systems: systemsFilter(["hr"]) },
      { systems: { options: () => [] } },
      rows,
    );
    expect(Object.keys(filters)).toEqual(["systems"]);
  });

  it("drops a sub-filter and its choices when its value is deselected", () => {
    let filters = choose(build(["hr", "gf"]), HR_KEY, ["connectors"]);
    filters = reconcileSubFilters(
      { ...filters, systems: { ...filters.systems, value: ["gf"] } },
      { systems: kinds },
      rows,
    );
    expect(filters[HR_KEY]).toBeUndefined();
    filters = reconcileSubFilters(
      { ...filters, systems: { ...filters.systems, value: ["gf", "hr"] } },
      { systems: kinds },
      rows,
    );
    expect(filters[HR_KEY].value).toEqual([]); // reselected fresh, not remembered
  });

  it("keeps choices that still exist when it rebuilds", () => {
    const filters = choose(build(["hr"]), HR_KEY, ["supports", "gone"]);
    expect(reconcileSubFilters(filters, { systems: kinds }, rows)[HR_KEY].value).toEqual(["supports"]);
  });

  it("removes a sub-filter whose parent filter was removed", () => {
    const { systems: _gone, ...rest } = build(["hr"]);
    expect(reconcileSubFilters(rest, { systems: kinds }, rows)[HR_KEY]).toBeUndefined();
  });

  it("leaves the map untouched without specs", () => {
    const filters = { systems: systemsFilter(["hr"]) };
    expect(reconcileSubFilters(filters, undefined, rows)).toBe(filters);
  });

  it("works under a single-value parent column", () => {
    const filaments = [
      { material: "PLA", sub_type: "Matte" },
      { material: "PLA", sub_type: "Silk+" },
      { material: "PLA", sub_type: "Matte" },
      { material: "PETG", sub_type: "HF" },
      { material: "TPU", sub_type: null },
    ];
    const material: FilterValue = {
      type: "options",
      value: ["PLA", "PETG"],
      filter_empty: [],
      cell_shape: "scalar",
      options: [
        { value: "PLA", label: "PLA" },
        { value: "PETG", label: "PETG" },
      ],
    };
    let filters = reconcileSubFilters({ material }, { material: { derive: { field: "sub_type" } } }, filaments);
    const pla = subFilterKey("material", "PLA");
    expect(filters[pla].options?.map((o) => o.value)).toEqual(["Matte", "Silk+"]);
    filters = choose(filters, pla, ["Matte"]);
    // PLA narrows to Matte; PETG is untouched.
    expect(ApplyFilters(filaments, GetActiveFilters(filters))).toEqual([
      { material: "PLA", sub_type: "Matte" },
      { material: "PLA", sub_type: "Matte" },
      { material: "PETG", sub_type: "HF" },
    ]);
  });
});

describe("a sub-filter's rows", () => {
  it("narrows only its own parent value (scoped)", () => {
    const filters = choose(build(["hr", "gf"]), HR_KEY, ["connectors"]);
    expect(names(filters)).toEqual(["hr connector", "hr connectors", "gf base", "gf bin", "gf base 2", "both shelf"]);
  });

  it("keeps a row in two values when either one keeps it", () => {
    // "both shelf" is no HomeRacker connector, but Gridfinity is open.
    const open = choose(build(["hr", "gf"]), HR_KEY, ["connectors"]);
    expect(names(open)).toContain("both shelf");
    // Narrow Gridfinity too and nothing keeps it any more.
    const shut = choose(open, GF_KEY, ["Base"]);
    expect(names(shut)).toEqual(["hr connector", "hr connectors", "gf base", "gf base 2"]);
    // Only HomeRacker selected: HomeRacker's choice decides.
    expect(names(choose(build(["hr"]), HR_KEY, ["connectors"]))).toEqual(["hr connector", "hr connectors"]);
  });

  it("matches tags case-insensitively and ORs its choices", () => {
    const filters = choose(build(["hr"]), HR_KEY, ["connectors", "supports"]);
    expect(names(filters)).toEqual(["hr connector", "hr connectors", "hr support"]);
  });

  it("'Other' is everything no other option covers", () => {
    const filters = choose(build(["hr"]), HR_KEY, ["other"]);
    expect(names(filters)).toEqual(["hr custom", "hr untagged", "both shelf"]);
  });

  it("is idle with nothing chosen", () => {
    expect(names(build(["hr"]))).toEqual(
      rows.filter((r) => r.systems.some((s) => s.value === "hr")).map((r) => r.name),
    );
  });
});

describe("withSubFilterCounts", () => {
  it("counts each option under every other filter, not its own choices", () => {
    const filters = withSubFilterCounts(rows, choose(build(["hr"]), HR_KEY, ["connectors"]));
    const counts = Object.fromEntries((filters[HR_KEY].options ?? []).map((o) => [o.value, o.count]));
    expect(counts).toEqual({ connectors: 2, supports: 1, drawers: 0, other: 3 });
  });

  it("follows the other filters and disables what they leave empty", () => {
    const base = choose(build(["hr"], {}), HR_KEY, ["supports"]);
    const filters = withSubFilterCounts(rows, { ...base, name: nameFilter("support") });
    const opts = Object.fromEntries((filters[HR_KEY].options ?? []).map((o) => [o.value, o]));
    expect(opts.supports).toMatchObject({ count: 1, disabled: false });
    expect(opts.connectors).toMatchObject({ count: 0, disabled: true });
  });

  it("keeps a chosen option clickable even at zero", () => {
    const base = choose(build(["hr"]), HR_KEY, ["drawers"]);
    const drawers = withSubFilterCounts(rows, base)[HR_KEY].options?.find((o) => o.value === "drawers");
    expect(drawers).toMatchObject({ count: 0, disabled: false });
  });

  it("returns the same map when there are no sub-filters", () => {
    const filters = { systems: systemsFilter([]) };
    expect(withSubFilterCounts(rows, filters)).toBe(filters);
  });
});

describe("OrderFilters with sub-filters", () => {
  it("places each sub-filter straight after its parent", () => {
    const filters = build(["gf", "hr"], {
      status: { type: "options", value: [], filter_empty: [], primaryFilter: true, filterOrder: 2 },
    });
    expect(OrderFilters(filters).map((e) => e.name)).toEqual(["name", "systems", GF_KEY, HR_KEY, "status"]);
  });
});
