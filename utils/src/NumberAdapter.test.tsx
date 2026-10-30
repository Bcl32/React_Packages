// @ts-expect-error utils has no @types/react-dom (see Input.markup.test.tsx)
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NO_ADAPTER, NumberAdapterProvider, useNumberAdapter, type AdapterResolver } from "./NumberAdapter";

const INCHES = { suffix: "in", toDisplay: (cm: number) => cm / 2.54 };
const inchesForCm: AdapterResolver = (attr) => (attr.unit === "cm" ? INCHES : null);

let seen: AdapterResolver | undefined;
function Reader() {
  seen = useNumberAdapter();
  return null;
}

describe("useNumberAdapter", () => {
  it("is NO_ADAPTER without a provider, and that resolves nothing", () => {
    renderToStaticMarkup(<Reader />);
    expect(seen).toBe(NO_ADAPTER);
    expect(seen?.({ name: "width_cm", unit: "cm" })).toBeNull();
  });

  it("is the provider's resolver under one", () => {
    renderToStaticMarkup(
      <NumberAdapterProvider adapterFor={inchesForCm}>
        <Reader />
      </NumberAdapterProvider>,
    );
    expect(seen).toBe(inchesForCm);
    expect(seen?.({ name: "width_cm", unit: "cm" })).toBe(INCHES);
    expect(seen?.({ name: "weight_g", unit: "g" })).toBeNull();
  });
});
