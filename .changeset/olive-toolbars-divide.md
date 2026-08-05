---
"@bcl32/datatable": minor
---

feat(datatable): split the toolbar into a filter zone and a table-operations row

The toolbar was one wrapping flex row carrying up to thirteen elements — title,
count, filter search, Filters pill, N active chips, bulk edit, N custom actions,
delete, create, card select-all, card density, card sort, view toggle, columns —
six of which appear, disappear, or change width with the row selection. It mixed
*which rows am I looking at* with *what do I do with them*, and had reached the
point where the control order was dictated by layout-shift avoidance rather than
by meaning.

It is now two zones, extracted into a new `DataTableToolbar`:

- **Zone 1 — which rows.** Title, `(filteredCount/totalCount)`, the filter
  search / pill / active chips, and the expandable filter panel. The count heads
  this zone because it is the filters' output. The chip strip still scrolls
  sideways rather than wrapping, so adding a chip can't push the table down.
- **Zone 2 — what to do with them.** Bulk actions and view controls, on a
  divider directly above the rows they act on.

The selection-dependent buttons keep their leading position in zone 2 for the
original reason — measured across a selection change, the sort, view-toggle and
column controls now hold position to the pixel while three buttons appear beside
them. With no `filter` prop both zones collapse to a bare title above the
controls, close to the previous single-row look.

No consumer changes: `props.filter` was already an opaque
`{ toolbar, panel, filteredCount, totalCount }` object, so DataTable was only
ever choosing where to put those two nodes.

**Sorting is now available in the table layout.** `CardSortControl` becomes
`SortControl` (the old name stays as a deprecated alias) and renders in both
layouts. Cards never had headers to click; the table's headers *do* scroll out
of view, because `TableHeader`'s `sticky top-0` is defeated by the scroll wrapper
inside the `Table` primitive — so on a long table sorting was unreachable
without scrolling back to the top. The control and the header click handler both
drive TanStack's `sorting` state, so the dropdown, its direction button and the
header's ↑/↓ arrow stay consistent with no extra state.

Also extracted the column-label helpers (`columnLabelText`, `columnCardLabel`,
`CardMeta`, `CONTROL_COLUMN_IDS`) out of `CardView` into `ColumnLabels`, since
the sort control needs them and is no longer card-specific. `DataTable.tsx`
drops from 487 to 266 lines.
