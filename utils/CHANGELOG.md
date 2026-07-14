# @bcl32/utils

## 2.6.1

### Patch Changes

- b07d026: fix(utils): cap dialog height to viewport and scroll overflowing content

## 2.6.0

### Minor Changes

- 5e75c5f: feat(utils): renderSwatchIcon slot on ColourPickerPopover

## 2.5.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

## 2.4.4

### Patch Changes

- 2c5779f: feat(forms,utils): two-level grouping in colour swatch picker
- dd1cf42: style(utils): emphasise sections in the colour swatch popover

## 2.4.3

### Patch Changes

- bb63cee: fix(utils): add Stepper to tsup build entry points

  The `./Stepper` subpath export and `src/Stepper.tsx` shipped in 2.4.1, but
  `Stepper` was never added to the tsup `entry` list — so `dist/Stepper.js`
  was never emitted and the published package carried a dangling export.
  Consumers importing `@bcl32/utils/Stepper` hit a Rollup "failed to resolve
  import" build error. Adding the entry makes tsup emit `dist/Stepper.js` so
  the export resolves.

## 2.4.2

### Patch Changes

- 45dcfbc: fix(forms,hooks,utils): standardize @tanstack/react-query as peerDep + externalize in tsup

## 2.4.1

### Patch Changes

- c9beb42: feat(utils): add Stepper component with navigation helpers

## 2.3.9

### Patch Changes

- 47ed598: fix(forms,utils): preserve filament identity in colour_array bulk edits

## 2.3.8

### Patch Changes

- e6a1b83: fix(utils): add Combobox to tsup entry points
- fa21c39: feat(utils): add Combobox component with deep-path export

## 2.3.7

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover

## 2.3.6

### Patch Changes

- 19d9b2a: Click-to-change colour swatches in ColourArrayField and DialogButton updates

## 2.3.5

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
