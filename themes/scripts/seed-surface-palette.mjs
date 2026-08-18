#!/usr/bin/env node
/**
 * Seeds every theme in `src/themes.json` with a `surface-1 … surface-8` family
 * — the **card backdrop palette**, and the sibling of `chart-1 … chart-5`.
 *
 * Why a separate family rather than tinting the chart palette
 * ----------------------------------------------------------
 * Chart colours are *marks*: small, saturated, and chosen to survive at three
 * pixels. Card backdrops are *surfaces*: large, and required to recede behind
 * text. Reusing the chart hues at `/10` fails on both counts — the five chart
 * lightnesses differ by more than 20 points in most themes, so five equal
 * tints of them read as five different *weights*, an accidental hierarchy;
 * and alpha composites against whatever is underneath, which is the wrong
 * behaviour for sections that nest inside each other.
 *
 * The four rules the formula encodes
 * ----------------------------------
 * 1. ONE LIGHTNESS for the whole family. Unequal lightness is read as rank.
 *    It is also what lets `card-foreground` stay the single text colour for
 *    all eight, so no `surface-N-foreground` tokens are needed.
 * 2. ONE SATURATION, taken from the theme's own `accent`/`card` — the tokens
 *    that already say how chromatic this theme makes a tinted surface. A fixed
 *    constant would wash out `green`, `red`, `purple` and `dark-blue`, whose
 *    cards are themselves 45–70% saturated, and would blow out `light`, whose
 *    card is pure grey.
 * 3. HUE IS THE ONLY VARIABLE, anchored on the theme's `primary` so the family
 *    belongs to the theme, and spread on a perceptually-corrected ladder
 *    rather than an even 45°: even steps in HSL cluster four of the eight in
 *    the green–cyan band, where hue reads slowly.
 * 4. OPAQUE VALUES, never alpha. A nested section applies `/60` at the call
 *    site, which composites against its *parent's own hue* and so reads as an
 *    inset rather than as a ninth colour.
 *
 * Idempotent by default: a theme that already has `surface-1` is skipped
 * whole, so values hand-tuned in the theme editor survive a re-run. Use
 * `--force` to reseed everything, `--dry-run` to print without writing.
 *
 *   node scripts/seed-surface-palette.mjs [--force] [--dry-run] [--count N]
 *
 * `--count` resizes the family; growing or shrinking it needs `--force`, since
 * an already-seeded theme is otherwise left alone. Nothing downstream has to be
 * told the new size — `contrastCheck.SURFACE_COUNT` counts it back off this
 * file's output, and @bcl32/datatable probes the live CSS variables.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEMES_PATH = join(HERE, "..", "src", "themes.json");
const META_PATH = join(HERE, "..", "src", "style_metadata.json");

/**
 * How many backdrops the family holds.
 *
 * **The only place this number is written down.** `contrastCheck.SURFACE_COUNT`
 * counts it back off themes.json, and @bcl32/datatable probes the live CSS —
 * so growing the palette is `--count 10 --force` here and nothing anywhere else.
 * Do not reintroduce a mirror of it.
 */
const DEFAULT_SURFACE_COUNT = 8;

/**
 * Degrees from the anchor hue at the reference size of 8. Deliberately uneven:
 * the gaps widen through green–cyan (115→165→205) where HSL hue changes read
 * slowly, and stay tight through red–yellow (0→35→70) where they read fast.
 *
 * Any other count resamples this curve rather than falling back to even steps,
 * so a palette of six or ten keeps the same perceptual spacing.
 */
const HUE_OFFSETS = [0, 35, 70, 115, 165, 205, 250, 305];

/** The token this family is inserted after, so the JSON stays grouped. */
const INSERT_AFTER = "chart-5";

const argv = process.argv.slice(2);
const args = new Set(argv);
const force = args.has("--force");
const dryRun = args.has("--dry-run");

const countArg = argv.find((a) => a.startsWith("--count"));
const SURFACE_COUNT = countArg
  ? Number(countArg.includes("=") ? countArg.split("=")[1] : argv[argv.indexOf(countArg) + 1])
  : DEFAULT_SURFACE_COUNT;
if (!Number.isInteger(SURFACE_COUNT) || SURFACE_COUNT < 2 || SURFACE_COUNT > 32) {
  console.error(`--count must be an integer between 2 and 32 (got ${SURFACE_COUNT})`);
  process.exit(1);
}

/** Hue offset for member i of a family of `n`, resampled off the reference
 *  curve above so the perceptual spacing survives a different palette size. */
function hueOffset(i, n) {
  if (n === HUE_OFFSETS.length) return HUE_OFFSETS[i];
  // Position on the curve in [0, 360), then linearly interpolate between the
  // two reference stops it falls between (the curve wraps back to 360).
  const at = (i / n) * HUE_OFFSETS.length;
  const lo = Math.floor(at);
  const frac = at - lo;
  const a = HUE_OFFSETS[lo % HUE_OFFSETS.length] + (lo >= HUE_OFFSETS.length ? 360 : 0);
  const bIndex = lo + 1;
  const b = bIndex >= HUE_OFFSETS.length ? 360 : HUE_OFFSETS[bIndex];
  return a + (b - a) * frac;
}

