---
"@bcl32/filters": minor
---

Add user-created ("dynamic") filter instances, and collapse the filter bar's
Main/Filters/Numerical/Time tabs into a single section.

Numeric, date, text and boolean filters are no longer instantiated at mount —
the user adds them from one "+ Add filter" picker. Across Print-Tracker's
entities that was 117 text, ~90 numeric, ~55 date and 10 boolean filters
rendered up front; Part alone declared 16 numeric + 16 text + 3 date + 4
boolean. What remains on screen by default is just the `primaryFilter`-flagged
ones plus the options filters.

Once every kind is add-on-demand the per-kind tabs are mostly empty containers
for a picker, so `useDataTableFilterBar` now renders one panel behind a single
"Filters" toggle (with an active-filter count), ordered by the new
`OrderFilters`: pinned filters by `filterOrder`, then options filters, then
user-added instances in the order they were added — across kinds, so a date and
a number added back-to-back stay adjacent. `AllFilters` loses its tabs the same
way. `GroupFilters` is still exported and unchanged.

Booleans are catalogued as their own kind ("Flags" in the picker) even though
they filter as options: their Yes/No list is fixed by the schema rather than
derived from the data, which is what makes them collapsible. Data-derived
options filters — tag/system combos, colour swatches — still render eagerly for
exactly the opposite reason.

**Core change — filter identity is no longer the column name.** `FilterValue`
gains an optional `field`, and everything that reads row data resolves the
column as `filter.field ?? key`. Schema-declared filters leave `field` unset, so
their behaviour is byte-identical; user-added instances get a synthetic key
(`weight_g#2`) and point at the real column through `field`. That's what makes
several independent ranges over one attribute possible.

**Lazy creation.** The per-attribute construction inside `InitializeFilters` is
extracted to a pure `CreateFilter(attribute, datasetStats)`, so eager init and
runtime `addFilter` share one code path. Bounds are free — `CalculateFeatureStats`
already computes min/max for every attribute, filtered or not.

**New API** (all additive and optional, so existing consumers are unaffected):

- `useDataTableFilterBar` accepts the data table's `columns` /
  `columnVisibility` / `hasPrimaryFilters`. When an entity declares **no**
  `primaryFilter` at all (Vendors, Printers, …) the panel used to open empty;
  it now pins the table's own visible columns instead — they're already a
  curated, ordered view of the entity — capped at 6, skipping columns with no
  data. Entities that declare primaries are untouched.

  `hasPrimaryFilters` is read from the model rather than from `filters`, which
  is briefly empty after the catalog is ready but before the declared filters
  are built — long enough for the fallback to fire on an entity that never
  needed it.

- `addFilter(field, initial, { pinned: true })` creates a filter that sorts and
  behaves like a declared primary (resets rather than removes).

- **Numeric filters draw their distribution.** `DebouncedNumberFilter` renders a
  histogram directly above its range slider, over the same domain, so each bar
  sits above the values it counts. Bars outside the selected range fade;
  clicking a bar snaps the range to that bin, and dragging across bars selects
  the span between them (in either direction, applied live as you sweep so the
  fade doubles as the preview). Bars are positioned by
  percentage rather than flexed because d3's bins aren't equal width; heights
  are log-scaled because a linear scale collapses these skewed columns into one
  spike. d3 rounds bin edges outwards, so the outermost bins spill past the
  slider's domain; only whole bins are drawn (keeping every bar the same width)
  and the leftover shows as a gap at the edge of the strip. A spilled bin's
  count folds into the nearest drawn bar and that bar's *selection* range
  stretches to the domain edge, so nothing is lost and clicking it still filters
  to everything it represents — drawn extent and selected extent are tracked
  separately. The bins ride along on the filter as `FilterValue.histogram`, attached
  by `CreateFilter` from the full-dataset stats — a domain that shifted while
  you dragged would be unusable, so it deliberately doesn't track the filtered
  set. Filters with no usable bins keep the previous single-row layout.

- `useEntityFilters` returns `addFilter`, `removeFilter`, `filterCatalog` and
  `hasPrimaryFilters`, and takes `{ dynamicFilters }` — `true` for every kind,
  or an array such as `["number", "datetime"]` to narrow it.

  **`dynamicFilters` defaults to OFF.** Opting in without also passing
  `addFilter` / `removeFilter` / `filterCatalog` into the filter UI would leave
  those filters uncreatable and invisible, so existing consumers keep their
  eager behaviour until they wire the picker through. They still get the
  single-section layout.
- `FilterProvider` / `FilterContextValue` accept `addFilter`, `removeFilter`,
  `filterCatalog`.
- `useDataTableFilterBar` accepts the same three; supply them to turn the
  Numerical tab into the picker, omit them and it renders exactly as before.
- New `AddFilterPicker` — a searchable popover whose rows show each attribute's
  live data shape (numeric bounds, an earliest–latest date span, or a distinct
  value count for text), and mark the ones already in use.

  Attributes with nothing to filter on are collapsed behind a `N unavailable`
  footer toggle instead of being listed greyed out — measured against live data
  they are **29% of every declared filter** (mostly columns that are never
  populated, plus entities with no rows yet), and they crowded out the usable
  ones. A search that matches only unavailable attributes reveals them anyway,
  so "no matches" never lies about a column that exists but is empty.

  Rows also describe their data rather than just its extent: numeric rows get a
  log-scaled sparkline of the column's distribution, text rows the most common
  values (each clipped, so one long URL can't crowd the others out). Both come
  from stats `CalculateFeatureStats` already computed — the `bins` array in
  particular was being thrown away.

- `BuildFilterCatalog` returns `[]` until dataset stats exist. Entries built
  from model attributes alone advertise attributes that `CreateFilter` will
  refuse to build (it needs stats for the bounds), so an empty catalog is both
  honest and a usable "ready" signal for callers.
- New `BuildFilterCatalog`, `CreateFilter`, `catalogForKind`, `OrderFilters`
  and the `FilterCatalogEntry` / `FilterInitialValue` types.
- `TimeFilter`, `DebouncedTextFilter` and `OptionsFilter` take an optional
  `onRemove` (TimeFilter's existing Reset stays — widening an instance back to
  full range shouldn't destroy the slot).

Policy: range filters flagged `primaryFilter` keep their always-visible slot;
every other numeric or datetime filter becomes add-on-demand. A ✕ on a
user-added instance (chip, filter card, or the summary's button) removes the
slot rather than resetting it.

Also fixes a latent hook-order violation in `DebouncedNumberFilter` and
`DebouncedTextFilter` — the debounce `useEffect` sat after an early return in
both, which would have thrown "rendered fewer hooks than expected" the moment a
mounted filter disappeared from context.
