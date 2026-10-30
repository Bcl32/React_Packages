// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DebouncedNumberFilter } from "./DebouncedNumberFilter";
import { FilterProvider } from "./FilterProvider";
import type { Filters } from "./types";

// The number filter's typed input (R9, bug B2). Each box holds draft text and
// commits it on blur or Enter, through parseNumber and setBound: clamped into
// the domain, an inverted pair swapped, an emptied box back to its edge, and
// unreadable text kept in the box, marked, and never sent. These replaced the
// characterization tests that pinned the old keystroke-by-keystroke parsing.

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

const weight = (value = { min: 10, max: 500 }): Filters => ({
  weight: { type: "number", value, filter_empty: { min: 10, max: 500 }, title: "Weight" },
});

function renderFilter() {
  const changeFilters = vi.fn();
  const view = render(
    <FilterProvider filters={weight()} changeFilters={changeFilters}>
      <DebouncedNumberFilter name="weight" title="Weight" />
    </FilterProvider>,
  );
  const min = view.container.querySelector("#weight-min") as HTMLInputElement;
  const max = view.container.querySelector("#weight-max") as HTMLInputElement;
  return { view, min, max, changeFilters };
}

/** Focus a box, type each step of the text in turn, and leave it. */
function type(input: HTMLInputElement, ...steps: string[]) {
  act(() => {
    fireEvent.focus(input);
    for (const text of steps) fireEvent.change(input, { target: { value: text } });
  });
}
const leave = (input: HTMLInputElement) => act(() => void fireEvent.blur(input));
const press = (input: HTMLInputElement, key: string, init: KeyboardEventInit = {}) =>
  act(() => void fireEvent.keyDown(input, { key, ...init }));
const wait = (ms = 500) => act(() => void vi.advanceTimersByTime(ms));

describe("DebouncedNumberFilter typed input (B2)", () => {
  it("holds text on the way to a number, and commits it once, on blur", () => {
    const { max, changeFilters } = renderFilter();

    type(max, "2", "25", "250");
    expect(max.value).toBe("250");
    expect(changeFilters).not.toHaveBeenCalled();

    leave(max);
    expect(changeFilters).toHaveBeenCalledTimes(1);
    expect(changeFilters).toHaveBeenCalledWith("weight", "value", { min: 10, max: 250 });
    wait();
    expect(changeFilters).toHaveBeenCalledTimes(1);
  });

  it("keeps a trailing point, so 12.5 can be typed key by key", () => {
    const { min, changeFilters } = renderFilter();

    type(min, "1", "12", "12.");
    expect(min.value).toBe("12.");
    type(min, "12.5");
    press(min, "Enter");

    expect(changeFilters).toHaveBeenLastCalledWith("weight", "value", { min: 12.5, max: 500 });
  });

  it("clamps a bound outside the domain", () => {
    const { max, changeFilters } = renderFilter();

    type(max, "1000");
    leave(max);

    // 500 is already the edge, so there is nothing to send.
    expect(changeFilters).not.toHaveBeenCalled();
    expect(max.value).toBe("500");
  });

  it("swaps a min typed above the max", () => {
    const { min, max, changeFilters } = renderFilter();

    type(max, "250");
    leave(max);
    type(min, "400");
    leave(min);

    expect(changeFilters).toHaveBeenLastCalledWith("weight", "value", { min: 250, max: 400 });
  });

  it("reads an emptied box as no limit on that side", () => {
    const { max, changeFilters } = renderFilter();

    type(max, "250");
    leave(max);
    type(max, "");
    leave(max);

    expect(changeFilters).toHaveBeenLastCalledWith("weight", "value", { min: 10, max: 500 });
  });

  it("keeps unreadable text in the box, marked, and sends nothing; Escape puts the value back", () => {
    const { min, changeFilters } = renderFilter();

    type(min, "30abc");
    leave(min);
    expect(min.value).toBe("30abc");
    expect(min.getAttribute("aria-invalid")).toBe("true");
    expect(changeFilters).not.toHaveBeenCalled();

    press(min, "Escape");
    expect(min.value).toBe("10");
    expect(min.getAttribute("aria-invalid")).toBeNull();
  });

  it("writes nothing for a box focused and left untouched", () => {
    const { min, changeFilters } = renderFilter();

    type(min);
    leave(min);
    wait();

    expect(changeFilters).not.toHaveBeenCalled();
  });

  it("nudges by a readable step with the arrow keys, ten steps with Shift", () => {
    const { min, changeFilters } = renderFilter();

    type(min);
    press(min, "ArrowUp");
    expect(min.value).toBe("15");
    press(min, "ArrowUp", { shiftKey: true });
    expect(min.value).toBe("65");
    wait();

    expect(changeFilters).toHaveBeenLastCalledWith("weight", "value", { min: 65, max: 500 });
  });

  it("applies typed text before an arrow key steps from it", () => {
    const { max, changeFilters } = renderFilter();

    type(max, "250");
    press(max, "ArrowDown");

    expect(changeFilters).toHaveBeenCalledWith("weight", "value", { min: 10, max: 250 });
    expect(max.value).toBe("245");
  });

  it("does not echo a range set from outside back as a second write", () => {
    const { view, changeFilters } = renderFilter();

    view.rerender(
      <FilterProvider filters={weight({ min: 50, max: 300 })} changeFilters={changeFilters}>
        <DebouncedNumberFilter name="weight" title="Weight" />
      </FilterProvider>,
    );
    wait();

    expect(changeFilters).not.toHaveBeenCalled();
  });
});

describe("DebouncedNumberFilter keyboard and names", () => {
  it("keeps the +/− buttons out of the tab order, still named", () => {
    const { view } = renderFilter();

    const buttons = ["Raise", "Lower"].flatMap((verb) =>
      ["minimum", "maximum"].map((which) => view.getByRole("button", { name: `${verb} Weight ${which}` })),
    );
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, -1, -1]);
  });

  it("gives each box its own name and the slider the field's", () => {
    const { view, min, max } = renderFilter();

    expect([min.name, max.name]).toEqual(["weight-min", "weight-max"]);
    expect(view.container.querySelector('[aria-label="Weight range"]')).not.toBeNull();
  });
});
