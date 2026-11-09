import { describe, expect, it } from "vitest";

import { compact, deltaSense, formatDuration, formatEta, formatInt, formatRate, formatValue, signed } from "./format";
import { inkOn, seriesColor, VIZ_CSS, VIZ_DARK, VIZ_LIGHT } from "./palette";
import { lastN, sparkline } from "./sparkline";
import { labelFits, niceScale, placeStack } from "./stack";
import { meterFraction, scoreBand } from "./ScoreMeter";

describe("palette", () => {
  it("clamps slots instead of cycling them", () => {
    expect(seriesColor(1)).toBe("var(--viz-s1)");
    expect(seriesColor(0)).toBe("var(--viz-s1)");
    expect(seriesColor(9)).toBe("var(--viz-s8)");
    expect(seriesColor(Number.NaN)).toBe("var(--viz-s1)");
  });

  it("declares light on :root, dark under the OS query AND the explicit stamp", () => {
    expect(VIZ_CSS).toContain(`:root { --viz-s1: ${VIZ_LIGHT.s1};`);
    expect(VIZ_CSS).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:where\(:not\(\[data-viz-scheme="light"\]\)\)/);
    expect(VIZ_CSS).toContain(`:root[data-viz-scheme="dark"] { --viz-s1: ${VIZ_DARK.s1};`);
    // Status is never themed: declared once, on :root.
    expect(VIZ_CSS.match(/--viz-critical/g)).toHaveLength(1);
  });

  it("prints near-black only on the yellow slot and the warning tone", () => {
    expect(inkOn({ slot: 4 })).toBe("#0b0b0b");
    expect(inkOn({ tone: "warning" })).toBe("#0b0b0b");
    expect(inkOn({ slot: 1 })).toBe("#ffffff");
    expect(inkOn({ tone: "critical" })).toBe("#ffffff");
    expect(inkOn({ neutral: true, slot: 4 })).toBe("#ffffff");
  });
});

describe("format", () => {
  it("is in full under 10,000 and compact past it", () => {
    expect(compact(1284)).toBe("1,284");
    expect(compact(9999)).toBe("9,999");
    expect(compact(12_900)).toBe("12.9K");
    expect(compact(410_000)).toBe("410K");
    expect(compact(4_200_000)).toBe("4.2M");
    expect(compact(999_960)).toBe("1M");
    expect(compact(null)).toBe("—");
  });

  it("signs with a real minus", () => {
    expect(signed(5)).toBe("+5");
    expect(signed(-3)).toBe("−3");
    expect(signed(0)).toBe("0");
  });

  it("spells durations, ETAs and rates", () => {
    expect(formatDuration(450)).toBe("450 ms");
    expect(formatDuration(12_000)).toBe("12 s");
    expect(formatDuration(200_000)).toBe("3 m 20 s");
    expect(formatDuration(3_900_000)).toBe("1 h 5 m");
    expect(formatEta(160)).toBe("~2 m 40 s");
    expect(formatEta(null)).toBe("—");
    expect(formatRate(18.24)).toBe("18.2/s");
    expect(formatInt(1240.4)).toBe("1,240");
  });

  it("formats a ToolCard metric by its named format", () => {
    expect(formatValue(12, "int")).toBe("12");
    expect(formatValue(0.71, "percent")).toBe("71%");
    expect(formatValue(1234, "ms")).toBe("1 s");
    expect(formatValue(25_000, "whatever")).toBe("25K");
  });

  it("colours a delta by direction × good-when", () => {
    expect(deltaSense(5, "down")).toBe("bad");
    expect(deltaSense(-5, "down")).toBe("good");
    expect(deltaSense(5, "up")).toBe("good");
    expect(deltaSense(0, "up")).toBe("flat");
    expect(deltaSense(5, "neutral")).toBe("flat");
  });
});

describe("sparkline", () => {
  it("returns null for nothing to draw and finite points otherwise", () => {
    expect(sparkline([], 100, 20)).toBeNull();
    const s = sparkline([3, 4, 4, 5, 4, 5, 7], 100, 20)!;
    expect(s.points).toHaveLength(7);
    for (const [x, y] of s.points) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(20);
    }
  });

  it("draws one point as a level across the box", () => {
    const s = sparkline([5], 100, 20)!;
    expect(s.points.map((p) => p[0])).toEqual([0, 100]);
  });

  it("keeps the last N finite points", () => {
    expect(lastN([1, null, 2, Number.NaN, 3], 2)).toEqual([2, 3]);
    expect(lastN(Array.from({ length: 20 }, (_, i) => i)).length).toBe(12);
  });
});

describe("stack", () => {
  it("picks a clean top tick", () => {
    expect(niceScale(0)).toEqual({ top: 0, ticks: [0] });
    expect(niceScale(37).top).toBe(40);
    expect(niceScale(3000).ticks).toEqual([0, 1000, 2000, 3000, 4000]);
    expect(niceScale(2000).top).toBe(2000);
  });

  it("drops zero parts and sums shares to one", () => {
    const placed = placeStack([
      { key: "2xx", label: "2xx", value: 90 },
      { key: "3xx", label: "3xx", value: 0 },
      { key: "4xx", label: "4xx", value: 10 },
    ]);
    expect(placed.map((p) => p.key)).toEqual(["2xx", "4xx"]);
    expect(placed[0].share + placed[1].share).toBeCloseTo(1);
    expect(placed[1].offset).toBeCloseTo(0.9);
    expect(placeStack([{ key: "a", label: "a", value: 0 }])).toEqual([]);
  });

  it("only prints a label that fits with padding", () => {
    expect(labelFits(3, 40)).toBe(true);
    expect(labelFits(3, 30)).toBe(false);
    expect(labelFits(3, 0)).toBe(false);
  });
});

describe("meter", () => {
  it("bands scores top-down", () => {
    expect(scoreBand(92).label).toBe("Good");
    expect(scoreBand(80).tone).toBe("accent");
    expect(scoreBand(79).tone).toBe("warning");
    expect(scoreBand(12).tone).toBe("critical");
    expect(scoreBand(-5).tone).toBe("critical");
  });

  it("clamps the fraction and refuses an unknown max", () => {
    expect(meterFraction(50, 100)).toBe(0.5);
    expect(meterFraction(150, 100)).toBe(1);
    expect(meterFraction(5, null)).toBeNull();
    expect(meterFraction(null, 100)).toBeNull();
  });
});
