# @bcl32/themes

> Reference doc · package `@bcl32/themes` · version `2.1.5` · tier **mid**
>
> Back to [packages overview](../00-OVERVIEW.md)

## Purpose

`@bcl32/themes` provides a complete **HSL-based theming system** for the monorepo's
React apps. It bundles three things:

1. A **React context/provider** (`ThemeProvider`) that persists the selected theme
   name to `localStorage`, writes a `data-theme` attribute onto
   `document.documentElement`, and exposes the current theme and a setter to
   descendants.
2. A set of **theme-management UI components** — a full-page `Theming` console, a
   live `ThemeGenerator` CSS-variable editor, theme preview cards, dropdown
   selector, and clipboard export/convert dialogs.
3. **Colour utility functions** for converting between hex, RGB, and HSL formats and
   for re-serialising arbitrary CSS colour strings.

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

The package also ships the raw data files `src/themes.json` and
`src/style_metadata.json` alongside `dist/` (declared in `files`), so a consumer can
import them directly for custom processing.

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
| `theme_type` | `'light' \| 'dark'` | Light/dark classification of the active theme (see caveat). |
| `setTheme` | `(theme: string) => void` | Persists the name to `localStorage` and updates state. |

## Dependencies

| Kind | Package | Range |
| --- | --- | --- |
| Internal (`@bcl32`) | `@bcl32/utils` | `workspace:^2.3.9` — provides Dropdown primitives, `Button`, `AnimatedTabs`, `ShowHierarchy`, dialogs |
| Peer | `react` | `^18.2.0` |
| Peer | `react-dom` | `^18.2.0` |
| External | `lucide-react` | `^0.447.0` — icons (e.g. `Palette`) |

**UI libraries:** Tailwind CSS, plus Radix UI accessed indirectly through
`@bcl32/utils`.

## Conventions & Patterns a Consumer Must Follow

- **Wrap the app in `ThemeProvider`.** Every theme-consuming component
  (`ThemeDropdownSelect`, `ThemePanel`, `Theming`, etc.) calls `useTheme()` and will
  **throw** if no provider is present. Mount it at the root.
- **Define CSS variables per `data-theme`.** Theme switching works by writing a
  `data-theme="<name>"` attribute to `document.documentElement`. Your stylesheet must
  declare colour variables scoped to `[data-theme='<name>']` selectors for the switch
  to have any visual effect.
- **Live edits are runtime CSS-variable overrides.** Both `Theming` and
  `ThemeGenerator` write directly to
  `document.documentElement.style.setProperty('--<var-name>', …)`. These inline
  overrides sit on top of the `data-theme` stylesheet and are not persisted.
- **`themes.json` stores `hsl()` function strings**, e.g. `"hsl(229 57% 100%)"` — not
  raw `h s% l%` space-separated values. The editor flow relies on `hslToObject` to
  parse this specific format.
- **The `'system'` theme** resolves at runtime via
  `window.matchMedia('(prefers-color-scheme: dark)')` and writes `light`/`dark` to
  `data-theme`.

### Bundled themes

`themes.json` ships these named themes (the `theme_options` list):

```
light, dark, green, yellow, purple, blue, dark-green, dark-blue, light-blue, light-gold
```

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
- **`theme_type` allowlist is brittle.** `ThemeProvider` classifies light vs dark with
  a hard-coded array `['light', 'light-green', 'light-blue', 'light-gold']`. It must be
  kept in sync with `themes.json` by hand — there's no derivation from the theme data.
  (Note the list even references `light-green`, which is **not** a key in the shipped
  `themes.json`, while every other theme defaults to `'dark'`.)
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
