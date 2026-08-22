---
"@bcl32/datatable": minor
---

`CompletionCell` — the tick-a-row-off checkbox, with the optimism built in

The one affordance the package didn't ship. Any table of things that get *done*
— a checklist, a punch list, a set of steps — wants a checkbox on the row, and
until now every consumer hand-rolled it along with the three details that are
easy to get wrong:

- **Optimism.** A checkbox that waits for its round trip reads as a click that
  missed, so the user clicks again and un-does it. The cell shows the value it
  is writing while the write is in flight, and hands the row back the moment it
  settles — including when it fails. Holding the pending value until `checked`
  catches up, which is the obvious rule, sticks forever on a failed write whose
  consumer reverts the row: that value never equals the pending one.
- **Not starting a drag.** In any card layout with whole-card drag, the
  pointer-down that ticks the box also arms the drag sensor, so the tick becomes
  a four-pixel drag and never fires. `data-no-drag` — the opt-out those sensors
  look for — is applied by the cell rather than remembered by each caller.
- **Not triggering the row.** With `expandOnRowClick`, ticking would also expand.

Ships as `CompletionCell` (the interaction) and `completionColumn()` (the same
thing as a `ColumnDef`, for tables that draw columns rather than cards), from
`@bcl32/datatable` and `@bcl32/datatable/CompletionCell`.

**What it deliberately does not own: the write.** `onToggle` is the seam, and it
stays the seam. A consumer whose rows live in the react-query cache and one that
keeps a local mirror — because it also drag-reorders, and a drag has to move rows
before its own round trip — need different write paths. A cell that reached into
the query cache would be correct for the first and actively wrong for the second:
it would heal the cache while the mirror the page actually renders stayed stale.
That is exactly Home Helper's Checklist, which is where this cell was built and
lived app-local until the interaction settled.

Purely additive: no existing export changes.
