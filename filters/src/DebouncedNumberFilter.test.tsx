// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DebouncedNumberFilter } from "./DebouncedNumberFilter";
import { FilterProvider } from "./FilterProvider";
import type { Filters } from "./types";

// Characterization tests for the number filter's typed input (bug B2): each
// keystroke is parsed straight into a number, so text that isn't already an
// in-range number is refused. R9 replaces this with draft text committed on
// blur/Enter, and these tests are expected to change with it.

beforeAll(() => {
  // Radix Slider measures itself; jsdom has no ResizeObserver.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderFilter() {
  const filters: Filters = {
    weight: {
      type: "number",
      value: { min: 10, max: 500 },
      filter_empty: { min: 10, max: 500 },
      title: "Weight",
    },
  };
  const changeFilters = vi.fn();
  const view = render(
    <FilterProvider filters={filters} changeFilters={changeFilters}>
      <DebouncedNumberFilter name="weight" title="Weight" />
    </FilterProvider>,
  );
  const min = view.container.querySelector("#weight-min") as HTMLInputElement;
  const max = view.container.querySelector("#weight-max") as HTMLInputElement;
  return { min, max, changeFilters };
}

function type(input: HTMLInputElement, text: string) {
  act(() => {
    fireEvent.change(input, { target: { value: text } });
  });
}

describe("DebouncedNumberFilter typed input (B2)", () => {
  it("refuses a keystroke that isn't an in-range number", () => {
    const { max } = renderFilter();

    type(max, "2"); // below the 10–500 domain

    expect(max.value).toBe("500");
  });

  it("accepts an in-range number and commits it after the 500 ms debounce", () => {
    const { max, changeFilters } = renderFilter();

    type(max, "250");
    expect(max.value).toBe("250");
    expect(changeFilters).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(changeFilters).toHaveBeenCalledWith("weight", "value", { min: 10, max: 250 });
  });

  it("drops a trailing decimal point, so 12.5 can't be typed key by key", () => {
    const { min } = renderFilter();

    type(min, "12.");

    expect(min.value).toBe("12");
  });

  it("refuses a value outside the domain rather than clamping it", () => {
    const { min } = renderFilter();

    type(min, "600");

    expect(min.value).toBe("10");
  });

  it("accepts a min above the max without reordering them", () => {
    const { min, max, changeFilters } = renderFilter();

    type(max, "250");
    type(min, "400");
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(changeFilters).toHaveBeenLastCalledWith("weight", "value", { min: 400, max: 250 });
  });
});
