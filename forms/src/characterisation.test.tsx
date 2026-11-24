// @vitest-environment jsdom
/**
 * Characterisation tests: today's markup and outputs, pinned BEFORE the
 * renderer registry, the light `./fields` entry, the styling slots and the
 * SSR fixes land. Every one of those is additive, so with no registry, no
 * provider and no new props these snapshots must not move. A diff here is a
 * behaviour change for every consumer (DataTable's ~130 hosted forms, 83
 * EditableDetailItem call sites), not a snapshot to refresh.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

vi.mock("@bcl32/hooks/useGetRequest", () => ({ useGetRequest: () => ({ data: undefined }) }));
vi.mock("@bcl32/hooks", () => ({
  useGetRequest: () => ({ data: undefined, isSuccess: false }),
  apiFetch: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { FormElement, canRenderFormElement } from "./FormElement";
import { FieldInput } from "./FieldInput";
import { fieldErrorText, fieldErrors } from "./numberFields";

afterEach(cleanup);

const noop = () => {};

/** One attribute per type FormElement knows, plus the two it renders as null. */
const TYPES: [ModelAttribute, Record<string, unknown>][] = [
  [{ name: "title", type: "string", title: "Title", help_text: "What it is called" }, { title: "Box" }],
  [{ name: "due", type: "date", title: "Due" }, { due: "2026-11-24" }],
  [{ name: "notes", type: "textarea", title: "Notes" }, { notes: "line one\nline two" }],
  [{ name: "weight", type: "number", title: "Weight", unit: "g", unit_label: "g", min: 0, max: 5000 }, { weight: 12.5 }],
  [{ name: "price", type: "number", title: "Price", format: "money" }, { price: "12.50" }],
  [{ name: "count", type: "number", title: "Count", integer: true }, {}],
  [{ name: "done", type: "boolean", title: "Done" }, { done: true }],
  [{ name: "status", type: "select", title: "Status", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }, { status: "b" }],
  [{ name: "seen_at", type: "datetime", title: "Seen at" }, { seen_at: "2026-11-24T10:00:00" }],
  [{ name: "tags", type: "list", title: "Tags", options: ["x", "y"] }, { tags: ["x"] }],
  [{ name: "brand", type: "single_combobox", title: "Brand", options: ["Acme"] }, { brand: "Acme" }],
  [{ name: "systems", type: "id_list", title: "Systems", options: [{ value: "1", label: "One" }] }, { systems: ["1"] }],
  [{ name: "body_colour", type: "colour", title: "Colour" }, { body_colour: "#ff0000" }],
  [{ name: "colours", type: "colour_array", title: "Colours" }, { colours: ["#ff0000"] }],
  [{ name: "resources", type: "relation_collection", title: "Resources" }, {}],
  [{ name: "room_id", type: "id", title: "Room", reference: { get_api_url: "rooms/", display_field: "name" } }, {}],
  [{ name: "upload", type: "file", title: "Upload", accept: ".stl" }, {}],
  [{ name: "plain_id", type: "id", title: "Plain id" }, {}],
  [{ name: "mystery", type: "mystery", title: "Mystery" }, {}],
];

