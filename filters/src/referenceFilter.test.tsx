// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";

import { ApplyFilters } from "./ApplyFilters";
import type { FilterValue } from "./types";
import { NONE_VALUE, useEntityGroups } from "./useEntityGroups";

// A foreign key filtered by the record it points at: the generator's reference
// filter is an ordinary options filter over one uuid per row, plus the `_none`
// choice for rows that point at nothing.

const fk = (value: string[]): FilterValue => ({
  type: "options",
  value,
  filter_empty: [],
  rule: "any",
  cell_shape: "scalar",
});

const rows = [
  { id: 1, project_id: "kitchen" },
  { id: 2, project_id: "insurance" },
  { id: 3, project_id: null },
  { id: 4 },
];

describe("reference filter", () => {
  it("matches rows by the id they point at", () => {
    expect(ApplyFilters(rows, { project_id: fk(["kitchen"]) }).map((r) => r.id)).toEqual([1]);
  });

  it("_none matches an empty or absent cell, and only those", () => {
    expect(ApplyFilters(rows, { project_id: fk([NONE_VALUE]) }).map((r) => r.id)).toEqual([3, 4]);
  });

  it("_none sits beside a real choice: this project OR no project", () => {
    expect(
      ApplyFilters(rows, { project_id: fk(["kitchen", NONE_VALUE]) }).map((r) => r.id),
    ).toEqual([1, 3, 4]);
  });
});

describe("grouping by a reference", () => {
  const modelData = {
    model_attributes: [
      {
        name: "project_id",
        type: "id",
        filter: true,
        filter_type: "options",
        cell_shape: "scalar",
        options_source: { url: "projects/", value_key: "id", label_key: "name", none_label: "No project" },
        options: [
          { value: "insurance", label: "Insurance" },
          { value: "kitchen", label: "Kitchen Reno" },
          { value: NONE_VALUE, label: "No project" },
        ],
      },
    ],
  };

  it("labels lanes by name, keeps the declared none label, and names a dangling id Unknown", () => {
    const data = [...rows, { id: 5, project_id: "deleted-project" }];
    const { result } = renderHook(() =>
      useEntityGroups(data as Record<string, unknown>[], modelData as never, "project_id"),
    );
    const byValue = Object.fromEntries(result.current.groups.map((g) => [g.value, g]));
    expect(byValue.kitchen.label).toBe("Kitchen Reno");
    expect(byValue[NONE_VALUE].label).toBe("No project");
    expect(byValue[NONE_VALUE].count).toBe(2);
    expect(byValue["deleted-project"].label).toBe("Unknown");
  });
});
