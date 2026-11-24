// @vitest-environment jsdom
/**
 * ColourPickerPopover has 7 hosts (forms ColourField and ColourArrayField,
 * filters OptionsFilter, four Print-Tracker components). These pin what they
 * get today with no new props: the panel's markup, the Custom colour input,
 * and what a pick reports.
 */
import * as React from "react";
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

describe("allowCustom", () => {
  it("false hides the Custom heading and input; the swatches stay", () => {
    const { container } = render(<ColourPickerPopover swatchGroups={flat} onSelect={vi.fn()} allowCustom={false} />);
    expect(screen.queryByText("Custom")).toBeNull();
    expect(container.querySelector('input[type="color"]')).toBeNull();
    expect(screen.getByText("Red")).toBeTruthy();
  });

  it("true is the same markup as leaving it out", () => {
    const a = render(<ColourPickerPopover swatchGroups={flat} currentColour="#ff0000" onSelect={vi.fn()} allowCustom />).container.innerHTML;
    cleanup();
    const b = render(<ColourPickerPopover swatchGroups={flat} currentColour="#ff0000" onSelect={vi.fn()} />).container.innerHTML;
    expect(a).toBe(b);
  });
});

describe("onClose (Escape)", () => {
  /** A trigger that opens the popover, the way every host does. */
  function Host({ onClose }: { onClose?: () => void }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Pick
        </button>
        {open && (
          <ColourPickerPopover
            swatchGroups={flat}
            onSelect={vi.fn()}
            onClose={
              onClose
                ? () => {
                    onClose();
                    setOpen(false);
                  }
                : undefined
            }
          />
        )}
      </div>
    );
  }

  it("Escape calls onClose, stops there, and gives focus back to the trigger", () => {
    const onClose = vi.fn();
    const behind = vi.fn(); // a dialog's Escape handler, on document
    document.addEventListener("keydown", behind, true);
    render(<Host onClose={onClose} />);
    const trigger = screen.getByText("Pick");
    trigger.focus();
    fireEvent.click(trigger);
    // Focus wanders into the panel.
    (screen.getByText("Blue").closest("button") as HTMLButtonElement).focus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(behind).not.toHaveBeenCalled();
    expect(screen.queryByText("Custom")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    // Closed: the next Escape belongs to whatever is behind.
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(behind).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", behind, true);
  });

  it("other keys pass through", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    fireEvent.click(screen.getByText("Pick"));
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("without onClose, Escape is not touched (reaches a dialog behind, as today)", () => {
    const behind = vi.fn();
    document.addEventListener("keydown", behind, true);
    render(<Host />);
    fireEvent.click(screen.getByText("Pick"));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(behind).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Custom")).toBeTruthy();
    document.removeEventListener("keydown", behind, true);
  });
});
