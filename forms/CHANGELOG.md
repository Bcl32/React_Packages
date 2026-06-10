# Changelog

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
