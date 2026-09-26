---
"@bcl32/filters": major
"@bcl32/datatable": major
---

Filter matching moves into one per-kind table, unused exports are removed, and the filter text, chart clicks and seeding get tests.

- **Removed** (no app imports them): `GroupFilters`, the `GroupedFilters` type, `AllFilters`, and `FilterValue.timespan_begin` from `@bcl32/filters`; `StatsTable` from `@bcl32/datatable`. The `./AllFilters`, `./GroupFilters`, `./InitializeFilters`, `./ProcessDataset`, `./FilterContext` and `./StatsTable` subpaths are gone, and `InitializeFilters`, `ProcessDataset` and the raw `FilterContext` are internal: use `useEntityFilters`, `FilterProvider` and `useFilterContext`.
- `ApplyFilters`, `GetActiveFilters`, `emptyFor` and `addFilter`'s opening value now read one internal table of per-kind rules (`src/predicates.ts`), keyed by `FilterKind` so booleans already have a slot. Matching rules are unchanged except:
  - A string filter with no `rule` now matches as `contains`. It used to count as active (showing a chip) while matching every row.
  - `GetActiveFilters` returns the filter objects themselves. It no longer copies a moved datetime start with `timespan_begin: "filter"`, which nothing read.
- Chip text, summary text, the bar/pie click logic and `addFilter` seeding moved into small internal modules with characterization tests; their output is unchanged. The number filter's typed input has its first component test (jsdom).
