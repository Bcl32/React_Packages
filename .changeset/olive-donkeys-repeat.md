---
"@bcl32/hooks": patch
---

Stop `useOptionsEnrichment` from returning a new `enrichedModelData` identity on
every render.

`dataByUrl` was memoized on `[sources, queries]`, but `useQueries` returns a
fresh array each render by design, so the memo never hit. That gave
`enrichedModelData` a new identity every render, which invalidated every
consumer memo chained off it — most importantly the `columns` memo in each
page's table-data hook, forcing TanStack Table to rebuild its column and row
models on any unrelated state change.

The cache is now keyed on the individual `data` references, which react-query
keeps stable across refetches that return equal payloads.

Measured on Print-Tracker's Print Jobs page (1303 rows), switching filter-bar
tabs: ~150–210 ms per switch before, ~43–56 ms after.
