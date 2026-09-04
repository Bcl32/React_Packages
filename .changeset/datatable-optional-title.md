---
"@bcl32/datatable": minor
---

`title` is optional, and a toolbar with no title and no filter toolbar skips its title row

For a page that puts its title and filter bar above the table in a `@bcl32/filters` `PageFilterBar`: pass the table neither `title` nor `filter`, and the toolbar renders only its controls row — no empty 36px heading row, no rule under it. Every caller that passes a title is unchanged.
