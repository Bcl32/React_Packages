import { readFileSync } from "fs";
import { join } from "path";

import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { swatchProps } from "./finishes";
import { FilamentSwatch } from "./swatch";

// Rendered in plain Node (no DOM): the swatch must be safe for a server render
// or a prerender, with no window, no document and no provider.
describe("FilamentSwatch on the server", () => {
  it("there is no DOM here", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("renders a finish-aware swatch with its colour variables", () => {
    const html = renderToStaticMarkup(<FilamentSwatch subType="Silk+" hex="#C0A060" size="2rem" />);
    expect(html).toContain('data-finish="silk"');
    expect(html).toContain("--c1:#C0A060");
    expect(html).toContain("width:2rem");
    expect(html).toMatch(/^<div class="filament-swatch /);
  });

  it("Silk Multi-Color carries its real colour pair from OVERRIDES", () => {
    const props = swatchProps({ material: "PLA", finish: "Silk Multi-Color", colourName: "Neon City", hex: "#0047BBFF" });
    const html = renderToStaticMarkup(<FilamentSwatch {...props} />);
    expect(html).toContain('data-finish="silk-multi"');
    expect(html).toContain("--grad:linear-gradient(135deg, #0047BB, #BB22A3)");
    expect(html).toContain("--c2:#BB22A3");
  });

  it("translucency, the glow badge, the spool shape, as= and extra style", () => {
    expect(renderToStaticMarkup(<FilamentSwatch subType="Basic" hex="#00000000" />)).toContain('data-finish="translucent"');
    expect(renderToStaticMarkup(<FilamentSwatch subType="Glow" hex="#88FF88" />)).toContain("filament-swatch-glow-badge");
    expect(renderToStaticMarkup(<FilamentSwatch subType="Glow" hex="#88FF88" badge={false} />)).not.toContain("glow-badge");
    const spool = renderToStaticMarkup(<FilamentSwatch subType="Glow" hex="#88FF88" shape="spool" />);
    expect(spool).toContain("filament-swatch-spool");
    expect(spool).toContain("border-radius:50%");
    expect(spool).not.toContain("glow-badge");
    const span = renderToStaticMarkup(<FilamentSwatch as="span" subType="Matte" hex="#112233" style={{ display: "block" }} />);
    expect(span).toMatch(/^<span class="filament-swatch /);
    expect(span).toContain("display:block");
  });

  it("the same props give the same markup every time (hydration-stable)", () => {
    const el = <FilamentSwatch subType="Galaxy" hex="#1A1A2E" animated />;
    expect(renderToString(el)).toBe(renderToString(el));
  });
});

describe("swatch.css", () => {
  const css = readFileSync(join(__dirname, "swatch.css"), "utf8");
  it("styles every finish family the component can emit", () => {
    for (const finish of ["basic", "matte", "silk", "silk-multi", "sparkle", "metal", "galaxy", "glow", "translucent", "marble", "wood"]) {
      expect(css, finish).toContain(`[data-finish="${finish}"]`);
    }
  });
  it("honours prefers-reduced-motion and touches nothing outside its own classes", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    const selectors = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
      .match(/(^|\})\s*([^{}@]+)\{/g) ?? [];
    for (const raw of selectors) {
      const sel = raw.replace(/^\}?\s*/, "").replace(/\{$/, "").trim();
      for (const part of sel.split(",")) expect(part.trim(), part).toMatch(/^\.filament-/);
    }
  });
});
