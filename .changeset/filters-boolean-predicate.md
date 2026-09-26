---
"@bcl32/filters": major
---

Booleans become their own filter type, and `source_kind` is renamed to `cell_shape`. Apps need ModelData from schema_utils 0.18 or later.

- **Boolean filters.** A boolean attribute builds a `type: "boolean"` filter whose value is `true`, `false`, `"unknown"` or `null` (no filter), replacing the options filter over a Yes/No list. Yes and No can no longer both be selected. Yes matches `true` and No matches `false`. On a `nullable` field, Unknown matches an empty cell. Metadata that still describes booleans as options filters builds the boolean filter too.
  - New `BooleanFilter` control: a segmented Any · Yes · No by default (plus Unknown on a nullable field), or a single checkbox with `display: "checkbox"`, `checkedValue` and `checkedLabel` ("Hide archived"). A nullable field always gets the segmented control.
  - Chips read "Archived", "Not archived" or "Archived: unknown", and a checkbox's checked side reads as its own label.
  - Search suggests Yes / No (/ Unknown) and writes the boolean value, chart clicks write `true` / `false`, and booleans stay groupable (lanes Yes / No).
  - `initialValues`, `setFilterValue` and `addFilter` take `true` / `false` / `"unknown"`. They also accept `"true"` / `"false"` / `"unknown"` and a one-element array of them, which is what a group-lane drill-in passes. `seedFilter` no longer skips a `false` seed.
- **Removed:** `filterTypeFor`. A filter's `type` is now its kind (`FilterValue["type"]` is `FilterKind`).
- **Renamed, no alias:** `source_kind` → `cell_shape` on attributes and filters, and the `FilterSourceKind` type → `FilterCellShape`. `OptionsFilter`'s `source_kind` prop is now `cell_shape`. `resolveFilterKind` throws on an attribute that has `source_kind` but no `cell_shape`, naming the field and asking for a ModelData regeneration, so un-regenerated metadata fails loudly instead of matching tag and colour lists as single values.
- New types `BooleanFilterValue` and `FilterCellShape`. `FilterDisplay` gains `"segmented"` and `"checkbox"`, and `FilterValue` gains `checkedValue`, `checkedLabel` and `nullable`.
