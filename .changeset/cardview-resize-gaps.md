---
"@bcl32/datatable": patch
---

Fix gaps left in the virtualized card grid after changing card size

Changing the card size left every rendered row positioned on the old pitch —
70px cards on a 220px stride, a 150px gap under each row — until the page was
reloaded or the chunk was scrolled out of view and back.

`CardView` called `virtualizer.measure()` when the column count changed, which
only *clears* the size cache; the re-measure is supposed to arrive through the
`measureElement` ref, and React does not re-run a ref for an element that stayed
mounted. So the on-screen chunks kept their `estimateSize` guess for positioning
while actually being their real height. Calling `measureElement` by hand
straight afterwards does not help either, and fails silently: it looks the
element's index up in `measurementsCache`, which `measure()` has just emptied
and which is only rebuilt during the next render.

The card size is now part of each chunk's key, so a size change remounts the
chunks, the refs re-run, and each measures itself against a cache that is
already rebuilt. It also covers the case the old effect missed entirely — a size
change that leaves the column count unchanged (compact to comfortable at many
widths), where the heights still change but nothing re-measured at all.
