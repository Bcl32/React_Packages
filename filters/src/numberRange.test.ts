import { describe, expect, it } from "vitest";

import { clamp, nudge, numberDomain, sameRange, setBound, stepFor } from "./numberRange";

const d = { min: 10, max: 500 };

describe("numberDomain", () => {
  it("is the data's range, or null when there isn't a usable one", () => {
    expect(numberDomain({ min: 10, max: 500 })).toEqual(d);
    expect(numberDomain({ min: 5, max: 5 })).toEqual({ min: 5, max: 5 });
    expect(numberDomain({ min: Number.NaN, max: 5 })).toBeNull();
    expect(numberDomain({ min: 9, max: 5 })).toBeNull();
    expect(numberDomain(undefined)).toBeNull();
  });
});

describe("stepFor", () => {
  it.each([
    [{ min: 10, max: 500 }, 5],
    [{ min: 12.3456, max: 1234567 }, 10000],
    [{ min: 0.4, max: 0.8 }, 0.005],
    [{ min: 0, max: 7 }, 0.05],
    [{ min: 1, max: 5 }, 0.05],
    [{ min: 190, max: 230 }, 0.5],
    [{ min: 0, max: 100 }, 1],
  ])("steps %j by %s", (domain, step) => {
    expect(stepFor(domain)).toBe(step);
  });

  it("never steps an integer column by less than 1", () => {
    expect(stepFor({ min: 0, max: 7 }, { integer: true })).toBe(1);
    expect(stepFor({ min: 0, max: 5000 }, { integer: true })).toBe(50);
  });

  it("takes a unit's own step, and 1 for an empty domain", () => {
    expect(stepFor(d, { step: 1.27 })).toBe(1.27);
    expect(stepFor({ min: 3, max: 3 })).toBe(1);
    expect(stepFor(null)).toBe(1);
  });
});

describe("setBound", () => {
  it("swaps a min typed above the max", () => {
    expect(setBound({ min: 10, max: 250 }, "min", 300, d)).toEqual({ min: 250, max: 300 });
  });

  it("clamps into the domain", () => {
    expect(setBound({ min: 10, max: 500 }, "max", 1000, d)).toEqual({ min: 10, max: 500 });
    expect(setBound({ min: 10, max: 500 }, "min", -5, d)).toEqual({ min: 10, max: 500 });
    expect(clamp(42, null)).toBe(42);
  });

  it("sets an in-range value as typed", () => {
    expect(setBound({ min: 10, max: 500 }, "max", 250, d)).toEqual({ min: 10, max: 250 });
  });
});

describe("nudge", () => {
  it("steps one end", () => {
    expect(nudge({ min: 10, max: 500 }, "min", 1, 5, d)).toEqual({ min: 15, max: 500 });
    expect(nudge({ min: 10, max: 500 }, "max", -1, 5, d)).toEqual({ min: 10, max: 495 });
  });

  it("stops at the other end instead of crossing it", () => {
    expect(nudge({ min: 250, max: 250 }, "min", 1, 5, d)).toEqual({ min: 250, max: 250 });
    expect(nudge({ min: 248, max: 250 }, "min", 1, 5, d)).toEqual({ min: 250, max: 250 });
    expect(nudge({ min: 250, max: 252 }, "max", -1, 5, d)).toEqual({ min: 250, max: 250 });
  });

  it("stops at the domain edge and keeps float noise out", () => {
    expect(nudge({ min: 10, max: 500 }, "min", -1, 5, d)).toEqual({ min: 10, max: 500 });
    expect(nudge({ min: 0.1, max: 1 }, "min", 1, 0.2, { min: 0, max: 1 })).toEqual({ min: 0.3, max: 1 });
  });
});

it("sameRange compares both ends", () => {
  expect(sameRange({ min: 1, max: 2 }, { min: 1, max: 2 })).toBe(true);
  expect(sameRange({ min: 1, max: 2 }, { min: 1, max: 3 })).toBe(false);
});
