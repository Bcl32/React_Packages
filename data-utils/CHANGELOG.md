# @bcl32/data-utils

## 2.3.0

### Minor Changes

- 9e81236: Read the bulk-update endpoint as a capability instead of deriving it

  A generated ModelData file's URL keys are feature flags — `update_api_url` gates
  row editing, `delete_api_url` gates bulk delete. Bulk edit was the exception: it
  had no URL of its own and was built as `update_api_url + "/bulk-update"`, so it
  was always present wherever editing was, and the button shipped on tables whose
  API has no such route (Print-Tracker's `UploadJob`, Base-POC, which batches at
  `/batch`) — a dialog that 405s on submit.

  bcl32-schema-utils 0.13.0 emits `bulk_update_api_url` only when the route exists
  in the app's OpenAPI document. This release consumes it:

  - **data-utils** — new `resolveBulkUpdateUrl(ModelData)`, and `ModelData` gains
    the `bulk_update_api_url` field. It falls back to the old derivation while the
    key is absent, so a frontend that upgrades before regenerating its metadata
    keeps bulk edit; that fallback is a migration window and is marked for deletion
    once every app emits the key.
  - **forms** — `BulkEditModelForm` posts to the resolved URL, and its
    `ModelData` prop no longer requires `update_api_url`.
  - **datatable** — the bulk-edit button and its disabled placeholder gate on the
    resolved bulk URL rather than on row editability, and the Create button now
    requires `add_api_url` as well as `create_enabled` (the same "URL as well as
    the flag" rule bulk delete already followed) — with no create route, that
    button posted to `""`.

## 2.2.3

### Patch Changes

- 1ef7569: feat(filters): numeric-array range filter (any-axis min/max slider)

## 2.2.2

### Patch Changes

- 963cf6b: fix(data-utils,filters): kill phantom "Invalid Date" datetime filter chip on all-null columns

## 2.2.1

### Patch Changes

- 6670a0d: Republish: registry 2.2.0 is a stale 2026-02 artifact (predates getFormDefault and pivotTimeSeries); the real 2.2.0 publish was rejected as a duplicate and masked by CI. 2.2.1 carries the current dist.

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
