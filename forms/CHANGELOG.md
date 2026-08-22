# Changelog

## 3.3.0

### Minor Changes

- 1ee9939: Render a `date` attribute as a native date picker

  Pairs with bcl32-schema-utils, which now emits `type: "date"` for a
  `datetime.date` column instead of letting it fall through to `string`. Until
  now every calendar-day field — a due date, a purchase date, a budget window —
  got a free-text box: no picker, no validation, no calendar.

  **`@bcl32/forms`** — `FieldInput` gains a `date` case rendering
  `<input type="date">`, and `FormElement` routes `date` through the same
  single-line layout as `string`. It is deliberately NOT the existing `datetime`
  branch: that one is a dayjs-backed date-and-time control, and a due date has no
  time to ask for.

  The value format is the wire format. An `<input type="date">` reads and writes
  `"YYYY-MM-DD"`, which is exactly what a Pydantic `date` accepts and emits, so
  no parsing, formatting or timezone conversion sits between the picker and the
  column — verified round-tripping the 1st of a month, where a UTC/local slip
  would surface as the last day of the previous month.

  **`@bcl32/data-utils`** — `CalculateFeatureStats` counts `date` alongside
  `string` and `select`. This is what keeps the change behaviour-neutral: a date
  field filters as a string, so it needs the same grouped-count stat a string
  gets, or its stats entry would come back empty and its filter would behave
  differently from the free-text box it replaced.

  **Upgrading:** adopt this BEFORE regenerating metadata against schema-utils
  with the date type. `canRenderFormElement` returns `false` for a type it does
  not know, so metadata declaring `type: "date"` against an older `@bcl32/forms`
  makes those fields **vanish from the form** rather than fall back to a text
  box. Publish → deps-sync → regenerate, in that order.

  Filtering is unchanged: `date` still filters as a string (contains). A real
  date-range filter needs a date-only comparison first — the `datetime` filter
  parses a bare `"2026-06-15"` as UTC midnight and compares it against a
  local-time bound, which drops boundary days west of UTC.

### Patch Changes

- Updated dependencies [1ee9939]
  - @bcl32/data-utils@2.5.0

## 3.2.0

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

### Patch Changes

- Updated dependencies [9e81236]
  - @bcl32/data-utils@2.3.0

## 3.1.0

### Minor Changes

- c5b1d68: New EditableStringList component: inline click-to-edit bullet list for
  array-of-strings fields (ModelData type "list"). Click a row to edit in
  place, ghost row appends, Enter chains into the next item, committing empty
  deletes the row; commits PATCH the whole array via onSave({ field: string[] }).

## 3.0.2

### Patch Changes

- da6d2d8: Form labels now use the schema-provided `title` instead of the raw field name.

  The label expression `name[0].toUpperCase() + name.slice(1)` was inlined at
  twelve call sites in two variants — half of them replaced underscores and half
  didn't, which is how a single dialog ended up showing "Vendor id:" next to
  "Sub_type:" and "Colour_hex:". All twelve now go through one `fieldLabel(attr)`
  helper that prefers `attr.title` (which the API humanizes to "Volume (mm³)",
  "Source 3MF filename", "Object ID") and falls back to the humanized field name
  for hand-built attributes with no title.

  `fieldLabel` is exported for consumers that render their own field scaffolding.

- Updated dependencies [16ccd13]
- Updated dependencies [4fc115b]
  - @bcl32/utils@2.8.0
  - @bcl32/hooks@4.0.1

## 3.0.1

### Patch Changes

- Updated dependencies [1c61ce6]
  - @bcl32/hooks@4.0.0

## 3.0.0

### Major Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/utils@2.5.0

## 2.6.2

### Patch Changes

- f0e5208: refactor(forms): extract FieldInput; render relation_collection via shared inputs

## 2.6.1

### Patch Changes

- c23f9c5: style(forms): enlarge relation-collection resource titles to text-lg

## 2.6.0

### Minor Changes

