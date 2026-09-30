---
"@bcl32/datatable": minor
---

`@bcl32/datatable/DragAffordances`: the shared look of a drag, still with no drag library. `DragGrip` (and its `strip` layout, the card's full-height right-edge handle, with `GRIP_GUTTER_CLASS` / `GRIP_GUTTER_CHILD_CLASS`), `DragPill`, the `pillAtCursor` overlay modifier, `DROP_ANIMATION`, and `DROP_HIGHLIGHT` / `REFUSE_HIGHLIGHT` — drop rings drawn as an `::after` overlay, because an inset box-shadow ring is painted under a tinted section's children and was invisible. The sections layout now honours `board.showEmptyNoneLane` for its top-level "No …" section.
