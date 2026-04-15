# Changelog

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