const HSL = /hsl\(\s*([\d.-]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/;

function parse(value, theme, token) {
  const m = HSL.exec(String(value ?? ""));
  if (!m) throw new Error(`theme "${theme}": cannot parse ${token} = ${value}`);
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s)}% ${round1(l)}%)`;

/** The eight values for one theme. Exported shape is the whole contract. */
function surfacesFor(name, theme) {
  const bg = parse(theme.background, name, "background");
  const card = parse(theme.card, name, "card");
  const primary = parse(theme.primary, name, "primary");
  const accent = parse(theme.accent, name, "accent");

  // Same rule as isLightTheme()/tailwind-preset.cjs — derived, never listed.
  const isLight = bg.l >= 50;

  // A near-grey primary (the `dark` theme's is 6% saturated) carries no hue
  // intent, so fall back to the background's hue — the thing these surfaces
  // actually sit on.
  const anchor = primary.s >= 25 ? primary.h : bg.h;

  // Rule 2. The floor is what keeps the deliberately monochrome themes
  // (`dark` at 4%, `yellow` at 18%) from producing eight indistinguishable
  // greys; the ceiling keeps `dark-blue` at 78% from producing eight neons.
  const saturation = clamp(Math.max(accent.s, card.s), isLight ? 24 : 20, 72);

  // Rule 1. Offset from `card`, not from `background`: the surface has to read
  // as "the card, tinted", so it sits one small step further from the page
  // than the card does. Light themes step down, dark themes step up — and dark
  // themes need the larger step, because below ~L12 a hue is barely a hue.
  const lightness = isLight
    ? clamp(card.l - 4, 80, 98)
    : clamp(card.l + 5, 12, 30);

  const out = {};
  for (let i = 0; i < SURFACE_COUNT; i++) {
    const hue = (((anchor + hueOffset(i, SURFACE_COUNT)) % 360) + 360) % 360;
    out[`surface-${i + 1}`] = fmt(hue, saturation, lightness);
  }
  return { surfaces: out, isLight, anchor, saturation, lightness };
}

/** Rebuild a theme object with the surfaces spliced in after `chart-5`, so the
 *  JSON reads in the same order the theme editor groups them. */
function withSurfaces(theme, surfaces) {
  const out = {};
  let inserted = false;
  for (const [key, value] of Object.entries(theme)) {
    if (key.startsWith("surface-")) continue; // re-emitted at the anchor
    out[key] = value;
    if (key === INSERT_AFTER) {
      Object.assign(out, surfaces);
      inserted = true;
    }
  }
  if (!inserted) Object.assign(out, surfaces);
  return out;
}

const themes = JSON.parse(readFileSync(THEMES_PATH, "utf8"));

let changed = 0;
for (const [name, theme] of Object.entries(themes)) {
  if (theme["surface-1"] && !force) {
    const have = Object.keys(theme).filter((k) => /^surface-\d+$/.test(k)).length;
    // A size mismatch is worth saying out loud: the derived counts downstream
    // take the MINIMUM across themes, so one theme left at the old size silently
    // caps every consumer.
    const note =
      have === SURFACE_COUNT
        ? "already seeded — use --force"
        : `already seeded at ${have}, not ${SURFACE_COUNT} — use --force to resize`;
    console.log(`${name.padEnd(11)} skipped (${note})`);
    continue;
  }
  const { surfaces, isLight, anchor, saturation, lightness } = surfacesFor(name, theme);
  themes[name] = withSurfaces(theme, surfaces);
  changed++;
  console.log(
    `${name.padEnd(11)} ${isLight ? "light" : "dark "}  anchor ${String(Math.round(anchor)).padStart(3)}°  ` +
      `S ${String(Math.round(saturation)).padStart(2)}%  L ${String(round1(lightness)).padStart(4)}%  ` +
      Object.values(surfaces).join(" ")
  );
}

/**
 * The editor tab is driven by `style_metadata.json`, so the two files move
 * together — a surface token with no metadata entry silently files itself
 * under "extra" and shows up beside the sidebar colours.
 *
 * Spliced as text rather than re-serialized. That file is hand-formatted (short
 * entries sit on one line), and `JSON.stringify` would expand eight unrelated
 * keys — noise that hides the real change in review, in a repo with no prettier
 * to normalise it back.
 */
function seedMetadata() {
  const text = readFileSync(META_PATH, "utf8");
  const missing = [];
  for (let i = 1; i <= SURFACE_COUNT; i++) {
    if (!text.includes(`"surface-${i}"`)) missing.push(i);
  }
  if (missing.length === 0) return { text, added: 0 };

  const anchor = '  "sidebar-background": {';
  const at = text.indexOf(anchor);
  if (at === -1) {
    throw new Error(`style_metadata.json: cannot find the ${anchor.trim()} key to splice before`);
  }

  const block =
    missing
      .map((i) => {
        const description =
          i === 1
            ? "Card/section backdrop 1 — the theme's own hue, tinted"
            : `Card/section backdrop ${i}`;
        return `  "surface-${i}": {\n    "description": "${description}",\n    "group": "surface"\n  },\n`;
      })
      .join("") ;

  return { text: text.slice(0, at) + block + text.slice(at), added: missing.length };
}

const metadata = seedMetadata();

if (dryRun) {
  console.log(
    `\n--dry-run: ${changed} theme(s) and ${metadata.added} metadata entr${
      metadata.added === 1 ? "y" : "ies"
    } would change, nothing written.`
  );
} else {
  if (changed > 0) writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2) + "\n");
  if (metadata.added > 0) writeFileSync(META_PATH, metadata.text);
  console.log(
    `\nWrote ${changed} theme(s) to src/themes.json, ${metadata.added} entr${
      metadata.added === 1 ? "y" : "ies"
    } to src/style_metadata.json`
  );
}
