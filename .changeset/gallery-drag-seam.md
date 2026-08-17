---
"@bcl32/datatable": minor
---

The drag seam and the packed-photo prerequisites: `renderCardWrapper` hands a consumer the card's outer wrapper in every card-shaped view (cards, gallery, board, sections) so dnd-kit can own the positioned element; a view def's new `variant` pins the gallery tile under any base (`{ base: "sections", variant: "gallery" }` packs photo tiles into group sections, with gallery size presets); SectionsView's grids flow dense so later sections back-fill holes instead of stranding tracks.
