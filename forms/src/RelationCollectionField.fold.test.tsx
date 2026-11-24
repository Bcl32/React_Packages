// @vitest-environment jsdom
/**
 * Fold state is this viewer's, kept per collection in localStorage and read
 * on the client during the first render, so a section folded last visit is
 * folded the moment the rows appear (no flash open). Pinned before the SSR
 * guard changes how that read is reached.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

const rows = [
  { id: "1", title: "Datasheet", url: "https://example.com/a", category: "link", section: "Docs" },
  { id: "2", title: "Shop", url: "https://example.com/b", category: "link", section: "Buy" },
];
vi.mock("@bcl32/hooks", () => ({
  useGetRequest: () => ({ data: rows, isSuccess: true }),
  apiFetch: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

import { RelationCollectionField } from "./RelationCollectionField";

const attr: ModelAttribute = {
  name: "resources",
  type: "relation_collection",
  title: "Resources",
  sub_fields: [
    { name: "title", type: "string" },
    { name: "url", type: "string" },
    { name: "category", type: "select", options: [{ value: "link", label: "Link" }, { value: "note", label: "Note" }] },
    { name: "section", type: "string" },
  ],
};
const KEY = "bcl32-forms.sections:/api/parts/1/resources";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("RelationCollectionField fold state", () => {
  it("a section folded in storage renders folded; the others open", () => {
    localStorage.setItem(KEY, JSON.stringify(["link\u0000Docs"]));
    render(<RelationCollectionField entry_data={attr} baseUrl="/api/parts/1/resources" />);
    expect(screen.getByRole("button", { name: "Expand Docs" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Collapse Buy" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.queryByText("Datasheet")).toBeNull();
    expect(screen.getByText("Shop")).toBeTruthy();
  });

  it("folding writes the set back under the collection's key", () => {
    render(<RelationCollectionField entry_data={attr} baseUrl="/api/parts/1/resources" />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Buy" }));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual(["link\u0000Buy"]);
  });

  it("unreadable storage is ignored", () => {
    localStorage.setItem(KEY, "{not json");
    render(<RelationCollectionField entry_data={attr} baseUrl="/api/parts/1/resources" />);
    expect(screen.getByRole("button", { name: "Collapse Docs" })).toBeTruthy();
  });
});
