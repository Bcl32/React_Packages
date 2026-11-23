/**
 * @bcl32/filament-look/finishes: what a filament looks like, as plain data.
 *
 * Pure: no three.js, no DOM, no React. Safe to import during a server render
 * or a prerender, and in a worker.
 *
 * Ported from Print-Tracker (print-tracker-react/src/utils/filamentFinishes.js
 * and colourManager.js), numbers and tables unchanged, so either app can draw
 * a filament and get the same answer. The package knows no app's field names:
 * every function takes the normalised shape `FilamentInput`, and each app maps
 * its own record onto it with a one-line adapter, e.g. Print-Tracker's
 *
 *   const look = (f) => ({ material: f.material, finish: f.sub_type,
 *                          colourName: f.colour_name, hex: f.colour_hex });
 *
 * `finish` is the maker's finish name (Bambu's sub-type: "Basic", "Matte",
 * "Silk+", "Silk Multi-Color", ...). `Finish` (lower case, below) is the
 * rendering family a finish name maps to.
 */

/** A filament as the look needs it. Every field may be missing. */
export interface FilamentInput {
  /** "PLA", "PETG", ... */
  material?: string | null;
  /** The maker's finish name (Bambu sub-type): "Basic", "Silk+", "Silk Multi-Color", ... */
  finish?: string | null;
  /** The maker's colour name: "Gilded Rose", "Jade White", ... */
  colourName?: string | null;
  /** "#RRGGBB" or "#RRGGBBAA". */
  hex?: string | null;
}

/** The rendering families (the swatch's data-finish values, the 3D finish keys). */
export type Finish =
  | "basic"
  | "matte"
  | "silk"
  | "silk-multi"
  | "sparkle"
  | "metal"
  | "galaxy"
  | "glow"
  | "translucent"
  | "marble"
  | "wood";

export const FINISHES: readonly Finish[] = Object.freeze([
  "basic",
  "matte",
  "silk",
  "silk-multi",
  "sparkle",
  "metal",
  "galaxy",
  "glow",
  "translucent",
  "marble",
  "wood",
]);

/** What OVERRIDES may supply for one filament. */
export interface FilamentOverride {
  /** A hex the maker's data lacks or gets wrong ("#RRGGBBAA"). */
  hex?: string;
  /** The real colour stops of a multi-colour filament (2 to 4 entries). */
  colours?: readonly string[];
}

// A filament record carries a single colour hex, so dual/multi colour pairs and
// a few hexes Bambu never reported live here instead. Keyed by
// `${material}|${finish}|${colourName}`. Sources: Bambu catalogue/store hex
// tables; the Neon City pair read from live AMS tray data (cols array); PETG
// Translucent Orange is the filamentcolors colorimeter measurement.
export const OVERRIDES: Readonly<Record<string, FilamentOverride>> = Object.freeze({
  "PLA|Matte|Plum": { hex: "#950051FF" },
  "PLA|Wood|White Oak": { hex: "#D6CCA3FF" },
  "PETG|HF|Dark Gray": { hex: "#515151FF" },
  "PETG|HF|Lime Green": { hex: "#6EE53CFF" },
  "PETG|Translucent|Orange": { hex: "#EF8E5B80" },
  "PLA|Silk Multi-Color|Gilded Rose": { colours: ["#FCA2BF", "#FF9425"] },
  "PLA|Silk Multi-Color|Midnight Blaze": { colours: ["#0047BB", "#7D1B49"] },
  "PLA|Silk Multi-Color|Neon City": { colours: ["#0047BB", "#BB22A3"] },
  "PLA|Silk Multi-Color|South Beach": { colours: ["#F772A4", "#00918B"] },
  "PLA|Silk Multi-Color|Velvet Eclipse": { colours: ["#1A1A1A", "#A34342"] },
  "PLA|Silk Multi-Color|Dawn Radiance": {
    colours: ["#EC984C", "#D87694", "#A66EB9", "#6CD4BC"],
  },
});

// Finish name -> rendering family. Anything not listed (Tough+, HF, 85A, 90A,
// Standard, a finish added next year) draws as basic.
const FINISH_BY_SUB_TYPE: Readonly<Record<string, Finish>> = Object.freeze({
  Basic: "basic",
  "Tough+": "basic",
  HF: "basic",
  Matte: "matte",
  "Silk+": "silk",
  "Silk Multi-Color": "silk-multi",
  Sparkle: "sparkle",
  Metal: "metal",
  Galaxy: "galaxy",
  Glow: "glow",
  Translucent: "translucent",
  Marble: "marble",
  Wood: "wood",
});

/** The rendering family for a finish name; unknown or missing -> "basic". */
export const finishForSubType = (subType?: string | null): Finish =>
  (subType != null && Object.prototype.hasOwnProperty.call(FINISH_BY_SUB_TYPE, subType)
    ? FINISH_BY_SUB_TYPE[subType]
    : undefined) || "basic";

/** The OVERRIDES key for a filament. */
export const overrideKey = (f?: FilamentInput | null): string =>
  `${f?.material}|${f?.finish}|${f?.colourName}`;

/** The OVERRIDES entry for a filament, if there is one. */
export function overrideFor(f?: FilamentInput | null): FilamentOverride | undefined {
  const key = overrideKey(f);
  return Object.prototype.hasOwnProperty.call(OVERRIDES, key) ? OVERRIDES[key] : undefined;
}

/** The props `FilamentSwatch` (`/swatch`) takes for a filament. */
export interface SwatchProps {
  subType: string | undefined;
  hex: string | null;
  colours: readonly string[] | null;
}

/**
 * Swatch props for a filament, with OVERRIDES resolved, so multi-colour pairs
 * and backfilled hexes render everywhere a filament is drawn (Print-Tracker's
 * swatchPropsForFilament, on the normalised input).
 */
