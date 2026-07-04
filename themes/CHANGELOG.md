# @bcl32/themes

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
