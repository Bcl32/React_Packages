# @bcl32/filters

## 3.4.2

### Patch Changes

- 3e499d2: feat: focus the filter search bar with a "/" hotkey

## 3.4.1

### Patch Changes

- c36fa7d: feat(datatable,filters): add a board view that fuses the card grid with entity groups

## 3.4.0

### Minor Changes

- 4623304: feat(filters): compact the filter panel, and pin the name filter first

  **Density.** The panel spent most of its height on chrome rather than controls: a
  24px line of body text above every filter, three nested padded wrappers around
  the grid, and a control set sized for a form rather than a toolbar. Measured on a
  six-filter page at 1600px, the panel went from 276px to 170px and the cards from
  104px tall / 322px wide to 45–72px / 252px.

  - New internal `FilterHeader` gives all four filter types one caption row
    (`text-[11px]` uppercase, 16px) in place of three different label sizes and two
    different ✕ paddings. It carries the any/all and equals/contains rule pill, an
    `actions` slot, and the remove ✕.
  - Controls step down together: comboboxes and text inputs to `h-8`/`text-xs`,
    toggle buttons to `h-6`, colour swatches to 24px, number inputs to `h-6` with a
    `h-1` slider track and a 28px histogram strip.
  - `TimeFilter` drops its From/To captions for an arrow between the two triggers,
    and its Shortcuts/Reset buttons become icon-only — neither label fit beside a
    long field title in a narrower column.
  - The panel's `pt-2` / `py-2` / `pb-1` wrapper stack collapses to one `py-1.5`,
    and `p-2` comes off the number and time cards, so every filter type now sits on
    the same rhythm.
  - The grid goes from `1/2/3/4` at `gap-2` to `1/2/3/4/5` at `gap-x-3 gap-y-1.5`.
    `AllFilters` gets a `1/2/3` grid of its own — it was stacking every filter in a
    single column.

  **`prettyOptionLabel`** (internal) formats enum-backed options for the
  combobox/dropdown displays and the active-filter summary chip, which previously
  disagreed with what the toggle buttons rendered. It rewrites _only_ pure
  lowercase snake tokens, so `in_progress` → `In progress` while `eSUN` and
  `Black PLA` are untouched.

  **Ordering.** `OrderFilters` now puts a filter on the `name` field at the head of
  the pinned block, ahead of any declared `filterOrder`. Doing it here rather than
  by annotating each entity covers pages whose pinned set isn't declared at all but
  seeded from the table's columns, and entities added later that nobody remembers
  to annotate. Consumers that deliberately ordered something else first will see
  `name` move ahead of it.

  Also fixes a latent bug in the same comparator: two pinned filters with no
  declared `filterOrder` compared as `Infinity - Infinity` = `NaN`, which the
  engine only read as "equal" by accident.

  **`@bcl32/utils`** — `Combobox` gains `size?: "default" | "sm"`. `sm` shrinks the
  input, the selected-value chips and the option rows together; sizing only the
  input left the chips towering over it.

### Patch Changes

- Updated dependencies [4623304]
  - @bcl32/utils@2.9.0

## 3.3.1

### Patch Changes

- 3d778c0: feat(utils,filters): scale up the colour picker for colour filters
- Updated dependencies [3d778c0]
  - @bcl32/utils@2.8.1

## 3.3.0

### Minor Changes

- 16ccd13: Reorganize the time filter and its shortcuts dialog.

  **`TimeFilter`** no longer imposes its own `xl:grid-cols-3` layout. It nested
  inside the filter bar's page grid with no gutters, which crushed the two date
  pickers and the action buttons into a single narrow column. It now renders as a
  single-column card matching the sibling filters' `p-2 space-y-1.5` rhythm, with
  the label and actions on one row and From/To pickers aligned on a two-column
  grid below. Trigger labels use an abbreviated `MMM D 'YY, h:mma` format so they
  fit the column.

  **`TimeEditDialog`** moves off the `big` dialog size (`max-w-screen-2xl` and
  full viewport height) to `medium`, and is grouped into three sections: the
  selected span, quick ranges, and fine tuning. Spacing comes from `space-y`/`gap`
  utilities instead of bare `<br />` tags, and the hardcoded `w-[32rem]` on the
  step selector is gone.

  - Adds **Past 15 minutes**, **Past 1 hour**, and **Past 6 hours** shortcuts
    alongside the existing day/week/month/year ranges.
  - The span summary now prints only non-zero units — a 15 minute window read
    "0 Years 0 Months 0 Days 0 Hours 15 Minutes" before.
  - Warns when the end time precedes the start time, which previously rendered
    silently as a negative span.
  - The step-size selector no longer sets `bg-muted-foreground` (a foreground
    token) as a background.

  **`RadioButton`** gains optional `groupName` and `id` props. It previously
  hardcoded `name="option"` and derived `id` from the label, so several groups on
  one page formed a single radio group and shared duplicate DOM ids — with more
  than one time filter in the bar, changing the step size in one cleared it in the
  others. Both props default to the previous behaviour. Checked styling now uses
  `bg-primary`/`text-primary-foreground` instead of `bg-primary/50`/`text-white`,
  which was low-contrast in light themes.

