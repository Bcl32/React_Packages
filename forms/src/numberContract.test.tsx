// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { UnitAdapter } from "@bcl32/data-utils/numbers";
import { NumberAdapterProvider } from "@bcl32/utils/NumberAdapter";

// R7: a number box emits number | null, never the browser's string, and the
// forms diff, validate and send numbers.

// vi.mock is hoisted above the imports, so what its factories close over is too.
const { sent, toasts } = vi.hoisted(() => ({
  sent: { body: undefined as unknown, mutate: vi.fn() },
  toasts: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));
vi.mock("@bcl32/hooks/useDatabaseMutation", () => ({
  useDatabaseMutation: (_url: string, body: unknown) => {
    sent.body = body;
    return { mutate: sent.mutate, isPending: false, isError: false, isSuccess: false };
  },
}));
vi.mock("sonner", () => ({ toast: toasts }));

import { normaliseNumbers } from "./numberFields";
import { changedFields } from "./_diff";
import { FieldInput } from "./FieldInput";
import { EditModelForm } from "./EditModelForm";
import { AddModelForm } from "./AddModelForm";

afterEach(cleanup);
beforeEach(() => {
  sent.mutate.mockClear();
  sent.body = undefined;
  Object.values(toasts).forEach((t) => t.mockClear());
});

const width: ModelAttribute = { name: "width_cm", type: "number", title: "Width", editable: true, unit: "cm" };
const height: ModelAttribute = { name: "height_cm", type: "number", title: "Height", editable: true, nullable: true };
const amount: ModelAttribute = { name: "amount", type: "number", title: "Amount", editable: true, default: "0" };
const rating: ModelAttribute = { name: "rating", type: "number", title: "Rating", editable: true, nullable: true, integer: true };

const box = (label: string) => screen.getByLabelText(new RegExp(`^${label}:$`)) as HTMLInputElement;

describe("changedFields (pinned: the diff itself is unchanged)", () => {
  it("still tells a string from a number, so the forms normalise before diffing", () => {
    expect(changedFields({ w: "80" }, { w: 80 })).toEqual({ w: "80" });
    expect(changedFields({ h: "" }, { h: null })).toEqual({ h: "" });
    const attrs = [{ name: "amount", type: "number" }] as ModelAttribute[];
    expect(changedFields(normaliseNumbers({ amount: 12.5 }, attrs), normaliseNumbers({ amount: "12.50" }, attrs))).toEqual({});
  });
});

describe("FieldInput number box", () => {
  it("emits numbers, and null for an emptied box", () => {
    const onChange = vi.fn();
    render(<FieldInput attr={width} value={80} onChange={onChange} id="w" />);
    const input = document.getElementById("w") as HTMLInputElement;
    expect(input.value).toBe("80");
    fireEvent.change(input, { target: { value: "85" } });
    expect(onChange).toHaveBeenLastCalledWith(85);
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("refuses a fraction on an integer field without emitting it", () => {
    const onChange = vi.fn();
    const onInvalid = vi.fn();
    render(<FieldInput attr={rating} value={3} onChange={onChange} onInvalid={onInvalid} id="r" />);
    const input = document.getElementById("r") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2.5" } });
    expect(onChange).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenLastCalledWith("fraction");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(input, { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(onInvalid).toHaveBeenLastCalledWith(null);
  });

  it("shows and reads the display unit under an adapter, and emits stored units", () => {
    const INCHES: UnitAdapter = { toDisplay: (cm) => cm / 2.54, fromDisplay: (inches) => inches * 2.54 };
    const onChange = vi.fn();
    render(
      <NumberAdapterProvider adapterFor={(attr) => (attr.unit === "cm" ? INCHES : null)}>
        <FieldInput attr={width} value={203.2} onChange={onChange} id="w" />
      </NumberAdapterProvider>,
    );
    const input = document.getElementById("w") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.value).toBe("80");
    fireEvent.change(input, { target: { value: "100" } });
    expect(onChange.mock.lastCall?.[0]).toBeCloseTo(254, 9);
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("abc");
  });
});

describe("EditModelForm", () => {
  const ModelData = {
    model_name: "Item",
    get_api_url: "items/",
    update_api_url: "items",
    model_attributes: [width, height, amount, rating],
  } as never;
  const row = { id: 1, width_cm: 80, height_cm: 75, amount: "12.50", rating: 3 };
  const edit = () => render(<EditModelForm ModelData={ModelData} query_invalidation={[]} obj_data={row} />);
  const update = () => fireEvent.click(screen.getByRole("button", { name: "Update" }));

  it("sends nothing when a Decimal is retyped to the same amount", () => {
    edit();
    fireEvent.change(box("Amount"), { target: { value: "12.5" } });
    expect(sent.body).toEqual({});
    update();
    expect(toasts.info).toHaveBeenCalledWith("No changes to save");
    expect(sent.mutate).not.toHaveBeenCalled();
  });

  it("sends a typed number as a number", () => {
    edit();
    fireEvent.change(box("Height"), { target: { value: "90" } });
    expect(sent.body).toEqual({ height_cm: 90 });
  });

  it("clears an optional number to null", () => {
    edit();
    fireEvent.change(box("Height"), { target: { value: "" } });
    expect(sent.body).toEqual({ height_cm: null });
    update();
    expect(sent.mutate).toHaveBeenCalledTimes(1);
  });

  it("refuses to clear a required number, inline, before any request", () => {
    edit();
    fireEvent.change(box("Width"), { target: { value: "" } });
    expect(screen.getByRole("alert").textContent).toBe("Width is required");
    expect(box("Width").getAttribute("aria-describedby")).toBe("error_width_cm");
    update();
    expect(sent.mutate).not.toHaveBeenCalled();
    expect(toasts.error).toHaveBeenCalledWith("Fix the highlighted fields first");
  });

  it("names a fraction on an integer field inline and blocks the submit", () => {
    edit();
    fireEvent.change(box("Rating"), { target: { value: "2.5" } });
    expect(screen.getByRole("alert").textContent).toBe("Whole numbers only");
    update();
    expect(sent.mutate).not.toHaveBeenCalled();
  });
});

describe("AddModelForm", () => {
  const ModelData = { model_name: "Item", get_api_url: "items/", model_attributes: [width, height, amount] } as never;

  it("omits an untouched number and sends a string default as a number", () => {
    render(<AddModelForm ModelData={ModelData} add_api_url="items" query_invalidation={[]} />);
    expect(sent.body).toEqual({ amount: 0 });
    fireEvent.change(box("Width"), { target: { value: "80" } });
    expect(sent.body).toEqual({ amount: 0, width_cm: 80 });
  });
});

// R13: bounds, decimal places and money, named under the field before any request.
describe("bounds, decimals and money", () => {
  const stars: ModelAttribute = { ...rating, min: 1, max: 5 };
  const price: ModelAttribute = {
    name: "price", type: "number", title: "Price", editable: true, format: "money", decimals: 2, min: 0, min_exclusive: true,
  };
  const ModelData = {
    model_name: "Item",
    get_api_url: "items/",
    update_api_url: "items",
    model_attributes: [stars, price],
  } as never;
  const row = { id: 1, rating: 3, price: "12.50" };
  const edit = (currency?: string) =>
    render(
      <NumberAdapterProvider currency={currency}>
        <EditModelForm ModelData={ModelData} query_invalidation={[]} obj_data={row} />
      </NumberAdapterProvider>,
    );
  const update = () => fireEvent.click(screen.getByRole("button", { name: "Update" }));

  it("names a value outside the bounds and blocks the submit", () => {
    edit();
    fireEvent.change(box("Rating"), { target: { value: "6" } });
    expect(screen.getByRole("alert").textContent).toBe("Between 1 and 5");
    update();
    expect(sent.mutate).not.toHaveBeenCalled();
  });

  it("names an exclusive bound in the field's own money", () => {
    edit("CAD");
    fireEvent.change(box("Price"), { target: { value: "0" } });
    expect(screen.getByRole("alert").textContent).toBe("More than $0.00");
  });

  it("refuses a third decimal on money, and sends two as a number", () => {
    edit();
    fireEvent.change(box("Price"), { target: { value: "12.345" } });
    expect(screen.getByRole("alert").textContent).toBe("2 decimal places at most");
    fireEvent.change(box("Price"), { target: { value: "19.99" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(sent.body).toEqual({ price: 19.99 });
  });

  it("keeps money in a number box, with the currency inside it and a 0.01 step", () => {
    edit("CAD");
    const input = box("Price");
    expect(input.type).toBe("number");
    expect(input.step).toBe("0.01");
    expect(input.closest("div")?.textContent).toContain("$");
    expect(box("Rating").min).toBe("1");
    expect(box("Rating").max).toBe("5");
    expect(input.min).toBe(""); // exclusive: left to parseNumber
  });
});
