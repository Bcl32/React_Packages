// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Combobox } from "./Combobox";

afterEach(cleanup);

// Two rooms genuinely called "Hall": the case that used to save the wrong one.
const HALLS = [
  { value: "a1", label: "Hall" },
  { value: "b7", label: "Hall" },
];

function openList() {
  fireEvent.focus(screen.getByRole("textbox"));
}

describe("Combobox with { value, label } options", () => {
  it("picking the SECOND of two same-named options reports its own value", () => {
    const onChange = vi.fn();
    render(<Combobox options={HALLS} value={[]} onChange={onChange} />);
    openList();
    const rows = screen.getAllByRole("button", { name: "Hall" });
    expect(rows).toHaveLength(2);
    fireEvent.click(rows[1]);
    expect(onChange).toHaveBeenCalledWith(["b7"]);
  });

  it("shows the label for a selected value, never the id", () => {
    render(
      <Combobox
        options={[{ value: "r9", label: "Kitchen" }]}
        value={["r9"]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveProperty("value", "Kitchen");
  });

  it("multi-select chips carry labels and remove by value", () => {
    const onChange = vi.fn();
    render(
      <Combobox
        multiple
        options={[...HALLS, { value: "k", label: "Kitchen" }]}
        value={["b7", "k"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Kitchen" }));
    expect(onChange).toHaveBeenCalledWith(["b7"]);
  });

  it("an already-selected value leaves the list; its same-named twin stays", () => {
    render(<Combobox multiple options={HALLS} value={["a1"]} onChange={() => {}} />);
    openList();
    // One "Hall" chip label plus exactly one "Hall" row left to pick.
    expect(screen.getAllByRole("button", { name: "Hall" })).toHaveLength(1);
  });

  it("searches by label", () => {
    render(
      <Combobox
        options={[
          { value: "x1", label: "Kitchen" },
          { value: "x2", label: "Office" },
        ]}
        value={[]}
        onChange={() => {}}
      />,
    );
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "kit" } });
    expect(screen.queryByRole("button", { name: "Office" })).toBeNull();
    expect(screen.getByRole("button", { name: "Kitchen" })).toBeTruthy();
  });

  it("a value with no option behind it (a deleted record) shows as itself", () => {
    render(<Combobox multiple options={HALLS} value={["gone"]} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Remove gone" })).toBeTruthy();
  });
});

describe("Combobox with plain string options (unchanged behaviour)", () => {
  it("a string is its own value", () => {
    const onChange = vi.fn();
    render(<Combobox options={["weekend", "hardware"]} value={[]} onChange={onChange} />);
    openList();
    fireEvent.click(screen.getByRole("button", { name: "hardware" }));
    expect(onChange).toHaveBeenCalledWith(["hardware"]);
  });

  it("free text still becomes a value on Enter", () => {
    const onChange = vi.fn();
    render(<Combobox multiple freeSolo options={["a"]} value={[]} onChange={onChange} />);
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "garden" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["garden"]);
  });

  it("Enter on text matching a pair's label picks that pair's value", () => {
    const onChange = vi.fn();
    render(
      <Combobox options={[{ value: "r9", label: "Kitchen" }]} value={[]} onChange={onChange} />,
    );
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "kitchen" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["r9"]);
  });
});
