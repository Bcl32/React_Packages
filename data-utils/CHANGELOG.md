# @bcl32/data-utils

## 2.2.0

### Minor Changes

- dd612fd: Add `pivotTimeSeries`, a pure helper that bridges the grouped time-series
  backend contract (`Array<{ group, points: Array<{ bucket, value }> }>`) to the
  wide row format the chart components consume, returning `{ data, seriesKeys }`.
  A `null` group collapses to the `"value"` key; rows are keyed and sorted by
  bucket string (no date math). Exposed at `@bcl32/data-utils/pivotTimeSeries`.

## 2.1.10

### Patch Changes

- aee527f: feat(forms,data-utils,datatable): id_list support for bulk-edit and stats

  FormElement now renders id_list as a label-space Combobox over `attr.options`
  ({value, label} pairs), BulkEditModelForm includes id_list fields in its
  list-style merge/replace toggle (defaulting to "Add to existing"), and
  StatsTable skips id_list rather than falling through to default rendering.
  Unlocks bulk-editing reference-array fields like Part.systems.

## 2.1.9

### Patch Changes

- 94e4ba1: feat(hooks,forms): multipart auto-detect in mutations + file type in FormElement

## 2.1.8

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover

## 2.1.7

### Patch Changes

- bf5f36e: FilterProvider and useEntityFilters hook, percentage-based column widths, and hardened numeric parsing

## 2.1.6

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
