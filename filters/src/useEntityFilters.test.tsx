// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useEntityFilters } from "./useEntityFilters";
import type { ModelData } from "./types";

// Option enrichment is not under test here: hand the model data through.
vi.mock("@bcl32/hooks/useOptionsEnrichment", () => ({
  useOptionsEnrichment: (modelData: unknown) => ({ enrichedModelData: modelData, getLookup: () => [] }),
}));

afterEach(cleanup);

// CalculateFeatureStats counts select values with Object.groupBy
// (data-utils ComputeGroupedStats), which Node only has from v21. The host and
// CI run Node 18; browsers have it. Polyfilled here for this test only.
const ObjectWithGroupBy = Object as unknown as { groupBy?: unknown };
ObjectWithGroupBy.groupBy ??= (items: Iterable<unknown>, key: (item: unknown, i: number) => PropertyKey) => {
  const out: Record<PropertyKey, unknown[]> = {};
  let i = 0;
  for (const item of items) (out[key(item, i++)] ??= []).push(item);
  return out;
};

const model = {
  model_attributes: [
    {
      name: "status",
      type: "select",
      filter: true,
      filter_type: "options",
      filter_empty: [],
      filter_rule: "any",
      primaryFilter: true,
    },
    { name: "archived", type: "boolean", filter: true, filter_type: "options", filter_empty: [], filter_rule: "any" },
  ],
} as unknown as ModelData;

const rows = [
  { status: "done", archived: "false" },
  { status: "failed", archived: "true" },
  { status: "done", archived: "true" },
];

describe("useEntityFilters initialValues", () => {
  it("applies opening values when the rows arrive after the first render", () => {
    const { result, rerender } = renderHook(
      ({ data }) =>
        useEntityFilters(data, model, {
          dynamicFilters: true,
          initialValues: { status: ["done"], archived: ["true"] },
        }),
      { initialProps: { data: undefined as typeof rows | undefined } },
    );
    expect(result.current.filters).toEqual({}); // no stats yet

    rerender({ data: rows });

    expect(result.current.filters.status.value).toEqual(["done"]);
    expect(result.current.filters.archived).toMatchObject({ value: ["true"], primaryFilter: true });
    expect(result.current.filteredData).toEqual([{ status: "done", archived: "true" }]);
  });

  it("applies them only once, so a cleared filter stays cleared", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useEntityFilters(data, model, { initialValues: { status: ["done"] } }),
      { initialProps: { data: rows } },
    );
    expect(result.current.filters.status.value).toEqual(["done"]);

    act(() => {
      result.current.changeFilters("status", "value", []);
    });
    rerender({ data: [...rows] });

    expect(result.current.filters.status.value).toEqual([]);
  });
});

describe("useEntityFilters setFilterValue", () => {
  it("changes an existing filter and creates a missing one, returning the key", () => {
    const { result } = renderHook(() => useEntityFilters(rows, model, { dynamicFilters: true }));

    let key: string | null = null;
    act(() => {
      key = result.current.setFilterValue("archived", ["false"]);
    });
    expect(key).toBe("archived");
    expect(result.current.filters.archived.value).toEqual(["false"]);

    act(() => {
      result.current.setFilterValue("status", ["failed"]);
    });
    expect(result.current.filteredData).toEqual([]); // failed rows are all archived
  });
});
