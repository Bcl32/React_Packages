# @bcl32/themes

> Reference doc · package `@bcl32/themes` · version `2.2.0` · tier **mid**
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
  overrides sit on top of the `data-theme` stylesheet and are not persisted.
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
light, dark, green, yellow, purple, blue, dark-green, dark-blue, light-blue, light-gold
```

Every theme now also defines a `warning` / `warning-foreground` token pair (new in
2.2.0 — added to all 10 themes and to `style_metadata.json`'s field descriptions:
*"Used for warning states such as caution badges and partial-success statuses"*).
Consumer apps with hardcoded `bg-amber-*`/`bg-yellow-*` warning-badge colours can now
migrate to the semantic `bg-warning`/`text-warning-foreground` tokens.

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
