---
"@bcl32/datatable": minor
---

Table view styling pass: a 3px rounded frame on the scroll wrapper, body text back to text-sm (a stray `text-md` made tailwind-merge drop it), a tfoot only when a column defines `footer`, comfortable row spacing by default with a new `density="compact"` option (table or per view), a muted header row with sort buttons (⇅/↑/↓ icon, `aria-sort`), `meta.align` for headers, cells and footers, an `emptyMessage` prop, and the pointer cursor on rows when `rowClickFunction` is set.
