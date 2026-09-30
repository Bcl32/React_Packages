---
"@bcl32/datatable": minor
---

Board lanes can take drops. `renderLaneWrapper` (table prop and per-view) hands each lane's element to the page, the pair of `renderCardWrapper`; `BoardConfig.showEmptyNoneLane` keeps an empty "No …" lane on screen during a drag; and `@bcl32/datatable/BoardDrop`'s `laneDropWrite(attr, lane)` decides from the grouping attribute's metadata what a drop writes, or returns the sentence explaining why it writes nothing. The package still ships no drag library and writes nothing on a drop.
