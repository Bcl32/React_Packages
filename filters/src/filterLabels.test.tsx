// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { DebouncedNumberFilter } from "./DebouncedNumberFilter";
import { DebouncedTextFilter } from "./DebouncedTextFilter";
import { FilterProvider } from "./FilterProvider";
import type { Filters } from "./types";

// Every box a filter draws has an accessible name: the field's label, plus
// "minimum"/"maximum" on a range (DateFilter's "from"/"to" precedent).

beforeAll(() => {
  // Radix Slider measures itself; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const filters: Filters = {
  weight: {
    type: "number",
    value: { min: 10, max: 500 },
    filter_empty: { min: 10, max: 500 },
    title: "Weight",
  },
  brand: { type: "string", value: "", filter_empty: "", rule: "contains", title: "Brand" },
};

function renderIn(child: React.ReactNode) {
  return render(
    <FilterProvider filters={filters} changeFilters={vi.fn()}>
      {child}
    </FilterProvider>,
  );
}

describe("filter boxes are named", () => {
  it("names the number filter's min and max boxes and their nudge buttons", () => {
    renderIn(<DebouncedNumberFilter name="weight" title="Weight" />);
    expect(screen.getByLabelText("Weight minimum")).toHaveProperty("id", "weight-min");
    expect(screen.getByLabelText("Weight maximum")).toHaveProperty("id", "weight-max");
    for (const name of [
      "Raise Weight minimum",
      "Lower Weight minimum",
      "Raise Weight maximum",
      "Lower Weight maximum",
    ]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("names the text filter's box after its field", () => {
    renderIn(<DebouncedTextFilter name="brand" title="Brand" />);
    expect(screen.getByRole("textbox", { name: "Brand" })).toHaveProperty("id", "filter_brand");
  });
});
