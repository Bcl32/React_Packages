// @vitest-environment jsdom
import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Input } from "./Input";

afterEach(cleanup);

describe("Input with an affix", () => {
  it("renders a wrapper holding exactly one input", () => {
    const { container } = render(<Input prefix="$" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.querySelectorAll("input")).toHaveLength(1);
    expect(screen.getByText("$")).toBeTruthy();
  });

  it("merges a string suffix's id into the caller's aria-describedby", () => {
    render(<Input suffix="cm" aria-describedby="hint" />);
    const unit = screen.getByText("cm");
    expect(unit.id).toBeTruthy();
    expect(screen.getByRole("textbox").getAttribute("aria-describedby")).toBe(
      `hint ${unit.id}`,
    );
  });

  it("forwards the ref to the input", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} prefix="$" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole("textbox"));
  });

  it("mousedown on a text affix focuses the input", () => {
    render(<Input suffix="cm" />);
    // false = default prevented: focus was redirected, not left to the span.
    expect(fireEvent.mouseDown(screen.getByText("cm"))).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
  });

  it("mousedown on a button suffix does not take focus to the input", () => {
    render(<Input suffix={<button type="button">Clear</button>} />);
    // true = default NOT prevented: the button keeps its own press.
    expect(fireEvent.mouseDown(screen.getByRole("button", { name: "Clear" }))).toBe(true);
    expect(document.activeElement).not.toBe(screen.getByRole("textbox"));
  });

  it("mousedown on a select suffix does not take focus to the input", () => {
    render(
      <Input
        suffix={
          <select aria-label="Unit">
            <option>cm</option>
            <option>in</option>
          </select>
        }
      />,
    );
    expect(fireEvent.mouseDown(screen.getByRole("combobox", { name: "Unit" }))).toBe(true);
    expect(document.activeElement).not.toBe(screen.getByRole("textbox"));
  });

  it("puts className on the wrapper and inputClassName on the input", () => {
    const { container } = render(
      <Input prefix="$" className="w-24" inputClassName="text-right" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    const input = screen.getByRole("textbox");
    expect(wrapper.className).toContain("w-24");
    expect(input.className).not.toContain("w-24");
    expect(input.className).toContain("text-right");
    expect(wrapper.className).not.toContain("text-right");
  });

  it("passes disabled through to the input", () => {
    render(<Input prefix="$" disabled />);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
  });
});

describe("Input without an affix", () => {
  it("renders the input as the first child, with no wrapper", () => {
    const { container } = render(<Input />);
    expect((container.firstChild as HTMLElement).tagName).toBe("INPUT");
  });
});
