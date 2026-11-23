// Plain Node, no DOM: what a server render or a prerender sees.
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { theme, resolved_theme, theme_type } = useTheme();
  return <p data-theme-probe={`${theme}|${resolved_theme}|${theme_type}`} />;
}

describe("ThemeProvider on the server", () => {
  it("there is no DOM here", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof localStorage).toBe("undefined");
  });

  it("gated: renders with the default theme and reads no browser storage", () => {
    const html = renderToString(
      <ThemeProvider gated>
        <Probe />
      </ThemeProvider>,
    );
    expect(html).toContain('data-theme-probe="system|light|light"');
  });

  it("gated with a named default", () => {
    const html = renderToString(
      <ThemeProvider gated defaultTheme="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(html).toContain('data-theme-probe="dark|dark|dark"');
  });

  it("not gated (the default) still reads localStorage during render, as before", () => {
    expect(() =>
      renderToString(
        <ThemeProvider>
          <Probe />
        </ThemeProvider>,
      ),
    ).toThrow(/localStorage/);
  });
});

describe("Theming's import chain", () => {
  it("imports @bcl32/utils by subpath only, never the barrel", async () => {
    const { readFileSync, readdirSync } = await import("fs");
    const { join } = await import("path");
    const dir = join(__dirname);
    for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !f.includes(".test."))) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(src, file).not.toMatch(/from\s+["']@bcl32\/utils["']/);
    }
  });
});
