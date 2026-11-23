// Plain Node, no DOM: the breadcrumb renders on a server under React Router 6
// (the peer range accepts ^6.22.0 || ^7.0.0; the code is unchanged).
import { useEffect } from "react";
import { renderToString } from "react-dom/server";
import * as Router from "react-router-dom";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import NavigationBreadcrumb from "./NavigationBreadcrumb";
import { NavigationProvider, useNavigation } from "./NavigationProvider";


describe("NavigationBreadcrumb under React Router 6", () => {
  it("is that router line", () => {
    // createRoutesStub is new in React Router 7.
    expect(typeof (Router as Record<string, unknown>).createRoutesStub).toBe("undefined");
  });

  it("renders Home as a link on the server", () => {
    const html = renderToString(
      <MemoryRouter>
        <NavigationProvider>
          <NavigationBreadcrumb />
        </NavigationProvider>
      </MemoryRouter>,
    );
    expect(html).toContain('href="/"');
    expect(html).toContain("Home");
  });

  it("useNavigation works outside a provider with its empty default", () => {
    function Probe() {
      const { navigation } = useNavigation();
      useEffect(() => {}, []);
      return <p>{navigation.length}</p>;
    }
    expect(renderToString(<Probe />)).toContain("0");
  });
});
