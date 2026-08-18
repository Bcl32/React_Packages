# @bcl32/themes

> Reference doc · package `@bcl32/themes` · version `5.0.0` · tier **mid**
>
> Back to [packages overview](../00-OVERVIEW.md)

## Purpose

`@bcl32/themes` provides a complete **HSL-based theming system** for the monorepo's
React apps. It bundles four things:

1. A **React context/provider** (`ThemeProvider`) that persists the selected theme
   name to `localStorage`, writes a `data-theme` attribute onto
   `document.documentElement`, and exposes the current theme and a setter to
   descendants.
2. A set of **theme-management UI components** — a full-page `Theming` console, a
   live `ThemeGenerator` CSS-variable editor, theme preview cards, dropdown
   selector, and clipboard export/convert dialogs.
3. **Colour utility functions** for converting between hex, RGB, and HSL formats and
   for re-serialising arbitrary CSS colour strings.
4. **A shared Tailwind preset** (`./tailwind-preset`, new in 2.2.0) that generates
   the full `tw-colors` palette straight from `themes.json`, so consumer apps no
   longer hand-copy the palette into their own `tailwind.config.js`. See
   [Tailwind preset](#tailwind-preset-new-in-220) below.

**Tier:** mid — it depends on the lower-tier `@bcl32/utils` UI library and is itself
consumed by application code rather than other packages.

## Install & Import

The package is a workspace member; consumers reference it via the pnpm workspace
protocol:

```jsonc
// package.json (consuming app)
{
  "dependencies": {
    "@bcl32/themes": "workspace:^2.1.5"
  }
}
```

Import either from the package root or from a per-component subpath entry (both are
published in `exports`):

```ts
// Root barrel — everything is re-exported here
import { ThemeProvider, useTheme, ThemeDropdownSelect } from "@bcl32/themes";

// Or a specific subpath entry (tree-shaking / smaller import surface)
import { Theming } from "@bcl32/themes/Theming";
import { convertColor } from "@bcl32/themes/colorUtils";
```

### Available subpath entries

| Subpath | Exposes |
| --- | --- |
| `@bcl32/themes` | Full barrel (`src/index.ts` re-exports every module) |
| `@bcl32/themes/Theming` | `Theming` |
| `@bcl32/themes/ThemeGenerator` | `ThemeGenerator` |
| `@bcl32/themes/ThemeProvider` | `ThemeProvider`, `useTheme`, types |
| `@bcl32/themes/ThemePanel` | `ThemePanel` |
| `@bcl32/themes/ThemeExample` | `ThemeExample` |
| `@bcl32/themes/ThemeDropdownSelect` | `ThemeDropdownSelect` |
| `@bcl32/themes/ColourControls` | `ColourControls` |
| `@bcl32/themes/ColourConverter` | `ColourConverter` |
| `@bcl32/themes/ColourPicker` | `ColourPicker` |
| `@bcl32/themes/CopyTheme` | `CopyTheme` |
| `@bcl32/themes/colorUtils` | All colour utility functions |
| `@bcl32/themes/themeMeta` | `isLightTheme(name)`, `LIGHT_THEMES` (new in 2.2.0) |
| `@bcl32/themes/tailwind-preset` | A CJS Tailwind preset object — `require()` it from a consumer's `tailwind.config.js` (new in 2.2.0; see [below](#tailwind-preset-new-in-220)) |
| `@bcl32/themes/themes.json` | The raw `themes.json` palette data, resolved straight to `src/themes.json` (no `dist/` build step) |

The package also ships the raw data file `src/style_metadata.json` alongside
`dist/` (declared in `files`), so a consumer can import it directly for custom
processing (e.g. building a theme-editor UI from the token descriptions).

## Public Exports

### Components

| Name | Signature / Props | Description |
| --- | --- | --- |
| `ThemeProvider` | `ThemeProvider({ children, defaultTheme?: Theme, storageKey?: string })` | Root context provider. Persists the selected theme name to `localStorage`, sets `data-theme` on `document.documentElement`, and exposes `theme`, `theme_options`, `theme_type`, `setTheme` to descendants. **Must wrap the entire app.** |
| `ThemeDropdownSelect` | `ThemeDropdownSelect()` | Dropdown (built on `@bcl32/utils` Dropdown primitives) listing all available theme names; calls `setTheme` on selection. Requires `ThemeProvider`. |
| `Theming` | `Theming()` | Full-page theme-management UI: active theme name, `ThemePanel`s for all themes, a live `ThemeGenerator` editor, a `ThemeExample` preview, a `ColourConverter` dialog, and a `CopyTheme` export dialog. Requires `ThemeProvider`. |
| `ThemeGenerator` | `ThemeGenerator({ colours, setColours, main_styles })` | Renders `'main'`-group CSS variables as clickable colour swatches; clicking opens a `SimpleDialog` with `ColourControls` sliders that update CSS variables live via `document.documentElement.style.setProperty`. |
| `ThemePanel` | `ThemePanel({ name: string, styles: ThemeStyles })` | Compact clickable swatch card previewing a named theme's background, card, primary, and secondary colours; calls `setTheme` on click. |
| `ThemeExample` | `ThemeExample()` | Static demo panel showing `@bcl32/utils` components (`Button`, `AnimatedTabs`, `ShowHierarchy`) plus a `lucide-react` `Palette` icon, rendered in the current theme context. |
| `ColourControls` | `ColourControls({ color: HSLColor, onChange, onHexChange })` | HSL + alpha editor with four gradient sliders (hue, saturation, lightness, opacity) and an embedded `ColourPicker`. Calls `onChange(property, value)` on each change. **See alpha caveat below.** |
| `ColourConverter` | `ColourConverter()` | Dialog utility that converts a user-entered colour string (hsl/rgb/hex) to any of six output formats and copies the result to the clipboard. |
| `ColourPicker` | `ColourPicker({ color: string, onChange, className? })` | Colour swatch + hidden native `<input type="color">` + hex text input. Preserves any alpha-channel suffix on the hex string; calls `onChange(hex)` on a valid 6-digit hex. |
| `CopyTheme` | `CopyTheme({ currentTheme: string, colours: Record<string, HSLColor> })` | Dialog that serialises the current theme colours to a CSS `:root` variable block **or** JSON and copies them to the clipboard via a toggle group. |

### Hook

| Name | Signature | Description |
| --- | --- | --- |
| `useTheme` | `useTheme(): ThemeProviderState` | Returns `{ theme, theme_options, theme_type, setTheme }` from `ThemeProviderContext`. Throws if called outside a `ThemeProvider`. |

### Theme metadata (`themeMeta`, new in 2.2.0)

| Name | Signature | Description |
| --- | --- | --- |
| `isLightTheme` | `(name: string) => boolean` | Derives whether a named theme is "light" from `themes.json` itself — a theme is light when its `background` HSL lightness is `>= 50`. Unknown theme names classify as dark. Replaces the old hand-maintained allowlist in `ThemeProvider` (see [Known Smells](#known-smells--caveats)). |
| `LIGHT_THEMES` | `string[]` | `Object.keys(themes.json).filter(isLightTheme)` — computed once at module load. Consumers that previously hand-maintained their own "is this theme light" list (e.g. Print-Tracker's `viewerBackdrop.js`) should import this instead. |

### Colour utility functions (`colorUtils`)

| Name | Signature | Description |
| --- | --- | --- |
| `hexToHSL` | `hexToHSL(hex: string): HSLColor` | Converts a 6- or 8-char hex string (optional leading `#`) to `HSLColor`; reads optional alpha from an 8-char hex. |
| `rgbToHSL` | `rgbToHSL(r: number, g: number, b: number): HSLColor` | Converts RGB channel values (0–255) to `HSLColor` with `alpha` fixed at `1`. |
| `hslToHex` | `hslToHex(h: number, s: number, l: number, a: number): string` | Converts H/S/L/A to a **6-char** hex string. `a` is used in the channel computation but is **not** appended to the output (see caveat). |
| `parseToHSL` | `parseToHSL(color: string): HSLColor \| null` | Parses an arbitrary CSS colour string (hsl/hsla function, rgb/rgba function, or hex) into `HSLColor`; returns `null` on failure. |
| `convertColor` | `convertColor(color: string, outputFormat: ColorFormat): string \| null` | Parses a colour string and re-serialises it in the requested `ColorFormat`; returns `null` if the input can't be parsed. |
| `createColor` | `createColor(baseHue: number, saturation: number, lightness: number, alpha?: number): HSLColor` | Factory for `HSLColor` objects with a default `alpha` of `1`. |
| `hslToObject` | `hslToObject(color: string): HSLColor \| null` | Parses an `hsl()`/`hsla()` CSS function string into `HSLColor`; returns `null` for non-hsl formats (unlike `parseToHSL`, does **not** accept hex or rgb). |

### Types

| Name | Definition | Description |
| --- | --- | --- |
| `HSLColor` | `{ hue: number; saturation: number; lightness: number; alpha: number }` | Core colour value type. |
| `RGBColor` | `{ r: number; g: number; b: number }` | RGB value type. |
| `ColorFormat` | `'hex' \| 'rgb' \| 'rgba' \| 'hsl' \| 'hsla' \| 'custom'` | Union of supported output format strings. |
| `ThemeColorConfig` | `extends HSLColor { description?: string }` | `HSLColor` plus an optional `description`, used by `ThemeGenerator` to annotate swatches. |
| `ThemeStyles` | `{ background; foreground; card; primary; 'primary-foreground'; secondary; 'secondary-foreground'; border; [key: string]: string }` | Record shape for a theme object from `themes.json` (all values are strings) with an index signature for extra keys. |
| `Theme` | `keyof typeof Themes \| 'system'` | Union of all keys from the bundled `themes.json` plus `'system'`. |
| `ThemeProviderProps` | `{ children: ReactNode; defaultTheme?: Theme; storageKey?: string }` | Props for `ThemeProvider`. |
| `ThemeGeneratorProps` | `{ colours: Record<string, ThemeColorConfig>; setColours: Dispatch<SetStateAction<Record<string, ThemeColorConfig>>>; main_styles: Record<string, ThemeColorConfig> }` | Props for `ThemeGenerator`. |
| `ColourControlsProps` | `{ color: HSLColor; onChange: (property: keyof HSLColor, value: number) => void; onHexChange: (hex: string) => void }` | Props for `ColourControls`. |
| `ColourPickerProps` | `{ color: string; onChange: (hex: string) => void; className?: string }` | Props for `ColourPicker`. |
| `CopyThemeProps` | `{ currentTheme: string; colours: Record<string, HSLColor> }` | Props for `CopyTheme`. |
| `ThemePanelProps` | `{ name: string; styles: ThemeStyles }` | Props for `ThemePanel`. |

### `ThemeProviderState` (returned by `useTheme`)

| Field | Type | Description |
| --- | --- | --- |
| `theme` | `Theme` | The active theme name (or `'system'`). |
| `theme_options` | `string[]` | All theme names — `Object.keys(themes.json)`. |
| `theme_type` | `'light' \| 'dark'` | Light/dark classification of the active theme, derived by calling `isLightTheme()` on the **resolved** theme name (i.e. after `'system'` is resolved to `'light'`/`'dark'` via `matchMedia` — see [Conventions](#conventions--patterns-a-consumer-must-follow)). |
| `setTheme` | `(theme: string) => void` | Persists the name to `localStorage` and updates state. |

## Dependencies

| Kind | Package | Range |
| --- | --- | --- |
| Internal (`@bcl32`) | `@bcl32/utils` | `workspace:^2.5.0` — provides Dropdown primitives, `Button`, `AnimatedTabs`, `ShowHierarchy`, dialogs |
| Peer | `react` | `^18.2.0` |
| Peer | `react-dom` | `^18.2.0` |
| External | `lucide-react` | `^0.447.0` — icons (e.g. `Palette`) |
| External | `tw-colors` | `^3.3.2` (new in 2.2.0) — powers the `./tailwind-preset` `createThemes()` call |

**UI libraries:** Tailwind CSS, plus Radix UI accessed indirectly through
`@bcl32/utils`.

## Conventions & Patterns a Consumer Must Follow

- **Wrap the app in `ThemeProvider`.** Every theme-consuming component
  (`ThemeDropdownSelect`, `ThemePanel`, `Theming`, etc.) calls `useTheme()` and will
  **throw** if no provider is present. Mount it at the root.
- **CSS variables per `data-theme` are generated for you.** Theme switching works by
  writing a `data-theme="<name>"` attribute to `document.documentElement`. As of
  2.2.0 the consumer no longer needs to hand-write a stylesheet for this — add
  `presets: [require("@bcl32/themes/tailwind-preset")]` to `tailwind.config.js` (see
  [Tailwind preset](#tailwind-preset-new-in-220)) and `tw-colors`' `createThemes()`
  generates the `[data-theme='<name>']`-scoped CSS variables straight from
  `themes.json` at build time.
- **Live edits are runtime CSS-variable overrides.** Both `Theming` and
  `ThemeGenerator` write directly to
  `document.documentElement.style.setProperty('--<var-name>', …)`. These inline
  overrides sit on top of the `data-theme` stylesheet. Slider edits are transient
  until **Save**, which persists the diff-against-base to
  `localStorage['bcl32-theme-overrides']` (`themeOverrides.ts`); `ImportTheme`
  applies *and* saves immediately. `applyResolvedTheme()` clears every known
  token before re-applying, so switching themes cannot leave a stale inline pin.
- **`dark:` follows the selected theme, not the OS.** As of 5.0.0 the preset sets
  `darkMode`, binding Tailwind's `dark:` variant to `data-theme`. Do not assume
  `prefers-color-scheme` — see [Dark variant](#dark-variant-new-in-500).
- **`themes.json` stores `hsl()` function strings**, e.g. `"hsl(229 57% 100%)"` — not
  raw `h s% l%` space-separated values. The editor flow relies on `hslToObject` to
  parse this specific format.
- **The `'system'` theme** resolves at runtime via
  `window.matchMedia('(prefers-color-scheme: dark)')`. `ThemeProvider` resolves it
  to a concrete `'light'`/`'dark'` name **before** writing `data-theme` and before
  classifying `theme_type`, so the two can never disagree (fixed in 2.2.0 — see
  [Known Smells](#known-smells--caveats)).

### Tailwind preset (new in 2.2.0)

`@bcl32/themes/tailwind-preset` is a plain CommonJS module (`tailwind-preset.cjs`,
shipped un-bundled — the package is `"type": "module"` but Tailwind/Node loads
presets via `require()`, hence the `.cjs` extension) that a consumer app plugs into
its own `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@bcl32/themes/tailwind-preset")],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@bcl32/**/*.{js,ts,jsx,tsx}",
  ],
  // app-specific `theme.extend` / `plugins` still merge on top of the preset
};
```

The preset:

- Calls `tw-colors`' `createThemes()` with the full palette read straight from
  `src/themes.json`, using `produceCssVariable: (name) => \`--${name}\`` — the same
  convention `Theming.tsx`'s runtime editor relies on when it calls
  `style.setProperty`.
- Adds the `shine` keyframes/animation Tailwind theme extension that backs
  `@bcl32/utils` `Button`'s `shine` CVA variant, so consumer apps get it without
  hand-copying it.
- Sets `darkMode` so the `dark:` variant tracks `data-theme` — see below.

### Dark variant (new in 5.0.0)

Before 5.0.0 the preset set no `darkMode`, so Tailwind fell back to its stock
`darkMode: "media"` and compiled every `dark:` utility into
`@media (prefers-color-scheme: dark)`. That gated `dark:` on the viewer's
**operating system**, with no connection to the `data-theme` attribute
`ThemeProvider` writes — two systems sharing a word and nothing else.

Six of the nine themes are dark-background (`dark`, `green`, `yellow`, `red`,
`purple`, `dark-blue`), so the mismatch was the normal case: selecting any of the
five *not* named `dark` on an OS set to light left every `dark:` class inert,
painting light-mode colours over a dark background.

The preset now derives the dark-theme list from `themes.json` by the same
background-lightness rule as `isLightTheme` — so it cannot drift as themes are
added or retuned — and emits a single variant:

```js
darkMode: ["variant", `&:where(${darkRoots}, ${darkRoots} *)`]
// darkRoots = :is([data-theme="dark"],[data-theme="green"],…)
```

All six themes collapse into one `:is()` selector deliberately: a selector list
would emit a separate copy of every `dark:` rule per theme. `:where()` adds no
specificity, so utility ordering is unchanged.

OS preference is not discarded — it enters at exactly one point. The `system`
theme still resolves to `light`/`dark` via `matchMedia` in `ThemeProvider`, and
everything downstream reads `data-theme`.

A consumer that genuinely wants OS-following behaviour can set
`darkMode: "media"` in its own `tailwind.config.js`; a consumer-level key
overrides the preset.

This makes `themes.json` the **single source of truth** for the palette: apps no
longer hand-copy a `createThemes({...})` block with every HSL value into their own
`tailwind.config.js` (the old pattern, still visible in git history / the
`REFACTORING-LOG.md` and `06-REFACTOR-PROPOSALS.md` §5 entry it resolves). Adding a
theme, or a token like `warning`/`warning-foreground` (also new in 2.2.0 — see
[Bundled themes](#bundled-themes)), now only requires editing `themes.json` once;
every consumer app picks it up on its next Tailwind build.

### Bundled themes

`themes.json` ships these named themes (the `theme_options` list):

```
light, dark, green, yellow, red, purple, dark-blue, light-blue, light-gold
```

`light` and `dark` are load-bearing: `ThemeProvider` resolves `'system'` to one of
those two names, so neither can be renamed or removed without editing that
resolver. The rest are free to add, rename or drop — `theme_options` is derived
from `Object.keys(themes.json)`, so the picker follows the file automatically.

Every theme also defines a `warning` / `warning-foreground` token pair (new in
2.2.0 — added to every theme and to `style_metadata.json`'s field descriptions:
*"Used for warning states such as caution badges and partial-success statuses"*).
Consumer apps with hardcoded `bg-amber-*`/`bg-yellow-*` warning-badge colours can now
migrate to the semantic `bg-warning`/`text-warning`/`text-warning-foreground` tokens.

**`warning` is tuned per theme as of 5.0.0.** From 2.2.0 to 4.1.0 it was the one
token `themes.json` never varied — `hsl(38 92% 50%)` in all nine themes, while
`primary`, `destructive` and `success` were all theme-specific. That fixed
mid-amber only contrasted against dark surfaces, so on the light themes
`text-warning` measured **1.97:1** and the token was unusable for text; consumers
worked around it with hardcoded `text-amber-700 dark:text-amber-300` pairs.

It now follows the same shape as `success`: the light themes take a dark amber
(~32–34% lightness) with a near-white foreground, and the six dark themes take a
50%-lightness amber with a dark foreground. Hue shifts per theme where the default
amber would collide with that theme's own palette — `yellow` and `light-gold` move
toward orange to clear their amber/gold `primary`, `red` moves yellower to clear
both its `primary` and `destructive`.

Every theme clears WCAG AA (4.5:1) on all three of: `text-warning` on
`background`, `text-warning` on a `bg-warning/10` tint, and `warning-foreground`
on solid `warning` — worst case 4.53:1 (`yellow`, on tint). Perceptual separation
from each theme's `primary`, `destructive` and `success` is ΔE ≥ 25.7. Keep those
two properties in mind when retuning: a warning colour that fails on a tint is the
failure mode that reintroduces the hardcoded-amber workaround.

### Card backdrop palette — `surface-1 … surface-8`

**New in 5.1.0.** The second numbered family after `chart-1 … chart-5`, and the
one to reach for when cards or sections need to read as *groups* — a section
packer where each group carries its own subtle backdrop, a board whose lanes
should be tellable apart at a glance.

**It is not the chart palette tinted, and that is deliberate.** Chart colours
are *marks*: small, saturated, chosen to survive at three pixels. Backdrops are
*surfaces*: large, and required to recede behind text. The five chart
lightnesses differ by more than 20 points inside a single theme, so five equal
tints of them (`bg-chart-N/10`, the obvious move) read as five different
*weights* — an accidental hierarchy across groups that have none.

Four rules, all enforced by the generator:

| rule | why |
|---|---|
| one **lightness** for the whole family | unequal lightness reads as rank; it is also what lets `card-foreground` stay the single text colour for all eight, so there are no `surface-N-foreground` tokens to keep in step |
| one **saturation**, from the theme's own `accent`/`card` (light themes ×2.2 — see below) | a fixed constant washes out `green`/`red`/`purple`/`dark-blue` (cards 45–70% saturated) and blows out `light` (card pure grey) |
| **hue is the only variable**, anchored on `primary` | the family belongs to the theme; the ladder is perceptually corrected rather than an even 45°, because even HSL steps cluster four of the eight in the green–cyan band |
| values are **opaque** | sections nest, and two alpha tints multiply. A nested surface applies its own `/60` at the call site, compositing against its parent's own hue so it reads as an inset |

Lightness sits one small step from `card` — down on light themes, up on dark
ones, and dark themes take the larger step because below ~L12 a hue is barely a
hue. Measured against `card`, the step is a 1.01–1.40 contrast ratio: present,
but well short of a new elevation. Measured against `card-foreground`, the worst
of all 72 values is **8.7:1** (`purple`, `surface-5`), comfortably past AA.

#### Why light themes carry a ×2.2 saturation gain

HSL saturation is **not perceptually uniform across lightness**. Near white the
gamut narrows to a point, so the same nominal `S` buys far less actual colour.
The first cut used each light theme's own 28–35% unchanged, which measured:

| | mean chroma | ΔE between adjacent backdrops |
|---|---|---|
| light themes, no gain | 5.5 | **1.5** |
| `dark` (the *weakest* dark theme, S20) | 9.6 | 4.2 |
| `dark-blue` (S72) | 29.3 | 10.4 |

ΔE 1.5 is **below the ~2.3 just-noticeable-difference threshold** — those
backdrops were not reliably distinguishable, which is exactly how they looked in
an app. The gain lifts 28/35/35 to 62/77/77, for mean chroma 12.1 and ΔE 3.3.

Raising the *floor* instead was the obvious fix and the wrong one: it flattens
all three light themes onto one number and discards the "saturation comes from
the theme's own accent" rule. A multiplier lifts them while keeping them
distinct.

Note this is close to the ceiling of what the colour space offers near white —
sweeping `S` all the way to 100 only reaches chroma 16.5. The remaining lever is
lightness (deepening `card.l - 4`), which buys separation from `card` but trades
against the "mostly subtle" brief, so it is deliberately left alone.

Generate them with:

```bash
cd react-packages/themes && pnpm seed-surfaces      # --dry-run to preview
```

The script is **idempotent** — a theme that already has `surface-1` is skipped
whole, so anything hand-tuned in the theme editor survives a re-run. `--force`
reseeds. It also splices the matching `style_metadata.json` entries (as text,
to avoid reformatting that hand-formatted file), which is what files the tokens
under the editor's **Cards** tab rather than silently under "Sidebar & Extra".

`CONTRAST_PAIRS` checks every backdrop against `card-foreground`, so a hand-tune
that drifts too dark surfaces as an editor warning rather than on the page.

#### Resizing the family

`--count N --force` is the whole procedure — **no other file, in any package,
records the size**:

```bash
pnpm seed-surfaces --count 10 --force
```

The hue curve is resampled rather than replaced by even steps, so ten backdrops
keep the same perceptual spacing as eight. Everything downstream derives the
number instead of declaring it:

| consumer | how it learns the count |
|---|---|
| `contrastCheck.SURFACE_COUNT` | counts `surface-N` keys in themes.json — the **minimum** across themes, so an index below it resolves under every theme |
| `ThemeExample` | reads `SURFACE_COUNT` |
| @bcl32/datatable | probes the live `--surface-N` custom properties at runtime; see [`sectionTone`](./datatable.md#section-backdrops-sectiontone) |

Taking the minimum has one deliberate consequence: **adding a theme without
re-running the seeder drops the count to 0 and turns backdrops off everywhere**,
rather than leaving them broken on that one theme. The seeder warns about a
size mismatch when it skips (`already seeded at 8, not 10`) so the half-resized
state is visible rather than silent.

Only `DEFAULT_SURFACE_COUNT` in the seeder holds the literal number.

Consumers: `bg-surface-3` etc. work anywhere, but the packed-sections layout has
a first-class seam — see `sectionTone` in
[datatable](./datatable.md).

## Known Smells & Caveats

> These are documented behaviours to be aware of — they are not necessarily bugs you
> need to fix, but they will bite a consumer who assumes otherwise.

- **Alpha convention inversion in `ColourControls`.** `ColourControls` treats the
  `alpha` field of `HSLColor` as an opacity on a **0–100** scale where **`0` = fully
  opaque and `100` = fully transparent** (it computes `(100 - color.alpha) / 100`
  everywhere and writes `onChange('alpha', 100 - hsl.alpha * 100)` on hex→HSL
  round-trips). Every other consumer — including `hexToHSL` and `hslToObject` — stores
  `alpha` as a normal **0–1** fraction. Do not mix `HSLColor` values across this
  component without converting.
- **`hslToHex` silently drops alpha.** It accepts an `a` parameter and uses it in the
  chroma computation, but the returned hex is always 6 characters — no alpha byte is
  appended. This is misleading given that `ColourPicker` treats 8-char hex as carrying
  an alpha byte.
- **`theme_type` allowlist — FIXED in 2.2.0.** `ThemeProvider` used to classify
  light vs dark with a hard-coded array `['light', 'light-green', 'light-blue',
  'light-gold']` that had to be kept in sync with `themes.json` by hand (and had
  already drifted — it referenced `light-green`, which was never a key in
  `themes.json`). As of 2.2.0, `ThemeProvider` calls the new `isLightTheme()`
  (from `themeMeta`, derived from each theme's `background` lightness) instead, so
  there is no hand-maintained list to drift. `ThemeProvider` also now resolves
  `'system'` to a concrete `'light'`/`'dark'` name *before* classifying
  `theme_type`, closing a second bug where `'system'` could be misclassified as
  dark even when the OS preference resolved to light.
- **Duplicated `updateCSSVariables` logic.** Near-identical functions that iterate
  colour entries and call `document.documentElement.style.setProperty` exist
  separately in `Theming.tsx` and `ThemeGenerator.tsx`; neither is exported or shared.
- **`hslToObject` ⊂ `parseToHSL`.** `hslToObject` only handles `hsl`/`hsla` function
  strings and duplicates `parseToHSL`'s regex/parsing. Prefer `parseToHSL` unless you
  specifically need to reject hex/rgb input.
- **`ThemeGenerator` props redundancy.** It iterates `main_styles` for display but also
  takes the full `colours` map, used only to read `colours[activeColor].description` —
  which `ThemeColorConfig` already carries on `main_styles`.
- **`ThemePanel` layout.** Uses a bare `className='row'` div with no Tailwind utility
  classes, so the primary/secondary swatch layout relies on default block display.
- **Native `alert()` for feedback.** `ColourConverter` and `CopyTheme` use blocking
  `alert()` calls for success/feedback instead of a toast or inline message.
- **Redundant default exports (dead code).** `ColourControls.tsx` and
  `ColourConverter.tsx` each declare an unused `export default` in addition to their
  named export. The barrel and subpath entries only use the named exports.

## Minimal Usage Example

```tsx
import { ThemeProvider, useTheme, ThemeDropdownSelect, Theming } from "@bcl32/themes";
import { convertColor } from "@bcl32/themes/colorUtils";

// 1. Wrap the whole app once, at the root.
function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-app-theme">
      <Toolbar />
      <Theming /> {/* full theme-management console */}
    </ThemeProvider>
  );
}

// 2. Read/switch the theme anywhere inside the provider.
function Toolbar() {
  const { theme, theme_type, theme_options, setTheme } = useTheme();

  return (
    <header>
      <span>Active: {theme} ({theme_type})</span>
      <ThemeDropdownSelect />
      <button onClick={() => setTheme("dark")}>Force dark</button>
    </header>
  );
}

// 3. Colour utilities work standalone (no provider needed).
const rgba = convertColor("hsl(229 100% 62%)", "rgba"); // -> "rgba(...)" or null
```

---

See the [packages overview](../00-OVERVIEW.md) for how `@bcl32/themes` fits into the
overall package tier graph.
