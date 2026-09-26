---
"@bcl32/filters": minor
---

`useEntityFilters` gains an `initialValues` option and a `setFilterValue` function, so pages stop writing filter value shapes by hand.

- `initialValues: { [field]: value }` sets opening values (a URL drill-through, a page default such as "Archived: No") once, when the filters are first built. There's no need to wait for the filters in an effect, and a field whose filter is created on demand is added pinned.
- `setFilterValue(key, value)` changes a filter, or creates it pinned when it doesn't exist yet. An empty value clears it, and clearing a filter that isn't there does nothing.
- Both take the same value shapes as `addFilter`'s `initial` and go through the same per-kind checks. For example, an empty datetime start keeps the data's earliest date instead of becoming an invalid date that matches no rows.