- 2934754: Add a schema-driven filter search bar: type a value ("PLA"), a field
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

- 2934754: Add user-created ("dynamic") filter instances, and collapse the filter bar's
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
    count folds into the nearest drawn bar and that bar's _selection_ range
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

### Patch Changes

- Updated dependencies [16ccd13]
- Updated dependencies [4fc115b]
  - @bcl32/utils@2.8.0
  - @bcl32/hooks@4.0.1

## 3.2.6

### Patch Changes

- 1ef7569: feat(filters): numeric-array range filter (any-axis min/max slider)
- Updated dependencies [1ef7569]
  - @bcl32/data-utils@2.2.3

## 3.2.5

### Patch Changes

- 55871b7: fix(filters): humanize panel filter labels and honour attribute title

## 3.2.4

### Patch Changes

- 8c076cf: perf(filters): skip redundant unfiltered-stats pass on filter change
- Updated dependencies [c91423d]
  - @bcl32/utils@2.7.0

## 3.2.3

### Patch Changes

- e82db94: fix(filters): buildChartConfig cycles chart colour tokens beyond 5 keys (--chart-6+ is undefined and rendered invisible slices)
- e82db94: fix(filters): PieChartFilter slice clicks now filter — chart-level onClick never receives activePayload for pies; the handler moved onto the Pie itself (legend clicks already worked)
- Updated dependencies [47a1f90]
  - @bcl32/charts@3.1.2

## 3.2.2

### Patch Changes

- 963cf6b: fix(data-utils,filters): kill phantom "Invalid Date" datetime filter chip on all-null columns
- Updated dependencies [963cf6b]
  - @bcl32/data-utils@2.2.2

## 3.2.1

### Patch Changes

- Updated dependencies [1c61ce6]
  - @bcl32/hooks@4.0.0
  - @bcl32/charts@3.0.1

## 3.2.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/charts@3.0.0
  - @bcl32/utils@2.5.0

## 3.1.2

### Patch Changes

- 3ab5612: feat(filters): add EntityGroupCards for grouping entities by attribute
- dd2b0ef: fix(filters): drop unused React import in EntityGroupCards

## 3.1.1

### Patch Changes

- 9e43685: feat(filters): group colour-swatch filter by submaterial
- Updated dependencies [2c5779f]
- Updated dependencies [dd1cf42]
- Updated dependencies [aee527f]
  - @bcl32/utils@2.4.4
  - @bcl32/data-utils@2.1.10

## 3.1.0

### Minor Changes

- ddc65e5: feat(hooks,filters): auto-enrich options_source URLs

  @bcl32/hooks gains useOptionsEnrichment, a hook that fetches every
  attr.options_source.url declared on a ModelData and injects the response
  as attr.options. @bcl32/filters' useEntityFilters now calls it internally
  and returns enrichedModelData, so consumers can drop manual enrichment
  calls and pass enrichedModelData straight to DataTable / forms.

### Patch Changes

- Updated dependencies [ddc65e5]
  - @bcl32/hooks@2.3.0

## 3.0.6

### Patch Changes

- bcafd31: chore(datatable,filters): move Radix UI deps to peerDependencies

## 3.0.4

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions
- Updated dependencies [c1d7749]
  - @bcl32/charts@2.1.6

## 3.0.3

### Patch Changes

- c15c157: fix(filters): default options value_key to "value"

## 3.0.2

### Patch Changes

- ae8e1c3: fix(filters): guard optional filterData in toggleRule closures
- a0181af: refactor(filters): replace ToggleGroup with inline button for equals/contains rule in DebouncedTextFilter

  Matches the inline any/all toggle styling introduced for list filters — a single compact button that flips between "Contains" and "Equals" sits next to the label, replacing the wider ToggleGroup row.

- d7eb9d1: fix(filters): make string filter matching case-insensitive for both equals and contains rules

## 2.5.0

### Minor Changes

- d1091d4: Add DataTable filter toolbar integration and compact toolbar style

  DataTable: refactor toolbar to compact flex layout with filter slot, toolbar actions, selection-aware bulk edit/delete buttons, and count display.
  Filters: add DataTableFilterBar component with tabbed filter panel, active filter chips, and primary filter support.

### Patch Changes

- a03b98e: feat(filters): add toggle filter type and main tab for primary filters

## 2.4.2

### Patch Changes

- 8ff52b8: refactor(filters,forms): replace MUI Autocomplete with Combobox
- Updated dependencies [e6a1b83]
- Updated dependencies [fa21c39]
  - @bcl32/utils@2.3.8

## 2.4.1

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover
- Updated dependencies [acd0e2c]
  - @bcl32/utils@2.3.7
  - @bcl32/data-utils@2.1.8

## 2.4.0

### Minor Changes

- bf5f36e: FilterProvider and useEntityFilters hook, percentage-based column widths, and hardened numeric parsing

### Patch Changes

- Updated dependencies [bf5f36e]
- Updated dependencies [19d9b2a]
  - @bcl32/data-utils@2.1.7
  - @bcl32/utils@2.3.6

## 2.3.1

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5
  - @bcl32/data-utils@2.1.6
  - @bcl32/charts@2.1.5
