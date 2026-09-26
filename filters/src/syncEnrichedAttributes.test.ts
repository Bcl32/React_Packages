import { describe, expect, it } from "vitest";

import { CreateFilter } from "./CreateFilter";
import { syncEnrichedAttributes } from "./syncEnrichedAttributes";
import type { DatasetStats, Filters, ModelAttribute } from "./types";

// The page-load order R4 decision 6 is about: a filter is built from the
// attribute as it is before its option list is fetched (v1), then
// useOptionsEnrichment replaces that attribute with a copy carrying the
// fetched options (v2).

const v1: ModelAttribute = {
  name: "vendor_id",
  type: "select",
  filter: true,
  filter_type: "options",
  filter_empty: [],
  filter_rule: "any",
  options_source: { url: "/vendors/options" },
};
const fetched = [{ value: "1", label: "Acme" }];
const v2: ModelAttribute = { ...v1, options: fetched };
const stats: DatasetStats = { vendor_id: [] };

function built(): Filters {
  const filter = CreateFilter(v1, stats)!;
  return { vendor_id: { ...filter, value: ["1"] } };
}

describe("syncEnrichedAttributes", () => {
  it("swaps in the enriched attribute along with its options", () => {
    const next = syncEnrichedAttributes(built(), [v2]);

    expect(next.vendor_id.options).toBe(fetched);
    expect(next.vendor_id.attr).toBe(v2);
    expect(next.vendor_id.attr!.options).toBe(next.vendor_id.options);
  });

  it("keeps the user's value and rule", () => {
    const next = syncEnrichedAttributes(built(), [v2]);

    expect(next.vendor_id.value).toEqual(["1"]);
    expect(next.vendor_id.rule).toBe("any");
  });

  it("updates user-added instances by their column", () => {
    const prev = built();
    prev["vendor_id#2"] = { ...prev.vendor_id, field: "vendor_id" };

    const next = syncEnrichedAttributes(prev, [v2]);

    expect(next["vendor_id#2"].attr).toBe(v2);
  });

  it("returns the same map when nothing changed", () => {
    const once = syncEnrichedAttributes(built(), [v2]);

    expect(syncEnrichedAttributes(once, [v2])).toBe(once);
  });

  it("updates attr when a re-spread attribute keeps the same options array", () => {
    const once = syncEnrichedAttributes(built(), [v2]);
    const v3: ModelAttribute = { ...v2 };

    const next = syncEnrichedAttributes(once, [v3]);

    expect(next.vendor_id.attr).toBe(v3);
    expect(next.vendor_id.options).toBe(fetched);
  });

  it("ignores attributes that still have no options", () => {
    const prev = built();

    expect(syncEnrichedAttributes(prev, [v1])).toBe(prev);
  });
});
