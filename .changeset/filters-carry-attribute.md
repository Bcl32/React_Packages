---
"@bcl32/filters": minor
---

Filters, catalog entries and search entries now carry the model attribute they were built from, and one function decides every attribute's filter kind.

- `FilterValue.attr` (optional), `FilterCatalogEntry.attr` and `SearchFieldEntry.attr` hold a reference to the attribute, so keys `CreateFilter` doesn't copy (`unit`, `searchAliases`, anything added later) reach the filter UI without another copy list. When fetched options arrive, `useEntityFilters` now swaps in the enriched attribute along with `options`, so `filter.attr.options` and `filter.options` agree.
- New `resolveFilterKind`, `filterTypeFor` and `emptyFor`, plus the `FilterKind` type. `CreateFilter`, `BuildFilterCatalog` and `BuildFilterSearchIndex` all resolve kinds through `resolveFilterKind`. `dynamicFilterKind` remains as the same function; `DynamicFilterKind` and `SearchFieldKind` are aliases of `FilterKind`.
- `CreateFilter` resolves an invalid declared `filter_type` (such as `"select"`) to an options filter, matching what the picker already showed, instead of building a filter no control understood.
- Fix: a number, text, datetime or options attribute with no `filter_empty` now builds like a generated one instead of throwing (B3). Security-Benchmarks' hand-written judge-score filters could not be added from the picker.
- Fix: datetime bounds follow the resolved filter type (B9). A date field declared as a datetime filter is bounded by its data, and a datetime field declared as a string filter no longer throws.