describe("FormElement markup, no registry", () => {
  it.each(TYPES.map(([attr, data]) => [attr.type + ":" + attr.name, attr, data] as const))(
    "%s",
    (_label, attr, data) => {
      const { container } = render(
        <FormElement entry_data={attr} formData={data} setFormData={vi.fn()} change_datetime={vi.fn()} />,
      );
      expect(container.innerHTML).toMatchSnapshot();
    },
  );

  it("number with a field error: the message and the aria wiring", () => {
    const attr: ModelAttribute = { name: "weight", type: "number", title: "Weight", min: 1, max: 5 };
    const { container } = render(
      <FormElement
        entry_data={attr}
        formData={{ weight: 9 }}
        setFormData={vi.fn()}
        change_datetime={vi.fn()}
        fieldError="range"
        onFieldError={vi.fn()}
      />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("an unknown type and an id with no reference render nothing", () => {
    for (const attr of [
      { name: "x", type: "mystery" },
      { name: "y", type: "id" },
    ] as ModelAttribute[]) {
      const { container } = render(
        <FormElement entry_data={attr} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} />,
      );
      expect(container.innerHTML).toBe("");
      cleanup();
    }
  });

  it("setFormData receives a functional update that sets the field by name", () => {
    const setFormData = vi.fn();
    const attr: ModelAttribute = { name: "title", type: "string", title: "Title" };
    render(<FormElement entry_data={attr} formData={{ title: "" }} setFormData={setFormData} change_datetime={vi.fn()} />);
    fireEvent.change(document.getElementById("input_title")!, { target: { value: "Lid" } });
    const update = setFormData.mock.calls[0][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    expect(update({ other: 1 })).toEqual({ other: 1, title: "Lid" });
  });
});

describe("canRenderFormElement, no registry", () => {
  it("is true for exactly today's types", () => {
    const result = Object.fromEntries(TYPES.map(([attr]) => [attr.name, canRenderFormElement(attr)]));
    expect(result).toEqual({
      title: true, due: true, notes: true, weight: true, price: true, count: true, done: true,
      status: true, seen_at: true, tags: true, brand: true, systems: true, body_colour: true,
      colours: true, resources: true, room_id: true, upload: true, plain_id: false, mystery: false,
    });
  });
});

describe("FieldInput markup", () => {
  const cases: [string, ModelAttribute, unknown, Record<string, unknown>][] = [
    ["string", { name: "s", type: "string" }, "hi", {}],
    ["string compact url", { name: "s", type: "string" }, "https://x", { compact: true, inputType: "url", className: "w-40" }],
    ["string placeholder", { name: "s", type: "string" }, undefined, { placeholder: "Name" }],
    ["date", { name: "d", type: "date" }, "2026-01-02", {}],
    ["date compact", { name: "d", type: "date" }, "", { compact: true }],
    ["textarea", { name: "t", type: "textarea" }, "a", { placeholder: "p" }],
    ["number", { name: "n", type: "number", min: 0, max: 10 }, 3, {}],
    ["number compact invalid", { name: "n", type: "number", integer: true }, 3, { compact: true, invalid: true, describedBy: "e" }],
    ["number money", { name: "n", type: "number", format: "money" }, null, {}],
    ["boolean", { name: "b", type: "boolean" }, true, {}],
    ["boolean compact", { name: "b", type: "boolean" }, false, { compact: true, className: "ml-1" }],
    ["select", { name: "o", type: "select", options: [{ value: "a", label: "A" }] }, "a", {}],
    ["select compact", { name: "o", type: "select", options: [] }, undefined, { compact: true }],
    ["datetime (not owned)", { name: "x", type: "datetime" }, null, {}],
  ];
  it.each(cases)("%s", (_label, attr, value, extra) => {
    const { container } = render(
      <FieldInput attr={attr} value={value} onChange={noop} id={"input_" + attr.name} name={attr.name} {...extra} />,
    );
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("fieldErrors and fieldErrorText (today's outputs)", () => {
  const attrs: ModelAttribute[] = [
    { name: "a", type: "number", editable: true },
    { name: "b", type: "number", editable: true, nullable: true },
    { name: "c", type: "number", editable: false },
    { name: "d", type: "number" },
    { name: "e", type: "string", editable: true },
    { name: "f", type: "number", editable: true },
  ];

  it("flags parse errors first, then a null non-nullable number", () => {
    expect(fieldErrors(attrs, { a: null, b: null, c: null, d: null, e: null, f: 3 }, { f: "range" })).toEqual({
      a: "required",
      f: "range",
    });
  });

  it("skips undefined (untouched), non-editable fields and strings", () => {
    expect(fieldErrors(attrs, { e: "" }, {})).toEqual({});
    expect(fieldErrors(attrs, {}, { c: "invalid", d: "invalid", e: "invalid" })).toEqual({ e: "invalid" });
  });

  it("honours only", () => {
    expect(fieldErrors(attrs, { a: null, f: null }, {}, (n) => n === "f")).toEqual({ f: "required" });
  });

  it("words each error the same way", () => {
    const n = (extra: Partial<ModelAttribute>): ModelAttribute => ({ name: "n", type: "number", ...extra });
    expect([
      fieldErrorText("Width", "required"),
      fieldErrorText("Width", "fraction"),
      fieldErrorText("Width", "decimals", n({ decimals: 0 })),
      fieldErrorText("Width", "decimals", n({ decimals: 1 })),
      fieldErrorText("Width", "decimals", n({ decimals: 2 })),
      fieldErrorText("Width", "decimals", n({ format: "money" })),
      fieldErrorText("Width", "range", n({ min: 1, max: 5 })),
      fieldErrorText("Width", "range", n({ min: 1, max: 5, max_exclusive: true })),
      fieldErrorText("Width", "range", n({ min: 0, min_exclusive: true })),
      fieldErrorText("Width", "range", n({ max: 100 })),
      fieldErrorText("Width", "range", n({ min: 1, format: "money" }), { currency: "CAD" }),
      fieldErrorText("Width", "range", n({})),
      fieldErrorText("Width", "range"),
      fieldErrorText("Width", "invalid"),
    ]).toMatchInlineSnapshot(`
      [
        "Width is required",
        "Whole numbers only",
        "Whole numbers only",
        "1 decimal place at most",
        "2 decimal places at most",
        "2 decimal places at most",
        "Between 1 and 5",
        "At least 1 and less than 5",
        "More than 0",
        "At most 100",
        "At least $1.00",
        "Out of range",
        "Out of range",
        "Not a number",
      ]
    `);
  });
});

describe("ColourField (through FormElement), no presets", () => {
  it("opens the popover with its Custom input, and a pick writes the colour and the *_ids sibling", () => {
    const setFormData = vi.fn();
    const attr: ModelAttribute = { name: "body_colours", type: "colour", title: "Colour" };
    const { container } = render(
      <FormElement entry_data={attr} formData={{ body_colours: "#ff0000" }} setFormData={setFormData} change_datetime={vi.fn()} />,
    );
    fireEvent.click(document.getElementById("input_body_colours")!);
    const custom = container.querySelector('input[type="color"]') as HTMLInputElement;
    expect(custom).toBeTruthy();
    expect(container.innerHTML).toMatchSnapshot();
    fireEvent.change(custom, { target: { value: "#00ff00" } });
    const update = setFormData.mock.calls[0][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    expect(update({})).toEqual({ body_colours: "#00ff00", body_ids: [null] });
    // The pick closes it.
    expect(container.querySelector('input[type="color"]')).toBeNull();
  });
});
