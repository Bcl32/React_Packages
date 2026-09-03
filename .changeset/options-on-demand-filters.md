---
"@bcl32/filters": minor
---

Options filters honour `primaryFilter`, and the panel gains `hiddenFields` / `panelLeading`

Options filters were the one kind that ignored `primaryFilter`: `dynamicFilterKind`
returned `null` for them, so `InitializeFilters` always mounted them eagerly and
`BuildFilterCatalog` never offered them in "+ Add filter". A page had no way to
choose its own defaults for an options filter — `filter: true` meant "always
rendered", and `filter: false` meant "not filterable at all".

They now resolve to an `"options"` kind and join the add-on-demand pool, so
pinned ones keep their slot and the rest move to the picker, exactly as numeric,
text and date filters already behave. `dynamicFilterKind` mirrors `CreateFilter`'s
type resolution so the catalog and the filter it creates cannot disagree.

**This changes default panels.** Any options filter not flagged `primaryFilter`
now starts in "+ Add filter" rather than on screen. Pass a narrowed
`dynamicFilters` array to opt a page back out.

Also adds `hiddenFields` to `useDataTableFilterBar`: suppress the card for a
filter whose UI lives elsewhere on the page, without disturbing matching, chips
or keyboard targeting.
