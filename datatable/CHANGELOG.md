# Changelog

## 2.8.1

### Patch Changes

- Updated dependencies [1c61ce6]
  - @bcl32/hooks@4.0.0
  - @bcl32/forms@3.0.1

## 2.8.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/forms@3.0.0
  - @bcl32/utils@2.5.0

## 2.7.2

### Patch Changes

- 4e1a98a: chore(deps): make react-router-dom a peer dependency of navigation
- Updated dependencies [59253e3]
- Updated dependencies [f8a2014]
  - @bcl32/forms@2.6.0

## 2.7.1

### Patch Changes

- aee527f: feat(forms,data-utils,datatable): id_list support for bulk-edit and stats

  FormElement now renders id_list as a label-space Combobox over `attr.options`
  ({value, label} pairs), BulkEditModelForm includes id_list fields in its
  list-style merge/replace toggle (defaulting to "Add to existing"), and
  StatsTable skips id_list rather than falling through to default rendering.
  Unlocks bulk-editing reference-array fields like Part.systems.

- Updated dependencies [2c5779f]
- Updated dependencies [dd1cf42]
- Updated dependencies [451ef87]
- Updated dependencies [aee527f]
  - @bcl32/utils@2.4.4
  - @bcl32/forms@2.5.10
  - @bcl32/data-utils@2.1.10

## 2.7.0

### Minor Changes

- 69b5484: feat(datatable): adaptive layout with optional row virtualization

  DataTable now renders as a flex-column container with an internal scroll region. When a consumer wraps it in a flex+height parent (e.g. `<div className="h-[calc(100vh-8rem)] flex flex-col">`), DataTable owns its own scroll so the toolbar and filter panel stay visible while rows scroll beneath them. When the parent is unbounded, the layout gracefully falls back to page-scroll — no consumer changes required.

  Adds two new props:

  - `virtualized?: boolean` — opt in to row virtualization via `@tanstack/react-virtual`. Uses padding-row rendering so standard `<table>` markup, sticky headers, and expandable sub-rows keep working. The virtualizer attaches to DataTable's internal scroll region.
  - `estimatedRowHeight?: number` — tune the virtualizer's row-size estimate (default 56px).

  Existing call sites that don't use these props are unaffected. To get the sticky-toolbar UX on existing list pages, swap the wrapper's `overflow-auto` for `flex flex-col`.

## 2.6.4

### Patch Changes

- 4b98b89: feat(hooks,forms,datatable): structured ApiError system + cascade-delete conflict UX
- Updated dependencies [4b98b89]
- Updated dependencies [45dcfbc]
  - @bcl32/hooks@2.2.8
  - @bcl32/forms@2.5.9
  - @bcl32/utils@2.4.2

## 2.6.3

### Patch Changes

- bcafd31: chore(datatable,filters): move Radix UI deps to peerDependencies

## 2.6.1

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions

## 2.6.0

### Minor Changes

- d1091d4: Add DataTable filter toolbar integration and compact toolbar style

  DataTable: refactor toolbar to compact flex layout with filter slot, toolbar actions, selection-aware bulk edit/delete buttons, and count display.
  Filters: add DataTableFilterBar component with tabbed filter panel, active filter chips, and primary filter support.

## 2.5.2

### Patch Changes

- bf5f36e: FilterProvider and useEntityFilters hook, percentage-based column widths, and hardened numeric parsing
- Updated dependencies [881c819]
- Updated dependencies [7b18930]
- Updated dependencies [bf5f36e]
- Updated dependencies [19d9b2a]
  - @bcl32/forms@2.5.2
  - @bcl32/data-utils@2.1.7
  - @bcl32/utils@2.3.6

## 2.5.1

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/forms@2.5.1
  - @bcl32/utils@2.3.5
  - @bcl32/data-utils@2.1.6
  - @bcl32/hooks@2.2.6

## 2.5.0 (2026-03-16)

### Features

- add ColourArrayField and edit success callbacks

## 2.4.0 (2026-03-15)

### Features

- add ColourField component and bulk edit merge mode

## 2.3.1 (2026-03-15)

### Refactors

- change default pageSize from 10 to 9999

## 2.3.0 (2026-03-12)

### Features

- add bulk edit dialog button
