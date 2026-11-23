import { describe, expect, it } from "vitest";

import {
  CLEAR_TINT,
  FINISHES,
  MIN_MESH_OPACITY,
  OVERRIDES,
  finishDescriptor,
  finishForSubType,
  hasFinishData,
  hexAlpha,
  meshColourHex,
  meshOpacity,
  overrideFor,
  parseHex,
  swatchLook,
  swatchProps,
} from "./finishes";

describe("finishForSubType (Print-Tracker's FINISH_BY_SUB_TYPE)", () => {
  it("maps every Bambu finish name to its family", () => {
    expect(finishForSubType("Basic")).toBe("basic");
    expect(finishForSubType("Tough+")).toBe("basic");
    expect(finishForSubType("HF")).toBe("basic");
    expect(finishForSubType("Matte")).toBe("matte");
    expect(finishForSubType("Silk+")).toBe("silk");
    expect(finishForSubType("Silk Multi-Color")).toBe("silk-multi");
    expect(finishForSubType("Sparkle")).toBe("sparkle");
    expect(finishForSubType("Metal")).toBe("metal");
    expect(finishForSubType("Galaxy")).toBe("galaxy");
    expect(finishForSubType("Glow")).toBe("glow");
    expect(finishForSubType("Translucent")).toBe("translucent");
    expect(finishForSubType("Marble")).toBe("marble");
    expect(finishForSubType("Wood")).toBe("wood");
  });

  it("draws anything else as basic, including prototype names", () => {
    for (const name of ["85A", "90A", "Standard", "Silk", "Something new", "", null, undefined, "constructor", "toString"]) {
      expect(finishForSubType(name), String(name)).toBe("basic");
    }
  });

  it("only ever returns a known family", () => {
    for (const name of ["Basic", "Silk+", "Silk Multi-Color", "Galaxy", "x"]) expect(FINISHES).toContain(finishForSubType(name));
  });
});

describe("OVERRIDES and swatchProps (keyed on the normalised input)", () => {
  it("carries the real Silk Multi-Color pairs", () => {
    expect(OVERRIDES["PLA|Silk Multi-Color|Gilded Rose"].colours).toEqual(["#FCA2BF", "#FF9425"]);
    expect(OVERRIDES["PLA|Silk Multi-Color|Neon City"].colours).toEqual(["#0047BB", "#BB22A3"]);
    expect(OVERRIDES["PLA|Silk Multi-Color|Dawn Radiance"].colours).toHaveLength(4);
  });

  it("resolves an override into swatch props", () => {
    const rose = { material: "PLA", finish: "Silk Multi-Color", colourName: "Gilded Rose", hex: "#FCA2BFFF" };
    expect(overrideFor(rose)).toBe(OVERRIDES["PLA|Silk Multi-Color|Gilded Rose"]);
    expect(swatchProps(rose)).toEqual({ subType: "Silk Multi-Color", hex: "#FCA2BFFF", colours: ["#FCA2BF", "#FF9425"] });
  });

  it("an override hex replaces the record's", () => {
    expect(swatchProps({ material: "PETG", finish: "Translucent", colourName: "Orange", hex: "#FF911A80" }).hex).toBe("#EF8E5B80");
    expect(swatchProps({ material: "PLA", finish: "Matte", colourName: "Plum", hex: null }).hex).toBe("#950051FF");
  });

  it("no override: the record's own hex, no colours; nothing at all is safe", () => {
    expect(swatchProps({ material: "PLA", finish: "Basic", colourName: "Black", hex: "#1A1A1A" })).toEqual({
      subType: "Basic",
      hex: "#1A1A1A",
      colours: null,
    });
    expect(swatchProps(null)).toEqual({ subType: undefined, hex: null, colours: null });
    expect(swatchProps({ material: "PLA", finish: "Silk Multi-Color", colourName: "Unknown Mix", hex: "#C04080" }).colours).toBeNull();
  });

  it("finishDescriptor: family plus gradient stops", () => {
    expect(finishDescriptor({ material: "PLA", finish: "Silk Multi-Color", colourName: "South Beach" })).toEqual({
      finish: "silk-multi",
      colours: ["#F772A4", "#00918B"],
    });
    expect(finishDescriptor({ finish: "Sparkle" })).toEqual({ finish: "sparkle", colours: null });
    expect(finishDescriptor(null)).toEqual({ finish: "basic", colours: null });
    expect(hasFinishData([null, finishDescriptor({ finish: "Matte" })])).toBe(true);
    expect(hasFinishData([null, undefined])).toBe(false);
    expect(hasFinishData(null)).toBe(false);
  });
});

