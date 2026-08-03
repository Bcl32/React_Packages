---
"@bcl32/filters": minor
---

Add a schema-driven filter search bar: type a value ("PLA"), a field
("weight"), or an expression ("weight > 200", "material: petg") and apply the
suggested filter directly from the toolbar.

Three pure pieces in the new `FilterSearch` module, mirroring the
catalog/create/apply split the dynamic filters use:

- `BuildFilterSearchIndex(model_attributes, datasetStats)` — one entry per
  filterable attribute with its kind, title, optional `searchAliases`
  (passed through from the schema attribute when present), and the
  enumerable value pool: enriched schema options, list/colour option stats,
  or distinct string values from the grouped counts. Fields with nothing to
  filter on (missing stats, degenerate ranges, zero distinct values) are
  left out, matching the picker's "unavailable" philosophy.
- `SearchFilterIndex(index, query, { filters, canAdd })` — ranked
  `FilterSuggestion[]`. Value-first: a bare "PLA" resolves to
  `BaseMaterial: PLA` (exact value match on an options field) above
  `Name: …PLA…` substring hits, with row counts as the ranking tiebreak and
  the suggestion detail. A small grammar handles `field > n`, `field < n`,
  `field: value`, `field = value` and `field 10-20` ranges; operators are
  constrained by the field's kind so parses stay unambiguous.
- `ApplyFilterSuggestion(suggestion, ctx)` — mounted filters update through
  `change_filters` (options values union into the selection, number ranges
  merge with current bounds); unmounted fields are instantiated via
  `add_filter` seeded with the parsed value.

New `FilterSearchBar` component (input + keyboard-navigable suggestion
dropdown) renders in `useDataTableFilterBar`'s toolbar when the new optional
`searchIndex` prop is supplied; applying a suggestion opens the filter panel
so the result is immediately visible. `useEntityFilters` now returns
`searchIndex`.

Autosuggest layers on top of the ranked dropdown:

- Focusing the empty box lists every filterable field with its live data
  shape ("Filter by BaseMaterial — 5 values", "Filter by Weight G — 12 – 511"),
  so the vocabulary is discoverable without typing.
- A partial expression ("material:", "weight >") enumerates that field's
  values ranked by row count; range kinds show their bounds to type against.
- When the highlighted suggestion completes the typed text, the remainder
  renders as inline ghost text — Tab (or → at the end of the input) accepts
  the completion without applying, Enter applies. Suggestions carry the
  canonical query as `completion` for this.

`FilterInitialValue` gains `string[]`: `addFilter(field, ["PLA"])` seeds an
options-typed instance's selection, which is how search applies a value to a
not-yet-mounted boolean/options filter.
