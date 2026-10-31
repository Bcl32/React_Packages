// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";
import { NumberAdapterProvider } from "@bcl32/utils/NumberAdapter";

import { DetailDensityProvider, EditableDetailItem } from "./EditableDetailItem";

// R12: the click-to-edit detail field, on FieldInput's number box.

// vi.mock is hoisted above the imports, so what its factories close over is too.
const { saves } = vi.hoisted(() => ({ saves: { onSave: undefined as unknown as ReturnType<typeof vi.fn> } }));

afterEach(cleanup);
beforeEach(() => {
  saves.onSave = vi.fn().mockResolvedValue(undefined);
});

const rating: ModelAttribute = {
  name: "rating", type: "number", title: "Rating", editable: true, nullable: true, integer: true, min: 1, max: 5,
};
const price: ModelAttribute = {
  name: "price", type: "number", title: "Price", editable: true, nullable: true, format: "money", decimals: 2,
};
const status: ModelAttribute = {
  name: "status", type: "select", title: "Status", editable: true,
  options: [{ value: "active", label: "active" }, { value: "former", label: "former" }],
};
const name: ModelAttribute = { name: "contact_name", type: "string", title: "Contact", editable: true, nullable: true };
const tags: ModelAttribute = { name: "tags", type: "list", title: "Tags", editable: true, options: ["roof", "gutters"] };
const locked: ModelAttribute = { name: "code", type: "string", title: "Code", editable: false };

const modelData = { model_attributes: [rating, price, status, name, tags, locked] };

function item(field: string, label: string, value: unknown) {
  return render(
    <NumberAdapterProvider currency="CAD">
      <EditableDetailItem label={label} field={field} value={value} modelData={modelData} onSave={saves.onSave} />
    </NumberAdapterProvider>,
  );
}

/** Click the idle field (its container div) into its editor. */
function open(label: string) {
  fireEvent.click(screen.getByText(label).parentElement!);
}
const box = () => screen.getByRole("spinbutton") as HTMLInputElement;
const type = (input: HTMLElement, text: string) => fireEvent.change(input, { target: { value: text } });
const enter = (input: HTMLElement) => fireEvent.keyDown(input, { key: "Enter" });