describe("hex, alpha and Clear (Print-Tracker's colourManager)", () => {
  it("parseHex: 6 or 8 digits, # optional, else null", () => {
    expect(parseHex("#336699")).toEqual({ rgb: [0x33, 0x66, 0x99], alpha: 1 });
    expect(parseHex("3366CC80")).toEqual({ rgb: [0x33, 0x66, 0xcc], alpha: 128 / 255 });
    expect(parseHex(" #00000000 ")).toEqual({ rgb: [0, 0, 0], alpha: 0 });
    for (const bad of ["", "#123", "#GGGGGG", null, undefined, "#1234567"]) expect(parseHex(bad), String(bad)).toBeNull();
  });

  it("hexAlpha reads only the 9-character form", () => {
    expect(hexAlpha("#3366CC80")).toBe(128 / 255);
    expect(hexAlpha("#3366CC")).toBe(1);
    expect(hexAlpha(null)).toBe(1);
  });

  it("meshColourHex: Clear (#00000000) becomes the glass tint; a coloured zero alpha keeps its colour", () => {
    expect(meshColourHex("#00000000")).toBe(CLEAR_TINT);
    expect(meshColourHex("#FF000000")).toBe("#FF0000");
    expect(meshColourHex("#3366CCFF")).toBe("#3366CC");
    expect(meshColourHex(undefined)).toBeUndefined();
  });

  it("meshOpacity: the lowest alpha, floored; opaque palettes give undefined", () => {
    expect(meshOpacity(["#00000000"])).toBe(MIN_MESH_OPACITY);
    expect(meshOpacity(["#3366CC80", "#FFFFFF"])).toBe(128 / 255);
    expect(meshOpacity(["#3366CC", "#FFFFFFFF"])).toBeUndefined();
    expect(meshOpacity([])).toBeUndefined();
  });
});

describe("swatchLook (what FilamentSwatch renders)", () => {
  it("multi-colour: the gradient and both colour variables", () => {
    const look = swatchLook({ subType: "Silk Multi-Color", hex: "#FCA2BFFF", colours: ["#FCA2BF", "#FF9425"] });
    expect(look.dataFinish).toBe("silk-multi");
    expect(look.vars).toEqual({
      "--c1": "#FCA2BF",
      "--c2": "#FF9425",
      "--alpha": 1,
      "--grad": "linear-gradient(135deg, #FCA2BF, #FF9425)",
    });
  });

  it("see-through colours draw as translucent at a clamped alpha", () => {
    expect(swatchLook({ subType: "Basic", hex: "#00000000" })).toMatchObject({ dataFinish: "translucent", finish: "basic", vars: { "--alpha": 0.35 } });
    expect(swatchLook({ subType: "Translucent", hex: "#B8CDE980" }).vars["--alpha"]).toBeCloseTo(128 / 255);
    expect(swatchLook({ subType: "Translucent", hex: "#F5B6CDFF" }).vars["--alpha"]).toBe(0.85);
    expect(swatchLook({ subType: "Matte", hex: "#2244AA" })).toMatchObject({ dataFinish: "matte", isTranslucent: false, vars: { "--c1": "#2244AA", "--alpha": 1 } });
  });

  it("no hex: the neutral grey", () => {
    expect(swatchLook({}).vars["--c1"]).toBe("#9CA3AF");
  });
});
