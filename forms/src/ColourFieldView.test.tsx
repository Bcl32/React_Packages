// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";
import type { ColourSwatch } from "@bcl32/utils/ColourPickerPopover";

// The view must never fetch: a call here fails the test.
vi.mock("@bcl32/hooks/useGetRequest", () => ({
  useGetRequest: () => {
    throw new Error("ColourFieldView fetched");
  },
}));

import { ColourFieldView } from "@bcl32/forms/ColourFieldView";

afterEach(cleanup);

const attr: ModelAttribute = { name: "body_colours", type: "colour", title: "Body" };
const pla: ColourSwatch[] = [
  { id: "r", colour_hex: "#ff0000", colour_name: "Red", finish: "silk" },
  { id: "r2", colour_hex: "#ff0000", colour_name: "Red matte", finish: "matte" },
];
const swatchGroups = new Map([["PLA", pla]]);

describe("ColourFieldView", () => {
  it("draws swatches from props, and a pick reports the hex and id, then closes", () => {
    const onSelect = vi.fn();
    render(<ColourFieldView attr={attr} value="" onSelect={onSelect} swatchGroups={swatchGroups} />);
    fireEvent.click(screen.getByLabelText("Body:"));
    fireEvent.click(screen.getByText("Red matte"));
    expect(onSelect).toHaveBeenCalledWith("#ff0000", "r2");
    expect(screen.queryByText("Red matte")).toBeNull();
  });

  it("currentId picks out one of two same-hex swatches", () => {
    render(<ColourFieldView attr={attr} value="#ff0000" currentId="r2" onSelect={vi.fn()} swatchGroups={swatchGroups} />);
    fireEvent.click(screen.getByLabelText("Body:"));
    const selected = (name: string) => screen.getByText(name).closest("button")!.classList.contains("bg-accent");
    expect([selected("Red"), selected("Red matte")]).toEqual([false, true]);
  });

  it("allowCustom={false} hides the Custom input; the default shows it", () => {
    const { rerender, container } = render(
      <ColourFieldView attr={attr} value="" onSelect={vi.fn()} swatchGroups={swatchGroups} allowCustom={false} />,
    );
    fireEvent.click(screen.getByLabelText("Body:"));
    expect(container.querySelector('input[type="color"]')).toBeNull();
    rerender(<ColourFieldView attr={attr} value="" onSelect={vi.fn()} swatchGroups={swatchGroups} />);
    expect(container.querySelector('input[type="color"]')).toBeTruthy();
  });

  it("renderSwatchIcon reaches the popover", () => {
    render(
      <ColourFieldView
        attr={attr}
        value=""
        onSelect={vi.fn()}
        swatchGroups={swatchGroups}
        renderSwatchIcon={(s) => <i data-testid={`dot-${s.id}-${String(s.finish)}`} />}
      />,
    );
    fireEvent.click(screen.getByLabelText("Body:"));
    expect(screen.getByTestId("dot-r-silk")).toBeTruthy();
  });

  it("Escape closes it and focus returns to the trigger", () => {
    render(<ColourFieldView attr={attr} value="" onSelect={vi.fn()} swatchGroups={swatchGroups} />);
    const trigger = screen.getByLabelText("Body:") as HTMLButtonElement;
    trigger.focus();
    fireEvent.click(trigger);
    (screen.getByText("Red").closest("button") as HTMLButtonElement).focus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByText("Red")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
