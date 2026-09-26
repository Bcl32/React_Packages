import { describe, expect, it } from "vitest";

import { emptyFor } from "./BuildFilterCatalog";
import { PREDICATES, predicateFor } from "./predicates";
import type { FilterKind, FilterValue } from "./types";

const KINDS: FilterKind[] = ["string", "number", "datetime", "options", "boolean"];

describe("PREDICATES", () => {
  it("has a predicate for every filter kind", () => {
    expect(Object.keys(PREDICATES).sort()).toEqual([...KINDS].sort());
  });

  it("filters booleans as options until they get their own runtime type", () => {
    expect(PREDICATES.boolean).toBe(PREDICATES.options);
  });

  it("hands out a fresh empty value every call", () => {
    for (const kind of KINDS) {
      const a = PREDICATES[kind].empty();
      expect(PREDICATES[kind].empty()).toEqual(a);
      if (typeof a === "object") expect(PREDICATES[kind].empty()).not.toBe(a);
    }
  });

  it("is where emptyFor gets its values", () => {
    expect(emptyFor("number")).toEqual({ min: "", max: "" });
    expect(emptyFor("datetime")).toEqual({ timespan_begin: "", timespan_end: "" });
    expect(emptyFor("string")).toBe("");
    expect(emptyFor("options")).toEqual([]);
  });

  it("counts a filter at its empty value as inactive, for every runtime type", () => {
    for (const type of ["string", "number", "datetime", "options"] as const) {
      const empty = emptyFor(type);
      const filter = { type, value: structuredClone(empty), filter_empty: empty } as FilterValue;
      expect(predicateFor(filter)!.isActive(filter)).toBe(false);
    }
  });

  it("has no predicate for an unknown runtime type", () => {
    expect(predicateFor({ type: "select" } as unknown as FilterValue)).toBeUndefined();
  });
});
