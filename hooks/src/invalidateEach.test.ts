import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { invalidateEach } from "./_invalidateEach";

function seeded(...keys: string[]) {
  const client = new QueryClient();
  for (const key of keys) client.setQueryData([key], { items: [] });
  const stale = (key: string) => client.getQueryState([key])?.isInvalidated ?? false;
  return { client, stale };
}

describe("invalidateEach", () => {
  it("refreshes every listed url, not a prefix made of all of them", () => {
    const { client, stale } = seeded("expenses/", "bills/", "projects/");
    invalidateEach(client, ["expenses/", "bills/"]);
    expect(stale("expenses/")).toBe(true);
    expect(stale("bills/")).toBe(true);
    expect(stale("projects/")).toBe(false);
  });

  it("a single url behaves exactly as before", () => {
    const { client, stale } = seeded("expenses/", "projects/");
    invalidateEach(client, ["expenses/"]);
    expect(stale("expenses/")).toBe(true);
    expect(stale("projects/")).toBe(false);
  });

  it("an empty list still refreshes everything", () => {
    const { client, stale } = seeded("expenses/", "projects/");
    invalidateEach(client, []);
    expect(stale("expenses/")).toBe(true);
    expect(stale("projects/")).toBe(true);
  });
});
