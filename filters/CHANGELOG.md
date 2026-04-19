# @bcl32/filters

## 3.0.4

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions
- Updated dependencies [c1d7749]
  - @bcl32/charts@2.1.6

## 3.0.3

### Patch Changes

- c15c157: fix(filters): default options value_key to "value"

## 3.0.2

### Patch Changes

- ae8e1c3: fix(filters): guard optional filterData in toggleRule closures
- a0181af: refactor(filters): replace ToggleGroup with inline button for equals/contains rule in DebouncedTextFilter

  Matches the inline any/all toggle styling introduced for list filters — a single compact button that flips between "Contains" and "Equals" sits next to the label, replacing the wider ToggleGroup row.

- d7eb9d1: fix(filters): make string filter matching case-insensitive for both equals and contains rules

## 2.5.0

### Minor Changes

- d1091d4: Add DataTable filter toolbar integration and compact toolbar style

  DataTable: refactor toolbar to compact flex layout with filter slot, toolbar actions, selection-aware bulk edit/delete buttons, and count display.
  Filters: add DataTableFilterBar component with tabbed filter panel, active filter chips, and primary filter support.

### Patch Changes

- a03b98e: feat(filters): add toggle filter type and main tab for primary filters

## 2.4.2

### Patch Changes

- 8ff52b8: refactor(filters,forms): replace MUI Autocomplete with Combobox
- Updated dependencies [e6a1b83]
- Updated dependencies [fa21c39]
  - @bcl32/utils@2.3.8

## 2.4.1

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover
- Updated dependencies [acd0e2c]
  - @bcl32/utils@2.3.7
  - @bcl32/data-utils@2.1.8

## 2.4.0

### Minor Changes

- bf5f36e: FilterProvider and useEntityFilters hook, percentage-based column widths, and hardened numeric parsing

### Patch Changes

- Updated dependencies [bf5f36e]
- Updated dependencies [19d9b2a]
  - @bcl32/data-utils@2.1.7
  - @bcl32/utils@2.3.6

## 2.3.1

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5
  - @bcl32/data-utils@2.1.6
  - @bcl32/charts@2.1.5
