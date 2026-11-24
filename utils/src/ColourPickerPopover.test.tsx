// @vitest-environment jsdom
/**
 * ColourPickerPopover has 7 hosts (forms ColourField and ColourArrayField,
 * filters OptionsFilter, four Print-Tracker components). These pin what they
 * get today with no new props: the panel's markup, the Custom colour input,
 * and what a pick reports.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColourPickerPopover, type ColourSwatch } from "./ColourPickerPopover";

afterEach(cleanup);

const red: ColourSwatch = { id: "r", colour_hex: "#ff0000", colour_name: "Red" };
const blue: ColourSwatch = { id: "b", colour_hex: "#0000ff", colour_name: "Blue" };
const flat = new Map([["PLA", [red, blue]]]);
const nested = new Map([["PLA", new Map([["Matte", [red]], ["Silk", [blue]]])]]);

describe("ColourPickerPopover, default props", () => {
  it("renders the panel and a Custom colour input", () => {
    const { container } = render(<ColourPickerPopover swatchGroups={flat} currentColour="#ff0000" onSelect={vi.fn()} />);
    expect(screen.getByText("Custom")).toBeTruthy();
    const custom = container.querySelector('input[type="color"]') as HTMLInputElement;
    expect(custom).toBeTruthy();
    expect(custom.value).toBe("#ff0000");
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("nested groups and size lg", () => {
    const { container } = render(<ColourPickerPopover swatchGroups={nested} currentId="b" size="lg" onSelect={vi.fn()} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("with no swatches the Custom input is all there is, at the default colour", () => {
    const { container } = render(<ColourPickerPopover swatchGroups={new Map()} onSelect={vi.fn()} />);
    expect((container.querySelector('input[type="color"]') as HTMLInputElement).value).toBe("#6b9bd2");
  });

  it("a swatch reports its hex and id; the Custom input reports a hex alone", () => {
    const onSelect = vi.fn();
    const { container } = render(<ColourPickerPopover swatchGroups={flat} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Blue"));
    expect(onSelect).toHaveBeenLastCalledWith("#0000ff", "b");
    fireEvent.change(container.querySelector('input[type="color"]')!, { target: { value: "#123456" } });
    expect(onSelect).toHaveBeenLastCalledWith("#123456");
  });

  it("renderSwatchIcon replaces the flat dot", () => {
    render(
      <ColourPickerPopover
        swatchGroups={flat}
        onSelect={vi.fn()}
        renderSwatchIcon={(s) => <i data-testid={"icon-" + s.id} />}
      />,
    );
    expect(screen.getByTestId("icon-r")).toBeTruthy();
  });

  it("Escape does nothing without an owner to close it (no onClose today)", () => {
    const onSelect = vi.fn();
    const { container } = render(<ColourPickerPopover swatchGroups={flat} onSelect={onSelect} />);
    fireEvent.keyDown(container.firstChild as Element, { key: "Escape" });
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Custom")).toBeTruthy();
  });
});
