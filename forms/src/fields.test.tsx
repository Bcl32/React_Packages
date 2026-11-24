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
  useFieldSetState,
  type FieldBase,
  type FieldRegistry,
  type FieldRenderProps,
} from "@bcl32/forms/fields";
import { validate } from "@bcl32/forms/validate";
import { FormElement, canRenderFormElement } from "./FormElement";
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
