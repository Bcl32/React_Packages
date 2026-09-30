import { describe, expect, it } from "vitest";

import { NONE_OPTION_VALUE, optionsFromSource } from "./useOptionsEnrichment";

describe("optionsFromSource", () => {
  it("passes a pre-shaped {value,label}[] through untouched", () => {
    const data = [{ value: "a", label: "A" }];
    expect(optionsFromSource(data, { url: "x/tags" })).toBe(data);
  });

  it("maps a ListResponse's rows through value_key / label_key, sorted, none last", () => {
    const data = { items: [{ id: 2, name: "Kitchen Reno" }, { id: 1, name: "Insurance" }], total: 2 };
    expect(
      optionsFromSource(data, { url: "projects/", value_key: "id", label_key: "name", none_label: "No project" }),
    ).toEqual([
      { value: "1", label: "Insurance" },
      { value: "2", label: "Kitchen Reno" },
      { value: NONE_OPTION_VALUE, label: "No project" },
    ]);
  });

  it("falls back to a second label field, then to the id", () => {
    const data = [
      { id: "u1", display_name: " ", email: "kate@example.com" },
      { id: "u2", display_name: null, email: null },
    ];
    expect(
      optionsFromSource(data, { value_key: "id", label_key: "display_name", fallback_label_key: "email" }),
    ).toEqual([
      { value: "u1", label: "kate@example.com" },
      { value: "u2", label: "u2" },
    ]);
  });

  it("gives every label a unique spelling, because the combobox maps labels back to values", () => {
    const rooms = {
      items: [
        { id: "a", name: "Hall", floor: "Main Floor" },
        { id: "b", name: "Hall", floor: "Lower Level" },
        { id: "c", name: "Kitchen", floor: "Main Floor" },
        { id: "d", name: "Closet", floor: "2nd Floor" },
        { id: "e", name: "Closet", floor: "2nd Floor" },
      ],
    };
    const labels = optionsFromSource(rooms, {
      value_key: "id",
      label_key: "name",
      detail_key: "floor",
    }).map((o) => (o as { label: string }).label);
    // A unique name stays short; a detail breaks the tie; a counter breaks
    // what the detail cannot.
    expect(labels).toContain("Kitchen");
    expect(labels).toContain("Hall · Main Floor");
    expect(labels).toContain("Hall · Lower Level");
    expect(labels).toContain("Closet · 2nd Floor");
    expect(labels).toContain("Closet · 2nd Floor (2)");
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("an unexpected response is no options, never a crash", () => {
    expect(optionsFromSource(null, { value_key: "id", label_key: "name" })).toEqual([]);
    expect(optionsFromSource({ detail: "nope" }, { value_key: "id", label_key: "name" })).toEqual([]);
  });
});
