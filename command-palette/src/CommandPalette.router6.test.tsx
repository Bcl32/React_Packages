// Plain Node, no DOM: the palette (closed, as every page first renders it)
// renders on a server under React Router 6 (peer range ^6.22.0 || ^7.0.0;
// the code is unchanged).
import { renderToString } from "react-dom/server";
import * as Router from "react-router-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CommandPalette } from "./CommandPalette";
import { flattenNavItems } from "./flattenNavItems";


describe("CommandPalette under React Router 6", () => {
  it("is that router line", () => {
    // createRoutesStub is new in React Router 7.
    expect(typeof (Router as Record<string, unknown>).createRoutesStub).toBe("undefined");
  });

  it("renders closed on the server without touching window", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(
      <MemoryRouter>
        <CommandPalette commands={[{ id: "nav:/", label: "Home", group: "Pages", to: "/" }]} />
      </MemoryRouter>,
    );
    expect(html).not.toContain("Home");
  });

  it("flattenNavItems builds router targets", () => {
    expect(flattenNavItems([{ title: "Parts", url: "/Parts" }])).toEqual([
      { id: "nav:/Parts", label: "Parts", group: "Navigation", icon: undefined, to: "/Parts" },
    ]);
  });
});