export function swatchProps(f?: FilamentInput | null): SwatchProps {
  const override = overrideFor(f);
  return {
    subType: f?.finish || undefined,
    hex: override?.hex || f?.hex || null,
    colours: override?.colours || null,
  };
}

/** What a 3D material needs to know about a slot's filament. */
export interface FinishDescriptor {
  finish: Finish;
  /** The Silk Multi-Color gradient stops, null when there are none. */
  colours: readonly string[] | null;
}

/**
 * The finish descriptor `buildFinishMaterial` (`/materials`) takes for a
 * filament (one entry of Print-Tracker's finishDescriptorsForIds).
 */
export function finishDescriptor(f?: FilamentInput | null): FinishDescriptor {
  const { colours } = swatchProps(f);
  return { finish: finishForSubType(f?.finish), colours: colours || null };
}

/** True when any slot carries real finish information. */
export function hasFinishData(finishes?: readonly (FinishDescriptor | null | undefined)[] | null): boolean {
  return Boolean(finishes?.some((d) => d?.finish));
}

// ---------------------------------------------------------------------------
// Hex and alpha
// ---------------------------------------------------------------------------

/** A parsed colour: 0..255 channels and 0..1 alpha. */
export interface ParsedHex {
  rgb: [number, number, number];
  alpha: number;
}

/**
 * "#RRGGBB" or "#RRGGBBAA" (the "#" optional, any case) -> channels and alpha
 * (1 for a 6-digit hex). Anything else -> null; the caller picks its fallback.
 */
export function parseHex(hex?: string | null): ParsedHex | null {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return {
    rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255],
    alpha: m[2] ? parseInt(m[2], 16) / 255 : 1,
  };
}

/** Alpha byte of an `#RRGGBBAA` hex as 0..1; opaque for `#RRGGBB` (Print-Tracker's hexAlpha). */
export function hexAlpha(hex?: string | null): number {
  if (typeof hex !== "string" || hex.length !== 9) return 1;
  const a = parseInt(hex.slice(7), 16);
  return Number.isFinite(a) ? a / 255 : 1;
}

// Bambu reports clear filament as `#00000000`: black at zero alpha. Taken
// literally that is "invisible soot": the mesh renders nothing at all and a
// captured thumbnail comes out fully transparent. A printed clear part is
// glass, not absent, so 3D drawing floors the alpha and swaps the meaningless
// black for a neutral glass tint. The 2D swatch clamps its alpha for exactly
// this reason (see swatchLook); MIN_MESH_OPACITY is the floor for 3D.
export const MIN_MESH_OPACITY = 0.25;
export const CLEAR_TINT = "#dfe6e9";

/**
 * `#RRGGBB` for three.js, with a fully transparent black (the "Clear"
 * encoding) resolved to the glass tint instead. A zero-alpha hex that still
 * names a colour keeps that colour; only the colourless case is substituted.
 */
export function meshColourHex(hex: string): string;
export function meshColourHex(hex?: string | null): string | undefined;
export function meshColourHex(hex?: string | null): string | undefined {
  const rgb = hex?.slice(0, 7);
  return hexAlpha(hex) === 0 && rgb?.toLowerCase() === "#000000" ? CLEAR_TINT : rgb;
}

/**
 * The 3D opacity for a palette (Print-Tracker's getMeshColourProps rule): the
 * lowest alpha across it, floored at MIN_MESH_OPACITY, or undefined when every
 * colour is opaque (the material then decides; Translucent defaults to 0.55).
 */
export function meshOpacity(hexes?: readonly (string | null | undefined)[] | null): number | undefined {
  if (!hexes?.length) return undefined;
  const opacity = Math.min(...hexes.map((h) => hexAlpha(h)));
  return opacity < 1 ? Math.max(opacity, MIN_MESH_OPACITY) : undefined;
}

// ---------------------------------------------------------------------------
// The 2D swatch's look (what FilamentSwatch renders), as data
// ---------------------------------------------------------------------------

/** The CSS custom properties swatch.css reads. */
export interface SwatchVars {
  "--c1": string;
  "--c2": string;
  "--alpha": number;
  "--grad"?: string;
}

export interface SwatchLook {
  /** The data-finish attribute ("translucent" whenever the colour is see-through). */
  dataFinish: Finish;
  /** The finish family before the translucency rule. */
  finish: Finish;
  isTranslucent: boolean;
  /** The multi-colour stops, or null. */
  multi: readonly string[] | null;
  vars: SwatchVars;
}

/**
 * The swatch's finish, translucency and CSS variables for a set of swatch
 * props. Pure and deterministic, so a server render and the browser agree.
 */
export function swatchLook({
  subType,
  hex,
  colours,
}: {
  subType?: string | null;
  hex?: string | null;
  colours?: readonly string[] | null;
}): SwatchLook {
  const finish = finishForSubType(subType);
  const multi = colours && colours.length > 1 ? colours : null;
  const base = (multi ? multi[0] : hex || "#9CA3AF").slice(0, 7);
  const alphaHex = !multi && hex?.length === 9 ? hex.slice(7) : "FF";
  const alpha = parseInt(alphaHex, 16) / 255;
  const isTranslucent = finish === "translucent" || alpha < 0.95;
  const vars: SwatchVars = {
    "--c1": base,
    "--c2": multi ? multi[1].slice(0, 7) : base,
    "--alpha": isTranslucent ? Math.min(Math.max(alpha, 0.35), 0.85) : 1,
  };
  if (multi) vars["--grad"] = `linear-gradient(135deg, ${multi.join(", ")})`;
  return { dataFinish: isTranslucent ? "translucent" : finish, finish, isTranslucent, multi, vars };
}
