# @bcl32/themes

## 3.0.0

### Major Changes

- c8193b9: Theme editor overhaul with persistent per-theme customization.

  - Save/Reset in the editor: token edits diff against the base palette and persist per theme in localStorage (`bcl32-theme-overrides`); ThemeProvider re-applies saved overrides on load and clears stale inline variables on theme switch (stylesheet = base, inline vars = saved diff only).
  - Compact theme dialog: scrollable body, redesigned theme cards (miniature sidebar/page preview with donut chart, text samples and button) that reflect saved and in-progress customizations, active-theme ring + check, keyboard operable.
  - Token editor: group tabs (Main/Charts/Sidebar & Extra) exposing all 36 tokens, token search across groups, WCAG AA contrast warnings on failing fg/bg pairs, per-card copy-hex, fixed-height grid so the dialog no longer resizes between groups.
  - New ImportTheme component: paste Copy Theme JSON or CSS to apply + save as the active theme's customization; Copy Theme now emits valid JSON and inline "Copied!" feedback instead of alert().
  - ThemeProvider: follows OS light/dark changes live; `useTheme()` now exposes `resolved_theme`.
  - New subpath exports: `themeOverrides`, `contrastCheck`, `ImportTheme`; new colour utils `relativeLuminance` / `contrastRatio`.

  BREAKING: `ThemeGenerator` props changed — `main_styles` removed, `onEdited` callback added (token metadata now resolved internally). The dead opacity slider and inverted alpha handling were removed from `ColourControls`; `hslToHex` callers should pass alpha 1.

## 2.3.0

### Minor Changes

- a6f2de4: Add `success` / `success-foreground` tokens to all 10 themes (green hues
  tuned per theme, WCAG-checked foreground pairing) and rework
  `chart-1`..`chart-5` into categorical five-hue palettes in the 9 themes
  that previously shipped monochrome same-hue ramps (`purple` already had a
  categorical set and is unchanged). Each palette anchors chart-1 near the
  theme's primary hue and is validated for CVD separation and >=3:1
  contrast against the theme's background and card surfaces.

## 2.2.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/utils@2.5.0

## 2.1.5

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions

## 2.1.4

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5
