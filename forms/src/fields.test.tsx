// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

const { sent } = vi.hoisted(() => ({ sent: { mutate: vi.fn() } }));
vi.mock("@bcl32/hooks/useGetRequest", () => ({ useGetRequest: () => ({ data: undefined }) }));
vi.mock("@bcl32/hooks/useDatabaseMutation", () => ({
  useDatabaseMutation: () => ({ mutate: sent.mutate, isPending: false, isError: false, isSuccess: false }),
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import {
  FieldInput,
  FieldRegistryProvider,
  FieldSet,
  FieldShell,
  lightRenderers,
  mergeRegistries,
  useFieldRegistry,
  useFieldResolver,
  useFieldSetState,
  type FieldBase,
  type FieldRegistry,
  type FieldRenderProps,
  type FieldResolver,
} from "@bcl32/forms/fields";
import { validate, type RuleSource } from "@bcl32/forms/validate";
import { FormElement, canRenderFormElement } from "./FormElement";
import { FieldStyleProvider } from "./fields/style";
import { mayBeEmpty } from "./validate/rules";
import { EditModelForm } from "./EditModelForm";
import { BulkEditModelForm } from "./BulkEditModelForm";

afterEach(cleanup);

/** A control for a type no built-in renders: a row of buttons. */
function Stars({ id, value, onChange, invalid, describedBy }: FieldRenderProps<FieldBase, number | null>) {
  return (
    <div id={id} role="radiogroup" aria-invalid={invalid || undefined} aria-describedby={describedBy}>
      {[1, 2, 3].map((n) => (
        <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}
const stars: FieldRegistry = { stars: { Control: Stars, labelAs: "legend" } };
const rating: ModelAttribute = { name: "rating", type: "stars", title: "Rating", editable: true, help_text: "How good" };

describe("FormElement with a registry", () => {
  it("draws a registered type from the prop, inside the shell, with the admin colon", () => {
    const setFormData = vi.fn();
    render(
      <FormElement entry_data={rating} formData={{ rating: 2 }} setFormData={setFormData} change_datetime={vi.fn()} renderers={stars} />,
    );
    const group = screen.getByRole("radiogroup");
    expect(group.id).toBe("input_rating");
    expect(screen.getByText("Rating:").tagName).toBe("LEGEND");
    expect(screen.getByText("How good").id).toBe("input_rating-hint");
    expect(group.getAttribute("aria-describedby")).toBe("input_rating-hint");
    fireEvent.click(screen.getByText("3"));
    const update = setFormData.mock.calls[0][0] as (p: Record<string, unknown>) => Record<string, unknown>;
    expect(update({ other: 1 })).toEqual({ other: 1, rating: 3 });
  });

  it("reads the context when no prop is given; the prop wins over the context", () => {
    const fromProp: FieldRegistry = { stars: { Control: () => <p>from prop</p> } };
    const { rerender } = render(
      <FieldRegistryProvider registry={stars}>
        <FormElement entry_data={rating} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} />
      </FieldRegistryProvider>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    rerender(
      <FieldRegistryProvider registry={stars}>
        <FormElement entry_data={rating} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} renderers={fromProp} />
      </FieldRegistryProvider>,
    );
    expect(screen.getByText("from prop")).toBeTruthy();
  });

  it("a registered built-in type overrides the built-in renderer", () => {
    const attr: ModelAttribute = { name: "title", type: "string", title: "Title" };
    render(
      <FormElement
        entry_data={attr}
        formData={{}}
        setFormData={vi.fn()}
        change_datetime={vi.fn()}
        renderers={{ string: { Control: ({ id }) => <textarea id={id} /> } }}
      />,
    );
    expect(document.getElementById("input_title")!.tagName).toBe("TEXTAREA");
  });

  it("a field error is worded and wired to the control", () => {
    render(
      <FormElement entry_data={rating} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} renderers={stars} fieldError="required" />,
    );
    expect(screen.getByRole("alert").textContent).toBe("Rating is required");
    expect(screen.getByRole("radiogroup").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("radiogroup").getAttribute("aria-describedby")).toBe("input_rating-hint input_rating-error");
  });
});

describe("canRenderFormElement with a registry", () => {
  it("is true for a registered type, and unchanged without one", () => {
    expect(canRenderFormElement(rating)).toBe(false);
    expect(canRenderFormElement(rating, stars)).toBe(true);
    expect(canRenderFormElement(rating, null)).toBe(false);
  });

  it("ignores a non-registry second argument, so .filter(canRenderFormElement) still works", () => {
    const attrs: ModelAttribute[] = [rating, { name: "t", type: "string" }];
    // @ts-expect-error filter passes (value, index): the index is not a registry
    expect(attrs.filter(canRenderFormElement).map((a) => a.name)).toEqual(["t"]);
  });

  it("does not treat Object.prototype keys as registered types", () => {
    expect(canRenderFormElement({ name: "x", type: "constructor" }, stars)).toBe(false);
  });
});

describe("DataTable-hosted forms see the context registry", () => {
  const ModelData = {
    model_name: "Review",
    model_attributes: [rating, { name: "title", type: "string", title: "Title", editable: true }] as ModelAttribute[],
    update_api_url: "reviews/",
    bulk_update_api_url: "reviews/bulk",
  };

  it("EditModelForm draws a registered type it would otherwise filter out", () => {
    const { rerender } = render(<EditModelForm ModelData={ModelData as never} query_invalidation={[]} obj_data={{ id: "1", rating: 1 }} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    rerender(
      <FieldRegistryProvider registry={stars}>
        <EditModelForm ModelData={ModelData as never} query_invalidation={[]} obj_data={{ id: "1", rating: 1 }} />
      </FieldRegistryProvider>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
  });

  it("BulkEditModelForm gives a registered type its card", () => {
    render(
      <FieldRegistryProvider registry={stars}>
        <BulkEditModelForm ModelData={ModelData as never} query_invalidation={[]} rowSelection={{ "1": true }} setRowSelection={vi.fn()} />
      </FieldRegistryProvider>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
  });
});

describe("FieldRegistryProvider", () => {
  it("nested providers merge, the inner one winning per type", () => {
    let seen: FieldRegistry | null = null;
    function Probe() {
      seen = useFieldRegistry();
      return null;
    }
    const a = { Control: () => null };
    const b = { Control: () => null };
    const c = { Control: () => null };
    render(
      <FieldRegistryProvider registry={{ one: a, two: b }}>
        <FieldRegistryProvider registry={{ two: c }}>
          <Probe />
        </FieldRegistryProvider>
      </FieldRegistryProvider>,
    );
    expect(seen).toEqual({ one: a, two: c });
  });

  it("mergeRegistries: later wins, nullish skipped", () => {
    const a = { Control: () => null };
    const b = { Control: () => null };
    expect(mergeRegistries({ x: a }, null, { x: b, y: a }, undefined)).toEqual({ x: b, y: a });
  });
});

const ATTRS: FieldBase[] = [
  { name: "title", type: "string", title: "Title", help_text: "Up to 20 letters" },
  { name: "notes", type: "textarea", title: "Notes" },
  { name: "qty", type: "number", title: "Quantity" },
  { name: "gift", type: "boolean", title: "Gift wrap" },
  { name: "size", type: "select", title: "Size", options: [{ value: "s", label: "Small" }] } as FieldBase,
  { name: "on", type: "date", title: "Deliver on" },
];

describe("FieldSet", () => {
  it("is controlled: a NEW object each change, the input never mutated", () => {
    const value = Object.freeze({ title: "a", qty: 1 });
    const onChange = vi.fn();
    render(<FieldSet attrs={ATTRS} value={value} onChange={onChange} />);
    fireEvent.change(document.getElementById("input_title")!, { target: { value: "ab" } });
    const [next, changed] = onChange.mock.calls[0];
    expect(next).toEqual({ title: "ab", qty: 1 });
    expect(next).not.toBe(value);
    expect(changed).toEqual(["title"]);
  });

  it("draws every light type with its label naming the control", () => {
    render(<FieldSet attrs={ATTRS} value={{}} onChange={vi.fn()} />);
    for (const attr of ATTRS) {
      expect(screen.getByLabelText(attr.title!).id).toBe("input_" + attr.name);
    }
  });

  it("the light controls are FieldInput's, unchanged", () => {
    const attr: ModelAttribute = { name: "qty", type: "number", min: 0 };
    const { container: a } = render(<FieldSet attrs={[attr]} value={{ qty: 3 }} onChange={vi.fn()} />);
    const fromSet = a.querySelector("input")!.outerHTML;
    cleanup();
    const { container: b } = render(<FieldInput attr={attr} id="input_qty" name="qty" value={3} onChange={vi.fn()} invalid={false} />);
    expect(fromSet).toBe(b.querySelector("input")!.outerHTML);
  });

  it("skips non-editable attrs and types with no renderer by default", () => {
    const attrs: FieldBase[] = [...ATTRS, { name: "hidden", type: "string", title: "Hidden", editable: false }, { name: "x", type: "mystery", title: "X" }];
    render(<FieldSet attrs={attrs} value={{}} onChange={vi.fn()} />);
    expect(screen.queryByLabelText("Hidden")).toBeNull();
    expect(screen.queryByLabelText("X")).toBeNull();
    expect(screen.getByLabelText("Notes")).toBeTruthy();
  });

  it("filter replaces the default; idPrefix sets the ids", () => {
    const attrs: FieldBase[] = [...ATTRS, { name: "hidden", type: "string", title: "Hidden", editable: false }];
    render(<FieldSet attrs={attrs} value={{}} onChange={vi.fn()} idPrefix="gift-" filter={(a) => a.name !== "notes"} />);
    expect(screen.queryByLabelText("Notes")).toBeNull();
    expect(screen.getByLabelText("Hidden").id).toBe("gift-hidden");
    expect(screen.getByLabelText("Title").id).toBe("gift-title");
  });

  it("shows errors once a field is touched, or after a submit", () => {
    const errors = { title: { code: "too_long", max: 3 } as const, qty: "Already worded" };
    const { rerender } = render(<FieldSet attrs={ATTRS} value={{}} onChange={vi.fn()} errors={errors} />);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.blur(document.getElementById("input_title")!);
    expect(screen.getByRole("alert").textContent).toBe("At most 3 characters");
    expect(document.getElementById("input_title")!.getAttribute("aria-invalid")).toBe("true");
    rerender(<FieldSet attrs={ATTRS} value={{}} onChange={vi.fn()} errors={errors} submitted />);
    expect(screen.getAllByRole("alert").map((e) => e.textContent)).toEqual(["At most 3 characters", "Already worded"]);
  });

  it("showErrors: 'always' and 'submitted'", () => {
    const errors = { title: { code: "required" } as const };
    const { rerender } = render(<FieldSet attrs={ATTRS} value={{}} onChange={vi.fn()} errors={errors} showErrors="always" />);
    expect(screen.getByRole("alert").textContent).toBe("Title is required");
    rerender(<FieldSet attrs={ATTRS} value={{}} onChange={vi.fn()} errors={errors} showErrors="submitted" touched={{ title: true }} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a renderer's onChangeMany sets several keys in one new object", () => {
    const pair: FieldRegistry = {
      colour: { Control: ({ onChangeMany }) => <button onClick={() => onChangeMany({ colour: "#fff", colour_id: "w" })}>White</button> },
    };
    const onChange = vi.fn();
    render(<FieldSet attrs={[{ name: "colour", type: "colour", title: "Colour" }]} value={{ a: 1 }} onChange={onChange} renderers={pair} />);
    fireEvent.click(screen.getByText("White"));
    expect(onChange).toHaveBeenCalledWith({ a: 1, colour: "#fff", colour_id: "w" }, ["colour", "colour_id"]);
  });

  it("the children render prop lays the fields out", () => {
    render(
      <FieldSet attrs={ATTRS.slice(0, 2)} value={{}} onChange={vi.fn()}>
        {(fields) => <div data-testid="grid">{fields.map((f) => <section key={f.attr.name}>{f.node}</section>)}</div>}
      </FieldSet>,
    );
    expect(screen.getByTestId("grid").querySelectorAll("section")).toHaveLength(2);
  });

  it("lightRenderers names exactly FieldInput's types", () => {
    expect(Object.keys(lightRenderers).sort()).toEqual(["boolean", "date", "number", "select", "string", "textarea"]);
  });
});

describe("useFieldSetState with validate", () => {
  const attrs = [
    { name: "line1", type: "string", title: "Line 1", required: true, max_length: 5 },
    { name: "qty", type: "number", title: "Quantity", min: 1 },
  ];

  function Page({ onSubmit }: { onSubmit: (v: Record<string, unknown>) => void }) {
    const form = useFieldSetState<Record<string, unknown>>({ line1: "", qty: 1 });
    const errors = validate(attrs, form.value, { parseErrors: form.parseErrors });
    return (
      <>
        <FieldSet attrs={attrs} errors={errors} {...form.bind} />
        <button
          onClick={() => {
            form.markSubmitted();
            if (Object.keys(errors).length === 0) onSubmit(form.value);
          }}
        >
          Add to cart
        </button>
      </>
    );
  }

  it("blocks a submit with issues, shows them, and sends once fixed", () => {
    const onSubmit = vi.fn();
    render(<Page onSubmit={onSubmit} />);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByText("Add to cart"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Line 1 is required");
    fireEvent.change(document.getElementById("input_line1")!, { target: { value: "toolong" } });
    expect(screen.getByRole("alert").textContent).toBe("At most 5 characters");
    fireEvent.change(document.getElementById("input_line1")!, { target: { value: "Ana" } });
    fireEvent.change(document.getElementById("input_qty")!, { target: { value: "1e" } });
    // Unreadable number text (or the emptied box jsdom makes of it) blocks the submit.
    fireEvent.click(screen.getByText("Add to cart"));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(document.getElementById("input_qty")!, { target: { value: "2" } });
    fireEvent.click(screen.getByText("Add to cart"));
    expect(onSubmit).toHaveBeenCalledWith({ line1: "Ana", qty: 2 });
  });
});

describe("FieldShell", () => {
  it("label, inline and none", () => {
    const { container } = render(
      <>
        <FieldShell id="a" label="A" hint="hint" hintId="a-hint" error="bad" errorId="a-error">
          <input id="a" />
        </FieldShell>
        <FieldShell id="b" label="B" labelAs="inline" labelSuffix=":">
          <input id="b" type="checkbox" />
        </FieldShell>
        <FieldShell id="c" label="C" labelAs="none">
          <input id="c" />
        </FieldShell>
      </>,
    );
    expect(screen.getByLabelText("A").id).toBe("a");
    expect(screen.getByLabelText("B:").id).toBe("b");
    expect(container.querySelectorAll("label")).toHaveLength(2);
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe("resolve: a renderer per attribute, not only per type", () => {
  function Cards({ id, attr, value, onChange }: FieldRenderProps) {
    const options = ((attr as { options?: { value: string; label: string }[] }).options ?? []);
    return (
      <div id={id} role="radiogroup">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={id} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  const cards: FieldRegistry = { cards: { Control: Cards, labelAs: "legend" } };
  const options = [{ value: "s", label: "Small" }, { value: "l", label: "Large" }];
  const lidSize = { name: "lid_size", type: "select", title: "Lid size", options } as FieldBase;
  const boxSize = { name: "box_size", type: "select", title: "Box size", options } as FieldBase;
  const lidCards: FieldResolver = (attr) => (attr.type === "select" && attr.name.startsWith("lid_") ? "cards" : undefined);

  it("FieldSet: the provider's resolve picks cards for one select; the other stays a native select", () => {
    render(
      <FieldRegistryProvider registry={cards} resolve={lidCards}>
        <FieldSet attrs={[lidSize, boxSize]} value={{}} onChange={vi.fn()} />
      </FieldRegistryProvider>,
    );
    expect(document.getElementById("input_lid_size")!.getAttribute("role")).toBe("radiogroup");
    expect(document.getElementById("input_box_size")!.tagName).toBe("SELECT");
  });

  it("FieldSet: its own resolve is asked first, then the provider's", () => {
    const boxToo: FieldResolver = (attr) => (attr.name === "box_size" ? "cards" : undefined);
    const never: FieldResolver = (attr) => (attr.name === "lid_size" ? "select" : undefined);
    render(
      <FieldRegistryProvider registry={cards} resolve={lidCards}>
        <FieldSet attrs={[lidSize, boxSize]} value={{}} onChange={vi.fn()} resolve={(a) => boxToo(a) ?? never(a)} />
      </FieldRegistryProvider>,
    );
    expect(document.getElementById("input_box_size")!.getAttribute("role")).toBe("radiogroup");
    // The prop's "select" is lightRenderers' select: the prop won over the provider.
    expect(document.getElementById("input_lid_size")!.tagName).toBe("SELECT");
  });

  it("a key no registry holds falls back to the type; null and undefined too", () => {
    render(<FieldSet attrs={[lidSize, boxSize]} value={{}} onChange={vi.fn()} resolve={(a) => (a.name === "lid_size" ? "nope" : null)} />);
    expect(document.getElementById("input_lid_size")!.tagName).toBe("SELECT");
    expect(document.getElementById("input_box_size")!.tagName).toBe("SELECT");
  });

  it("a resolved key beats a type registered in an earlier registry", () => {
    const own: FieldRegistry = { select: { Control: ({ id }) => <p id={id}>prop select</p> } };
    render(
      <FieldRegistryProvider registry={cards}>
        <FieldSet attrs={[lidSize, boxSize]} value={{}} onChange={vi.fn()} renderers={own} resolve={lidCards} />
      </FieldRegistryProvider>,
    );
    expect(document.getElementById("input_lid_size")!.getAttribute("role")).toBe("radiogroup");
    expect(document.getElementById("input_box_size")!.textContent).toBe("prop select");
  });

  it("nested providers: the inner resolve first, the outer one when it gives no key", () => {
    let seen: FieldResolver | undefined;
    function Probe() {
      seen = useFieldResolver();
      return null;
    }
    render(
      <FieldRegistryProvider registry={cards} resolve={lidCards}>
        <FieldRegistryProvider resolve={(a) => (a.name === "box_size" ? "inner" : undefined)}>
          <Probe />
        </FieldRegistryProvider>
      </FieldRegistryProvider>,
    );
    expect(seen!(boxSize)).toBe("inner");
    expect(seen!(lidSize)).toBe("cards");
    expect(seen!({ name: "x", type: "string" })).toBeUndefined();
  });

  it("a provider with only resolve keeps the outer registry", () => {
    let reg: FieldRegistry | null = null;
    function Probe() {
      reg = useFieldRegistry();
      return null;
    }
    render(
      <FieldRegistryProvider registry={cards}>
        <FieldRegistryProvider resolve={lidCards}>
          <Probe />
        </FieldRegistryProvider>
      </FieldRegistryProvider>,
    );
    expect(reg).toBe(cards);
  });

  it("FormElement: the resolve prop and the provider's; others keep the built-in switch", () => {
    const lid = lidSize as ModelAttribute;
    const box = boxSize as ModelAttribute;
    const { rerender } = render(
      <FormElement entry_data={lid} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} renderers={cards} resolve={lidCards} />,
    );
    expect(document.getElementById("input_lid_size")!.getAttribute("role")).toBe("radiogroup");
    expect(screen.getByText("Lid size:").tagName).toBe("LEGEND");
    rerender(
      <FieldRegistryProvider registry={cards} resolve={lidCards}>
        <FormElement entry_data={lid} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} />
        <FormElement entry_data={box} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} />
      </FieldRegistryProvider>,
    );
    expect(document.getElementById("input_lid_size")!.getAttribute("role")).toBe("radiogroup");
    expect(document.getElementById("input_box_size")!.tagName).toBe("SELECT");
  });

  it("canRenderFormElement counts a resolved key; filter's array argument is ignored", () => {
    const odd: ModelAttribute = { name: "odd", type: "mystery", title: "Odd" };
    const toCards = () => "cards";
    expect(canRenderFormElement(odd, cards)).toBe(false);
    expect(canRenderFormElement(odd, cards, toCards)).toBe(true);
    expect(canRenderFormElement(odd, null, toCards)).toBe(false);
    const attrs: ModelAttribute[] = [odd, { name: "t", type: "string" }];
    // @ts-expect-error filter passes (value, index, array)
    expect(attrs.filter(canRenderFormElement).map((a) => a.name)).toEqual(["t"]);
  });

  it("EditModelForm and BulkEditModelForm see the provider's resolve", () => {
    const ModelData = {
      model_name: "Box",
      model_attributes: [{ name: "odd", type: "mystery", title: "Odd", editable: true, options }] as ModelAttribute[],
      update_api_url: "boxes/",
      bulk_update_api_url: "boxes/bulk",
    };
    const toCards = () => "cards";
    render(
      <FieldRegistryProvider registry={cards} resolve={toCards}>
        <EditModelForm ModelData={ModelData as never} query_invalidation={[]} obj_data={{ id: "1" }} />
        <BulkEditModelForm ModelData={ModelData as never} query_invalidation={[]} rowSelection={{ "1": true }} setRowSelection={vi.fn()} />
      </FieldRegistryProvider>,
    );
    expect(screen.getAllByRole("radiogroup")).toHaveLength(2);
  });

  it("validate's resolve picks the same entry's isEmpty and validate", () => {
    const rules = {
      cards: { validate: (_a: FieldBase, v: unknown) => (v === "l" ? { code: "x-too-big" as const } : null) },
    };
    const attrs = [lidSize, boxSize];
    const values = { lid_size: "l", box_size: "l" };
    expect(validate(attrs, values, { registry: rules })).toEqual({});
    expect(validate(attrs, values, { registry: rules, resolve: lidCards })).toEqual({ lid_size: { code: "x-too-big" } });
    // The select's own options rule still runs by type.
    expect(validate(attrs, { lid_size: "zz" }, { registry: rules, resolve: lidCards })).toEqual({ lid_size: { code: "not_an_option" } });
  });
});

describe("FieldRenderProps.label", () => {
  it("is the resolved label, without the suffix or the optional mark", () => {
    const seen: string[] = [];
    const own: FieldRegistry = {
      legendary: {
        labelAs: "none",
        Control: ({ id, label }) => {
          seen.push(label);
          return (
            <fieldset id={id}>
              <legend>{label}</legend>
            </fieldset>
          );
        },
      },
    };
    render(
      <FieldStyleProvider labelSuffix=":" optionalMark=" (optional)">
        <FieldSet
          attrs={[
            { name: "lid_colour", type: "legendary", title: "Lid colour" },
            { name: "box_colour", type: "legendary" },
          ]}
          value={{}}
          onChange={vi.fn()}
          renderers={own}
        />
      </FieldStyleProvider>,
    );
    expect(seen).toEqual(["Lid colour", "Box colour"]);
    expect(screen.getByText("Lid colour").tagName).toBe("LEGEND");
  });

  it("FormElement passes the same label (the admin colon stays in the shell)", () => {
    let label = "";
    const probe: FieldRegistry = { stars: { Control: (p) => ((label = p.label), null) } };
    render(<FormElement entry_data={rating} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} renderers={probe} />);
    expect(label).toBe("Rating");
    expect(screen.getByText("Rating:")).toBeTruthy();
  });
});

describe("the optional mark: only on a field that may really be left empty", () => {
  const cases: [string, FieldBase & Record<string, unknown>, boolean][] = [
    ["required", { name: "a", type: "string", required: true }, false],
    ["a choice with a default", { name: "a", type: "select", default: "medium" }, false],
    ["a nullable choice with a default", { name: "a", type: "select", default: "medium", nullable: true }, true],
    ["nullable text, default null", { name: "a", type: "string", nullable: true, default: null }, true],
    ["text with no default", { name: "a", type: "string" }, true],
    ["text with an empty default", { name: "a", type: "string", default: "" }, true],
    ["text with min_length 1", { name: "a", type: "string", min_length: 1 }, false],
    ["a non-nullable number (validate refuses it empty)", { name: "a", type: "number" }, false],
    ["a nullable number", { name: "a", type: "number", nullable: true }, true],
    ["a boolean with a default", { name: "a", type: "boolean", default: false }, false],
  ];
  it.each(cases)("%s", (_, attr, optional) => {
    expect(mayBeEmpty(attr)).toBe(optional);
    // and validate agrees: what is not optional is refused, or never empty, when left empty
    if (!optional && !("default" in attr)) expect(validate([attr], { a: attr.type === "number" ? null : "" })).toHaveProperty("a");
  });

  it("FieldSet shows it by that rule; optionalMark still sets the words", () => {
    const attrs = [
      { name: "size", type: "select", title: "Size", options: [{ value: "m", label: "Medium" }], default: "m" },
      { name: "text", type: "string", title: "Text", nullable: true, default: null },
      { name: "name", type: "string", title: "Name", required: true },
    ] satisfies (RuleSource & { default?: unknown })[];
    render(
      <FieldStyleProvider optionalMark=" — if you like">
        <FieldSet attrs={attrs} value={{}} onChange={vi.fn()} />
      </FieldStyleProvider>,
    );
    expect(screen.getByText("Size").textContent).toBe("Size");
    expect(screen.getByText("Text", { exact: false }).closest("label")!.textContent).toBe("Text — if you like");
    expect(screen.getByText("Name").textContent).toBe("Name");
  });
});
