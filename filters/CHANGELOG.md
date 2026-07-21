# @bcl32/filters

## 3.2.5

### Patch Changes

- 55871b7: fix(filters): humanize panel filter labels and honour attribute title

## 3.2.4

### Patch Changes

- 8c076cf: perf(filters): skip redundant unfiltered-stats pass on filter change
- Updated dependencies [c91423d]
  - @bcl32/utils@2.7.0

## 3.2.3

### Patch Changes

- e82db94: fix(filters): buildChartConfig cycles chart colour tokens beyond 5 keys (--chart-6+ is undefined and rendered invisible slices)
- e82db94: fix(filters): PieChartFilter slice clicks now filter — chart-level onClick never receives activePayload for pies; the handler moved onto the Pie itself (legend clicks already worked)
- Updated dependencies [47a1f90]
  - @bcl32/charts@3.1.2

## 3.2.2

### Patch Changes

- 963cf6b: fix(data-utils,filters): kill phantom "Invalid Date" datetime filter chip on all-null columns
- Updated dependencies [963cf6b]
  - @bcl32/data-utils@2.2.2

## 3.2.1

### Patch Changes

- Updated dependencies [1c61ce6]
  - @bcl32/hooks@4.0.0
  - @bcl32/charts@3.0.1

## 3.2.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/charts@3.0.0
  - @bcl32/utils@2.5.0

## 3.1.2

### Patch Changes

- 3ab5612: feat(filters): add EntityGroupCards for grouping entities by attribute
- dd2b0ef: fix(filters): drop unused React import in EntityGroupCards

## 3.1.1

### Patch Changes

- 9e43685: feat(filters): group colour-swatch filter by submaterial
- Updated dependencies [2c5779f]
- Updated dependencies [dd1cf42]
- Updated dependencies [aee527f]
  - @bcl32/utils@2.4.4
  - @bcl32/data-utils@2.1.10

## 3.1.0

### Minor Changes

- ddc65e5: feat(hooks,filters): auto-enrich options_source URLs

  @bcl32/hooks gains useOptionsEnrichment, a hook that fetches every
  attr.options_source.url declared on a ModelData and injects the response
  as attr.options. @bcl32/filters' useEntityFilters now calls it internally
  and returns enrichedModelData, so consumers can drop manual enrichment
  calls and pass enrichedModelData straight to DataTable / forms.

### Patch Changes

- Updated dependencies [ddc65e5]
  - @bcl32/hooks@2.3.0

## 3.0.6

### Patch Changes

- bcafd31: chore(datatable,filters): move Radix UI deps to peerDependencies

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
