// @vitest-environment node
// Plain Node, no DOM: a prerendered page renders FieldSet with no providers.
// @ts-expect-error TS7016: untyped module (see utils Input.markup.test.tsx)
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FieldRegistryProvider, FieldSet, type FieldBase, type FieldRegistry } from "@bcl32/forms/fields";

const ATTRS = [
  { name: "title", type: "string", title: "Title", help_text: "Up to 20 letters" },
  { name: "notes", type: "textarea", title: "Notes" },
  { name: "qty", type: "number", title: "Quantity", min: 1, max: 9 },
  { name: "price", type: "number", title: "Price", format: "money" },
  { name: "gift", type: "boolean", title: "Gift wrap" },
  { name: "size", type: "select", title: "Size", options: [{ value: "s", label: "Small" }] },
  { name: "on", type: "date", title: "Deliver on" },
] as FieldBase[];

describe("FieldSet on a server", () => {
  it("renders every light type with no providers and no window", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const html = renderToString(
      <FieldSet
        attrs={ATTRS}
        value={{ title: "Ana", notes: "hi", qty: 2, price: 12.5, gift: true, size: "s", on: "2026-12-01" }}
        onChange={() => {}}
        errors={{ title: { code: "too_long", max: 20 } }}
      />,
    );
    for (const attr of ATTRS) expect(html).toContain(`id="input_${attr.name}"`);
    expect(html).toContain('value="Ana"');
    expect(html).toContain("Up to 20 letters");
    // "touched" is the default: no error (whose text uses Intl) in the server's render.
    expect(html).not.toContain('role="alert"');
  });

  it("renders a registered type from a provider", () => {
    const registry: FieldRegistry = { stars: { Control: ({ id, value }) => <output id={id}>{String(value)} stars</output> } };
    const html = renderToString(
      <FieldRegistryProvider registry={registry}>
        <FieldSet attrs={[{ name: "rating", type: "stars", title: "Rating" }]} value={{ rating: 3 }} onChange={() => {}} />
      </FieldRegistryProvider>,
    );
    expect(html).toContain("3<!-- --> stars");
  });

  it("is deterministic: two renders are identical (hydration-safe ids)", () => {
    const render = () => renderToString(<FieldSet attrs={ATTRS} value={{}} onChange={() => {}} />);
    expect(render()).toBe(render());
  });
});
