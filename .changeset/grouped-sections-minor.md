---
"@bcl32/datatable": minor
"@bcl32/filters": minor
---

Grouped sections layout and view-preset support.

datatable: new "sections" base view — groups packed into a six-track grid sized
by population, nested grouping via `BoardConfig.subGroups`, per-group collapse
with `defaultCollapsed` (top level only), per-lane pinned `span` honored while
expanded; `GroupSections` module (span tiers, tier→class maps,
`GroupSectionHeader`) shared with the curated section pages; `GroupControl`
rebuilt as a chip+menu with a "then by" nesting picker; `BoardConfig` gains
`laneAggregate` roll-ups; DataTable gains controlled `sorting`/`onSortingChange`
and `onColumnVisibilityChange` (columns become controlled when the callback is
supplied; per-view re-seed skipped in controlled mode).

filters: `GroupVisualResolver` now receives the group's rows as a fourth
argument (additive) so visuals can summarise group contents — e.g. swatch
clusters; `useEntityGroups` accumulates per-group row references.
