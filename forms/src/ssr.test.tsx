// @vitest-environment node
// Plain Node, no DOM: the SSR hygiene fixes, checked where they matter.
// @ts-expect-error TS7016: untyped module (see utils Input.markup.test.tsx)
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

vi.mock("@bcl32/hooks", () => ({
  useGetRequest: () => ({
    data: [
      { id: "1", title: "Datasheet", url: "https://example.com/a", category: "link", section: "Docs" },
      { id: "2", title: "Care", note: "Wipe with a damp cloth.", category: "note", section: "Docs" },
    ],
    isSuccess: true,
  }),
  apiFetch: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { RelationCollectionField } from "./RelationCollectionField";
import { FieldSet } from "@bcl32/forms/fields";
import { dayjs } from "./datetimeSetup";

let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  errors.mockRestore();
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

/** Every React warning printed during the render, as text. */
const warnings = () => errors.mock.calls.map((c: unknown[]) => String(c[0]));

describe("AutoGrowTextarea on a server", () => {
  it("renders with no useLayoutEffect warning", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(<AutoGrowTextarea value="hello" onChange={() => {}} />);
    expect(html).toContain("hello");
    expect(warnings()).toEqual([]);
  });

  it("FieldSet's textarea too", () => {
    renderToString(<FieldSet attrs={[{ name: "n", type: "textarea", title: "Notes" }]} value={{ n: "x" }} onChange={() => {}} />);
    expect(warnings()).toEqual([]);
  });
});

describe("RelationCollectionField on a server", () => {
  const attr: ModelAttribute = {
    name: "resources",
    type: "relation_collection",
    title: "Resources",
    sub_fields: [
      { name: "title", type: "string" },
      { name: "url", type: "string" },
      { name: "note", type: "textarea" },
      { name: "category", type: "select", options: [{ value: "link", label: "Link" }, { value: "note", label: "Note" }] },
      { name: "section", type: "string" },
    ],
  };

  it("never touches storage, even where a localStorage global exists (Node 22+)", () => {
    const getItem = vi.fn(() => JSON.stringify(["link\u0000Docs"]));
    (globalThis as { localStorage?: unknown }).localStorage = { getItem, setItem: vi.fn() };
    const html = renderToString(<RelationCollectionField entry_data={attr} baseUrl="/api/parts/1/resources" />);
    expect(getItem).not.toHaveBeenCalled();
    expect(html).toContain("Resources");
  });

  it("renders with no useLayoutEffect warning", () => {
    renderToString(<RelationCollectionField entry_data={attr} baseUrl="/api/parts/1/resources" />);
    expect(warnings().filter((w) => w.includes("useLayoutEffect"))).toEqual([]);
  });
});

describe("datetimeSetup", () => {
  it("extends dayjs with utc and timezone, once, for the datetime renderer", () => {
    expect(typeof (dayjs as unknown as { utc?: unknown }).utc).toBe("function");
    expect(typeof (dayjs as unknown as { tz?: unknown }).tz).toBe("function");
  });
});
