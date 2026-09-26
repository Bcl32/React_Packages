import { describe, expect, it } from "vitest";

import { CalculateFeatureStats } from "./CalculateFeatureStats";
import type { ModelAttribute } from "./types";

const stat = (stats: ReturnType<typeof CalculateFeatureStats>, field: string, name: string) =>
  stats[field].find((s) => s.name === name)?.value;

describe("CalculateFeatureStats — number", () => {
  it("ignores empty cells when computing min and max (B4)", () => {
    const attr: ModelAttribute = { name: "height", type: "number" };
    const rows = [{ height: null }, { height: "" }, { height: 120 }, { height: 300 }];

    const stats = CalculateFeatureStats([attr], rows);

    expect(stat(stats, "height", "min")).toBe(120);
    expect(stat(stats, "height", "max")).toBe(300);
  });

  it("keeps empty cells out of the histogram", () => {
    const attr: ModelAttribute = { name: "height", type: "number" };
    const rows = [{ height: null }, { height: "" }, { height: 120 }, { height: 300 }];

    const bins = stat(CalculateFeatureStats([attr], rows), "height", "bins") as { count: number }[];

    expect(bins.reduce((n, b) => n + b.count, 0)).toBe(2);
  });

  it("reads numeric strings as numbers", () => {
    const attr: ModelAttribute = { name: "w", type: "number" };
    const stats = CalculateFeatureStats([attr], [{ w: "4.5" }, { w: 2 }]);

    expect(stat(stats, "w", "min")).toBe(2);
    expect(stat(stats, "w", "max")).toBe(4.5);
  });

  it("reports 0/0 and no bins for a column with no values", () => {
    const attr: ModelAttribute = { name: "w", type: "number" };
    const stats = CalculateFeatureStats([attr], [{ w: null }, {}]);

    expect(stat(stats, "w", "min")).toBe(0);
    expect(stat(stats, "w", "max")).toBe(0);
    expect(stat(stats, "w", "bins")).toEqual([]);
  });

  it("flattens number_list arrays into one pool", () => {
    const attr: ModelAttribute = { name: "axis_counts", type: "number_list" };
    const rows = [{ axis_counts: [3, 7] }, { axis_counts: [1] }, { axis_counts: null }];

    const stats = CalculateFeatureStats([attr], rows);

    expect(stat(stats, "axis_counts", "min")).toBe(1);
    expect(stat(stats, "axis_counts", "max")).toBe(7);
  });
});

describe("CalculateFeatureStats — options", () => {
  it("counts list values across rows", () => {
    const attr: ModelAttribute = { name: "tags", type: "list" };
    const rows = [{ tags: ["a", "b"] }, { tags: ["a"] }, { tags: null }];

    const stats = CalculateFeatureStats([attr], rows);

    expect(stat(stats, "tags", "count")).toEqual([
      { length: 2, name: "a" },
      { length: 1, name: "b" },
    ]);
    expect(stat(stats, "tags", "options")).toEqual(["a", "b"]);
  });
});
