// @vitest-environment jsdom
import type { ReactElement } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

import { FieldInput, FieldSet, type FieldBase, type FieldInputHTMLProps } from "@bcl32/forms/fields";

afterEach(cleanup);

const one = (ui: ReactElement) => {
  const { container } = render(ui);
  return container.querySelector("input, textarea, select") as HTMLInputElement;
};

describe("FieldInput: native length limits from the descriptor", () => {
  const limited = { name: "line", type: "string", min_length: 2, max_length: 24 } as ModelAttribute;

  it.each(["string", "textarea"])("%s: maxLength / minLength from max_length / min_length", (type) => {
    const el = one(<FieldInput attr={{ ...limited, type }} value="" onChange={() => {}} />);
    expect(el.getAttribute("maxlength")).toBe("24");
    expect(el.getAttribute("minlength")).toBe("2");
    expect(el.maxLength).toBe(24);
  });

  it("only the limit the descriptor has", () => {
    const el = one(<FieldInput attr={{ name: "s", type: "string", max_length: 4 } as ModelAttribute} value="" onChange={() => {}} />);
    expect(el.getAttribute("maxlength")).toBe("4");
    expect(el.hasAttribute("minlength")).toBe(false);
  });

  it("no limits: no attribute, the markup of a descriptor without the keys", () => {
    for (const type of ["string", "textarea"]) {
      const el = one(<FieldInput attr={{ name: "s", type }} value="x" onChange={() => {}} />);
      expect(el.hasAttribute("maxlength")).toBe(false);
      expect(el.hasAttribute("minlength")).toBe(false);
    }
  });

  it("not on a number, date or select (lengths are a string's)", () => {
    for (const type of ["number", "date", "select"]) {
      const el = one(<FieldInput attr={{ ...limited, type }} value="" onChange={() => {}} />);
      expect(el.hasAttribute("maxlength")).toBe(false);
    }
  });

  it("reaches the light path: a FieldSet string carries maxLength", () => {
    render(<FieldSet attrs={[{ ...limited, title: "Line" } as FieldBase]} value={{}} onChange={() => {}} />);
    expect(document.getElementById("input_line")!.getAttribute("maxlength")).toBe("24");
  });

  it("counts UTF-16 units, so it is never looser than a code-point count", () => {
    // What the browser compares against maxLength: the raw UTF-16 length.
    const emoji = "😀";
    const decomposed = "é";
    expect(emoji.length).toBe(2);
    expect(Array.from(emoji).length).toBe(1);
    expect(decomposed.length).toBe(2);
    expect(decomposed.normalize("NFC").length).toBe(1);
    // The exception the docs name: NFC expands U+FB2C to 3 code points.
    expect("שּׁ".length).toBe(1);
    expect(Array.from("שּׁ".normalize("NFC")).length).toBe(3);
  });
});

describe("FieldInput: inputProps", () => {
  it("passes extra attributes to the input, textarea and select", () => {
    for (const type of ["string", "textarea", "number", "date"]) {
      const el = one(
        <FieldInput attr={{ name: "s", type }} value="" onChange={() => {}} inputProps={{ autoComplete: "off", spellCheck: false }} />,
      );
      expect(el.getAttribute("autocomplete")).toBe("off");
      expect(el.getAttribute("spellcheck")).toBe("false");
    }
    const select = one(
      <FieldInput attr={{ name: "o", type: "select", options: [] }} value="" onChange={() => {}} inputProps={{ autoComplete: "country" }} />,
    );
    expect(select.tagName).toBe("SELECT");
    expect(select.getAttribute("autocomplete")).toBe("country");
  });

  it("adds a maxLength the descriptor lacks; the descriptor's wins over it", () => {
    const plain = one(<FieldInput attr={{ name: "s", type: "string" }} value="" onChange={() => {}} inputProps={{ maxLength: 10 }} />);
    expect(plain.getAttribute("maxlength")).toBe("10");
    cleanup();
    const limited = one(
      <FieldInput attr={{ name: "s", type: "string", max_length: 4 } as ModelAttribute} value="" onChange={() => {}} inputProps={{ maxLength: 10 }} />,
    );
    expect(limited.getAttribute("maxlength")).toBe("4");
  });

  it("cannot replace id, name, value, onChange, onBlur, type, class or aria", () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const sneaky = vi.fn();
    const el = one(
      <FieldInput
        attr={{ name: "s", type: "string" }}
        id="real"
        name="real"
        value="kept"
        onChange={onChange}
        onBlur={onBlur}
        invalid
        describedBy="err"
        inputProps={
          {
            id: "fake",
            name: "fake",
            value: "lost",
            onChange: sneaky,
            onBlur: sneaky,
            type: "password",
            className: "fake",
            "aria-invalid": false,
            "aria-describedby": "fake",
            "aria-label": "fake",
          } as never
        }
      />,
    );
    expect(el.id).toBe("real");
    expect(el.getAttribute("name")).toBe("real");
    expect(el.value).toBe("kept");
    expect(el.type).toBe("text");
    expect(el.className).not.toContain("fake");
    expect(el.getAttribute("aria-invalid")).toBe("true");
    expect(el.getAttribute("aria-describedby")).toBe("err");
    expect(el.hasAttribute("aria-label")).toBe(false);
    fireEvent.change(el, { target: { value: "x" } });
    fireEvent.blur(el);
    expect(onChange).toHaveBeenCalledWith("x");
    expect(onBlur).toHaveBeenCalled();
    expect(sneaky).not.toHaveBeenCalled();
  });

  it("a number keeps its own step, min and max", () => {
    const el = one(
      <FieldInput
        attr={{ name: "n", type: "number", min: 1, max: 5, integer: true }}
        value={2}
        onChange={() => {}}
        inputProps={{ step: 0.5, min: 0, max: 100, enterKeyHint: "done" }}
      />,
    );
    expect([el.getAttribute("step"), el.getAttribute("min"), el.getAttribute("max")]).toEqual(["1", "1", "5"]);
    expect(el.getAttribute("enterkeyhint")).toBe("done");
  });

  it("is typed to refuse the keys FieldInput owns", () => {
    const attr = { name: "s", type: "string" };
    const typed = (
      <>
        {/* @ts-expect-error id is FieldInput's */}
        <FieldInput attr={attr} value="" onChange={() => {}} inputProps={{ id: "x" }} />
        {/* @ts-expect-error value is FieldInput's */}
        <FieldInput attr={attr} value="" onChange={() => {}} inputProps={{ value: "x" }} />
        {/* @ts-expect-error onChange is FieldInput's */}
        <FieldInput attr={attr} value="" onChange={() => {}} inputProps={{ onChange: () => {} }} />
        {/* @ts-expect-error aria is FieldInput's */}
        <FieldInput attr={attr} value="" onChange={() => {}} inputProps={{ "aria-invalid": true }} />
        <FieldInput attr={attr} value="" onChange={() => {}} inputProps={{ autoComplete: "name", onFocus: () => {} }} />
      </>
    );
    const props: FieldInputHTMLProps = { autoComplete: "street-address", maxLength: 3 };
    expect(typed).toBeTruthy();
    expect(props.maxLength).toBe(3);
  });
});
