---
"@bcl32/datatable": minor
---

Per-section layout control for the sections view.

`BoardLane.cardSize` (and `TreeBoardNode.cardSize`, validated on the way through like `span`) pins one section's tile size, resolved against the active variant's preset table — so "large" is a large gallery tile in a photo view and a large card in a record view. It feeds the auto span as well as the card grid, because how wide a section gets is a question about how many of *its* tiles fit; resolving them separately is how a section ends up sized for a tile it is not drawing.

`sectionHeaderLeading` — the sections view's leading header slot, rendering before the collapse chevron. Its companion `sectionHeaderActions` is trailing furniture (a ⋯ menu, rename/delete), which is the wrong place for a reorder grip: a handle for the whole section belongs at the head of the row it drags, and in the trailing cluster it shifts sideways every time the count or aggregate changes width. Matches where the hand-curated section cards have always put theirs.
