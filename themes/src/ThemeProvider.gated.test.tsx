// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { theme, resolved_theme } = useTheme();
  return <p id="probe">{`${theme}|${resolved_theme}`}</p>;
}

function stubMatchMedia(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe("ThemeProvider gated, in a browser", () => {
  let container: HTMLDivElement;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  it("the first render matches the server's; the stored theme arrives after mount", async () => {
    localStorage.setItem("vite-ui-theme", "dark");
    stubMatchMedia(false);
    const tree = (
      <ThemeProvider gated>
        <Probe />
      </ThemeProvider>
    );
    // What the server (and so the hydrating render) produces.
    expect(renderToString(tree)).toContain("system|light");
    // A pre-paint script's choice is not overwritten before the read.
    document.documentElement.setAttribute("data-theme", "dark");
    const root = createRoot(container);
    await act(async () => root.render(tree));
    expect(container.querySelector("#probe")?.textContent).toBe("dark|dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    act(() => root.unmount());
  });

  it("follows the OS preference for system once mounted", async () => {
    stubMatchMedia(true);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <ThemeProvider gated>
          <Probe />
        </ThemeProvider>,
      ),
    );
    expect(container.querySelector("#probe")?.textContent).toBe("system|dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    act(() => root.unmount());
  });

  it("not gated: reads synchronously on the first render, as before", async () => {
    localStorage.setItem("vite-ui-theme", "dark");
    stubMatchMedia(false);
    let first = "";
    function FirstRender() {
      const { resolved_theme } = useTheme();
      if (!first) first = resolved_theme;
      return null;
    }
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <ThemeProvider>
          <FirstRender />
        </ThemeProvider>,
      ),
    );
    expect(first).toBe("dark");
    act(() => root.unmount());
  });
});
