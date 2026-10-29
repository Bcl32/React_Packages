// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

// The reference field reads its options over the network; no rows is enough here.
vi.mock("@bcl32/hooks/useGetRequest", () => ({ useGetRequest: () => ({ data: undefined }) }));

import { FormElement } from "./FormElement";

afterEach(cleanup);

// Every label FormElement draws names a control: its htmlFor is the id the
// control actually carries ("input_" + name), never a bare name no element has.
const FIELDS: ModelAttribute[] = [
  { name: "title", type: "string", title: "Title" },
  { name: "due", type: "date", title: "Due" },
  { name: "notes", type: "textarea", title: "Notes" },
  { name: "weight", type: "number", title: "Weight" },
  { name: "done", type: "boolean", title: "Done" },
  { name: "status", type: "select", title: "Status", options: [{ value: "a", label: "A" }] },
  { name: "seen_at", type: "datetime", title: "Seen at" },
  { name: "tags", type: "list", title: "Tags", options: ["x"] },
  { name: "brand", type: "single_combobox", title: "Brand", options: ["Acme"] },
  { name: "systems", type: "id_list", title: "Systems", options: [] },
  {
    name: "room_id",
    type: "id",
    title: "Room",
    reference: { get_api_url: "rooms/", display_field: "name" },
  },
];

describe("FormElement labels", () => {
  it.each(FIELDS.map((f) => [f.type, f] as const))("%s: the label names its control", (_type, attr) => {
    render(
      <FormElement entry_data={attr} formData={{}} setFormData={vi.fn()} change_datetime={vi.fn()} />,
    );
    const control = screen.getByLabelText(new RegExp(`^${attr.title}:?$`));
    expect(control.id).toBe("input_" + attr.name);
  });
});
