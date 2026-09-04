---
"@bcl32/filters": minor
---

`useDataTableFilterBar` can run without its fold, and `PageFilterBar` lays it out at the top of a page

The bar has only ever lived inside a `DataTable` toolbar, where it must stay small: chips scroll sideways, the cards fold away behind a "Filters" toggle. A page whose filters govern more than the table — a colour wheel, a map, facet rows — wants the bar above all of it, always open. Until now the only way was House-Hunter's: render `toolbar` and `panel` at page level and live with the toggle.

`useDataTableFilterBar` gains `collapsible` and `size` (defaults `true` and `"default"`, so every existing caller is unchanged). `size: "large"` scales the search box, picker, toggle and chips a step up, and gives the chips a fill, ring and weight so they read as the page's headline state; `FilterSearchBar` and `AddFilterPicker` take the same `size` prop. With `false` the toggle is gone, the cards are always on screen, an empty card set renders nothing rather than the "pick an attribute" hint, and keyboard targeting's `reveal` scrolls the bar into view instead of unfolding it.

The hook's result now also carries each piece on its own — `search`, `addPicker`, `toggle`, `chips`, `activeCount` — alongside the composed `toolbar`/`panel`, so a page can put the search in one row and the chips in another.

`PageFilterBar` is the layout those pieces were split for: one wrapping row of `title` "(shown/total)" · `leading` · search · add · chips · `trailing`, the cards beneath. The title and count move up into the bar, and the table beneath is given no `title` and no `filter` (see `@bcl32/datatable`, which makes `title` optional in the same release). Print-Tracker's Filaments page is the first consumer.

Also drops the 3.9.0 changelog's mention of `panelLeading`, which was announced but never existed.