describe("a number field", () => {
  it("opens on its current value, saves a typed number on Enter and closes", async () => {
    item("rating", "Rating", 3);
    open("Rating");
    expect(box().value).toBe("3");
    expect(document.activeElement).toBe(box());
    type(box(), "4");
    enter(box());
    expect(saves.onSave).toHaveBeenCalledWith({ rating: 4 });
    await waitFor(() => expect(screen.queryByRole("spinbutton")).toBeNull());
  });

  it("saves on blur", () => {
    item("rating", "Rating", 3);
    open("Rating");
    type(box(), "5");
    fireEvent.blur(box());
    expect(saves.onSave).toHaveBeenCalledTimes(1);
    expect(saves.onSave).toHaveBeenCalledWith({ rating: 5 });
  });

  it("saves an emptied box as null", () => {
    item("rating", "Rating", 3);
    open("Rating");
    type(box(), "");
    enter(box());
    expect(saves.onSave).toHaveBeenCalledWith({ rating: null });
  });

  it("refuses a value outside its bounds: open, marked, with the reason, nothing sent", () => {
    item("rating", "Rating", 3);
    open("Rating");
    type(box(), "6");
    enter(box());
    fireEvent.blur(box());
    expect(saves.onSave).not.toHaveBeenCalled();
    expect(box().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Between 1 and 5");
    expect(box().getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
    // Fixing the text clears the mark and saves.
    type(box(), "2");
    expect(screen.queryByRole("alert")).toBeNull();
    enter(box());
    expect(saves.onSave).toHaveBeenCalledWith({ rating: 2 });
  });

  it("refuses a fraction on an integer field", () => {
    item("rating", "Rating", 3);
    open("Rating");
    type(box(), "2.5");
    enter(box());
    expect(saves.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Whole numbers only");
  });

  it("refuses a third decimal on money", () => {
    item("price", "Price", "12.50");
    open("Price");
    type(box(), "12.345");
    enter(box());
    expect(saves.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("2 decimal places at most");
  });

  it("refuses text the browser cannot read (badInput), reported on change", () => {
    item("rating", "Rating", 3);
    open("Rating");
    Object.defineProperty(box(), "validity", { value: { badInput: true }, configurable: true });
    type(box(), "");
    enter(box());
    expect(saves.onSave).not.toHaveBeenCalled();
    expect(box().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Not a number");
  });

  it("refuses badInput found only at save time, rather than saving a silent null", () => {
    item("rating", "Rating", 3);
    open("Rating");
    Object.defineProperty(box(), "validity", { value: { badInput: true }, configurable: true });
    fireEvent.blur(box());
    expect(saves.onSave).not.toHaveBeenCalled();
    expect(box().getAttribute("aria-invalid")).toBe("true");
  });

  it("sends nothing when a Decimal is retyped to the same amount, and closes", async () => {
    item("price", "Price", "12.50");
    open("Price");
    expect(box().value).toBe("12.5");
    type(box(), "12.50");
    enter(box());
    expect(saves.onSave).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("spinbutton")).toBeNull());
  });

  it("cancels on Escape, sending nothing even when the box then blurs", () => {
    item("rating", "Rating", 3);
    open("Rating");
    const input = box();
    type(input, "4");
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(saves.onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("spinbutton")).toBeNull();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("puts money's currency inside the box", () => {
    item("price", "Price", "12.50");
    open("Price");
    expect(box().closest("div")?.textContent).toContain("$");
    expect(box().step).toBe("0.01");
    type(box(), "1249.5");
    enter(box());
    expect(saves.onSave).toHaveBeenCalledWith({ price: 1249.5 });
  });
});

describe("a select field", () => {
  it("saves on change", () => {
    item("status", "Status", "active");
    open("Status");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "former" } });
    expect(saves.onSave).toHaveBeenCalledWith({ status: "former" });
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("sends nothing when the same option is chosen", () => {
    item("status", "Status", "active");
    open("Status");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "active" } });
    expect(saves.onSave).not.toHaveBeenCalled();
  });
});

describe("other fields", () => {
  it("a text field saves its text, and an emptied one as null", () => {
    item("contact_name", "Contact", "Ann");
    open("Contact");
    const input = screen.getByRole("textbox");
    type(input, "Bea");
    enter(input);
    expect(saves.onSave).toHaveBeenLastCalledWith({ contact_name: "Bea" });

    cleanup();
    item("contact_name", "Contact", "Ann");
    open("Contact");
    type(screen.getByRole("textbox"), "");
    fireEvent.blur(screen.getByRole("textbox"));
    expect(saves.onSave).toHaveBeenLastCalledWith({ contact_name: null });
  });

  it("a list field adds a chip and saves the whole list", async () => {
    item("tags", "Tags", ["roof"]);
    open("Tags");
    const input = screen.getByRole("textbox");
    type(input, "gutters");
    enter(input);
    expect(saves.onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(saves.onSave).toHaveBeenCalledWith({ tags: ["roof", "gutters"] });
  });

  it("is read-only when the attribute is not editable or there is no onSave", () => {
    item("code", "Code", "X1");
    open("Code");
    expect(screen.queryByRole("textbox")).toBeNull();
    cleanup();
    render(<EditableDetailItem label="Rating" field="rating" value={3} modelData={modelData} />);
    open("Rating");
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("takes its spacing from the density provider, or its own prop", () => {
    render(
      <DetailDensityProvider density="comfortable">
        <EditableDetailItem label="Code" field="code" value="X1" modelData={modelData} />
        <EditableDetailItem label="Rating" field="rating" value={3} modelData={modelData} onSave={saves.onSave} density="tight" />
      </DetailDensityProvider>,
    );
    expect(screen.getByText("Code").parentElement!.className).toContain("gap-1");
    expect(screen.getByText("Rating").parentElement!.className).toContain("-mx-1");
  });
});