- 59253e3: feat(forms): show a thumbnail on each relation-collection row
- f8a2014: feat(forms): add RelationCollectionField + AutoGrowTextarea + useDebouncedCallback, and FormElement cases for the `relation_collection` and `textarea` form-input types

## 2.5.10

### Patch Changes

- 2c5779f: feat(forms,utils): two-level grouping in colour swatch picker
- 451ef87: feat: PATCH only changed fields from EditModelForm
- aee527f: feat(forms,data-utils,datatable): id_list support for bulk-edit and stats

  FormElement now renders id_list as a label-space Combobox over `attr.options`
  ({value, label} pairs), BulkEditModelForm includes id_list fields in its
  list-style merge/replace toggle (defaulting to "Add to existing"), and
  StatsTable skips id_list rather than falling through to default rendering.
  Unlocks bulk-editing reference-array fields like Part.systems.

- Updated dependencies [2c5779f]
- Updated dependencies [dd1cf42]
- Updated dependencies [aee527f]
  - @bcl32/utils@2.4.4
  - @bcl32/data-utils@2.1.10

## 2.5.9

### Patch Changes

- 4b98b89: feat(hooks,forms,datatable): structured ApiError system + cascade-delete conflict UX
- 45dcfbc: fix(forms,hooks,utils): standardize @tanstack/react-query as peerDep + externalize in tsup
- Updated dependencies [4b98b89]
- Updated dependencies [45dcfbc]
  - @bcl32/hooks@2.2.8
  - @bcl32/utils@2.4.2

## 2.5.8

### Patch Changes

- 94e4ba1: feat(hooks,forms): multipart auto-detect in mutations + file type in FormElement
- Updated dependencies [94e4ba1]
  - @bcl32/data-utils@2.1.9
  - @bcl32/hooks@2.2.7

## 2.5.7

### Patch Changes

- 02e5334: fix(forms): skip unrenderable attributes and normalise combobox options

## 2.5.6

### Patch Changes

- 47ed598: fix(forms,utils): preserve filament identity in colour_array bulk edits
- Updated dependencies [47ed598]
  - @bcl32/utils@2.3.9

## 2.5.5

### Patch Changes

- 557b351: fix(forms): BulkEditModelForm onSuccess callback never fired

  `handleSubmit` awaited `mutation.mutate()` (which returns void, not a promise) and then called `setRowSelection({})` synchronously. Consumers like DataTable conditionally render BulkEditModelForm on `selectedIds.length > 0`, so clearing the selection eagerly unmounted the form before TanStack Query flipped `mutation.isSuccess` to true — the success useEffect never ran, and `onSuccess` was silently dropped.

  Fix: drop the bogus `await` and the eager selection clear. The existing success useEffect already handles toast, close, selection reset, and the callback once the form is still guaranteed to be mounted.

## 2.5.4

### Patch Changes

- 8ff52b8: refactor(filters,forms): replace MUI Autocomplete with Combobox
- Updated dependencies [e6a1b83]
- Updated dependencies [fa21c39]
  - @bcl32/utils@2.3.8

## 2.5.3

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover
- Updated dependencies [acd0e2c]
  - @bcl32/utils@2.3.7
  - @bcl32/data-utils@2.1.8

## 2.5.2

### Patch Changes

- 881c819: fix(forms): remove unused React import in ColourPickerPopover
- 7b18930: fix(forms): remove unused filamentIds variable in ColourArrayField
- 19d9b2a: Click-to-change colour swatches in ColourArrayField and DialogButton updates
- Updated dependencies [bf5f36e]
- Updated dependencies [19d9b2a]
  - @bcl32/data-utils@2.1.7
  - @bcl32/utils@2.3.6

## 2.5.1

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5
  - @bcl32/data-utils@2.1.6
  - @bcl32/hooks@2.2.6

## 2.5.0 (2026-03-16)

### Features

- add ColourArrayField and edit success callbacks

## 2.4.0 (2026-03-15)

### Features

- add ColourField component and bulk edit merge mode

## 2.3.0 (2026-03-12)

### Features

- add bulk edit dialog button

## 2.2.0 (2026-03-12)

### Features

- add BulkEditModelForm component
