// @vitest-environment jsdom
import type { ReactElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

import { FieldInput, FieldSet, FieldStyleProvider, type FieldBase, type FieldSize } from "@bcl32/forms/fields";

afterEach(cleanup);

const TYPES: [ModelAttribute, unknown][] = [
  [{ name: "s", type: "string" }, "hi"],
  [{ name: "d", type: "date" }, "2026-01-02"],
  [{ name: "t", type: "textarea" }, "a"],
  [{ name: "n", type: "number", unit: "cm", unit_label: "cm" }, 3],
  [{ name: "b", type: "boolean" }, true],
  [{ name: "o", type: "select", options: [{ value: "a", label: "A" }] }, "a"],
];

const html = (ui: ReactElement) => {
  // useId's counter moves on between renders; the ids are not what is compared.
  const out = render(ui).container.innerHTML.replace(/:r[0-9a-z]+:/g, ":id:");
  cleanup();
  return out;
};
const input = (attr: ModelAttribute, value: unknown, extra: Record<string, unknown> = {}) =>
  html(<FieldInput attr={attr} value={value} onChange={() => {}} id={"input_" + attr.name} {...extra} />);

describe("FieldInput defaults are byte-identical", () => {
  it.each(TYPES)("%j: size md ≡ unset, sm ≡ compact, empty classNames ≡ none", (attr, value) => {
    const today = input(attr, value);
    expect(input(attr, value, { size: "md" })).toBe(today);
    expect(input(attr, value, { classNames: {} })).toBe(today);
    expect(input(attr, value, { size: "sm" })).toBe(input(attr, value, { compact: true }));
    // size wins over compact when both are given
    expect(input(attr, value, { size: "md", compact: true })).toBe(today);
  });
});

describe("FieldInput size lg and slots", () => {
  it("lg: 48 px controls in text-base", () => {
    const { container } = render(
      <>
        <FieldInput attr={TYPES[0][0]} value="" onChange={() => {}} size="lg" />
        <FieldInput attr={TYPES[5][0]} value="a" onChange={() => {}} size="lg" />
        <FieldInput attr={TYPES[2][0]} value="" onChange={() => {}} size="lg" />
      </>,
    );
    const [text, select, area] = [container.querySelector("input")!, container.querySelector("select")!, container.querySelector("textarea")!];
    expect(text.classList.contains("h-12")).toBe(true);
    expect(text.classList.contains("md:text-base")).toBe(true);
    expect(text.classList.contains("md:text-sm")).toBe(false);
    expect(select.classList.contains("h-12")).toBe(true);
    expect(select.classList.contains("h-10")).toBe(false);
    expect(area.classList.contains("text-base")).toBe(true);
    expect(area.classList.contains("text-sm")).toBe(false);
  });

  it("classNames.control overrides the box; classNames.input reaches an affixed number's <input>", () => {
    const { container } = render(
      <>
        <FieldInput attr={TYPES[0][0]} value="" onChange={() => {}} classNames={{ control: "h-14 rounded-none" }} />
        <FieldInput attr={TYPES[3][0]} value={3} onChange={() => {}} classNames={{ control: "w-40", input: "tabular-nums" }} />
      </>,
    );
    const text = container.querySelectorAll("input")[0];
    expect(text.classList.contains("h-14")).toBe(true);
    expect(text.classList.contains("h-10")).toBe(false);
    expect(text.classList.contains("rounded-md")).toBe(false);
    const box = container.querySelectorAll("div")[0];
    expect(box.classList.contains("w-40")).toBe(true);
    expect(container.querySelectorAll("input")[1].classList.contains("tabular-nums")).toBe(true);
  });
});

const ATTRS: FieldBase[] = [
  { name: "title", type: "string", title: "Title", help_text: "Up to 20" },
  { name: "line", type: "string", title: "Line", required: true } as FieldBase,
];

describe("FieldSet styling", () => {
  it("slots reach label, hint, error and root; props over provider", () => {
    render(
      <FieldStyleProvider
        labelSuffix=" *"
        classNames={{ label: "uppercase", hint: "italic", root: "p-1" }}
        optionalMark=" (optional)"
        errorIcon={<i data-testid="icon" />}
      >
        <FieldSet
          attrs={ATTRS}
          value={{}}
          onChange={() => {}}
          errors={{ title: "Bad" }}
          showErrors="always"
          classNames={{ label: "tracking-wide", error: "font-bold" }}
        />
      </FieldStyleProvider>,
    );
    const label = screen.getByText("Title", { exact: false }).closest("label")!;
    expect(label.textContent).toBe("Title * (optional)");
    expect(label.className).toContain("uppercase tracking-wide");
    expect(screen.getByText("Line *").closest("label")!.textContent).toBe("Line *");
    expect(screen.getByText("Up to 20").className).toContain("italic");
    const error = screen.getByRole("alert");
    expect(error.className).toContain("font-bold");
    expect(error.querySelector("[data-testid=icon]")).toBeTruthy();
    expect(label.parentElement!.className).toBe("p-1");
  });

  it("the FieldSet's size beats the provider's", () => {
    render(
      <FieldStyleProvider size="sm">
        <FieldSet attrs={ATTRS.slice(0, 1)} value={{}} onChange={() => {}} size="lg" />
      </FieldStyleProvider>,
    );
    expect(document.getElementById("input_title")!.classList.contains("h-12")).toBe(true);
  });

  it("with no style anywhere, a FieldSet field is FieldInput's markup inside the default shell", () => {
    const out = html(<FieldSet attrs={ATTRS.slice(0, 1)} value={{ title: "x" }} onChange={() => {}} />);
    expect(out).toBe(
      '<div class="space-y-4"><div><label for="input_title" class="mb-2 block text-sm font-medium leading-none">Title</label>' +
        '<p id="input_title-hint" class="mb-2 text-xs text-muted-foreground">Up to 20</p>' +
        input(ATTRS[0] as ModelAttribute, "x", { name: "title", describedBy: "input_title-hint" }) +
        "</div></div>",
    );
  });
});

describe("the classes the light path writes", () => {
  // The shop's Tailwind scans only its own src/ and utils' dist, not forms'.
  // Every class the light entry writes itself is listed here, so a new
  // default class is a visible diff, never a silently unstyled control.
  it("is this list", () => {
    const attrs: FieldBase[] = TYPES.map(([a]) => ({ ...a, title: a.name, help_text: "h" }));
    const classes = new Set<string>();
    for (const size of ["sm", "md", "lg"] as FieldSize[]) {
      const { container } = render(
        <FieldSet attrs={attrs} value={{}} onChange={() => {}} size={size} errors={{ s: "e" }} showErrors="always" />,
      );
      container.querySelectorAll("[class]").forEach((el) => el.classList.forEach((c) => classes.add(c)));
      cleanup();
    }
    expect([...classes].sort()).toMatchSnapshot();
  });
});
