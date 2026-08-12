---
"@bcl32/datatable": minor
---

Editing from every layout, not just the table.

New `RowEditButton` — the edit dialog `ColumnGenerator`'s `EditEntry` cell used
to own privately, now a component in its own right (`EditCell` is a caller of
it, so there is one implementation). `rowEditNode(row, view)` resolves a row's
edit control: the table's own `EditEntry` cell when it has one, otherwise a
synthesised `RowEditButton`, otherwise null — so a table that already draws a
pencil column never grows a second one.

`RenderCardContext` gains `edit`, so a bespoke `renderCard` can place the edit
button the way it already places `select` and `quickActions`. The stock layouts
place it themselves: the default card's footer, the gallery tile's hover
overlay beside the ⋯ menu, and the detail pane's header. The board and sections
layouts draw the same `RowCard` and inherit it.

DataTable gains `rowEditEnabled` (defaults to on wherever
`ModelData.update_api_url` is set) and `onEditSuccess`. The four card-shaped
layouts and `DetailPaneView` take the same three props
(`rowEditEnabled` / `query_invalidation` / `onEditSuccess`).

`toolbarStyle="quiet"` now draws bulk Edit and bulk Delete. Both toolbars share
one `BulkEditButton` / `BulkDeleteButton` pair rather than the standard
toolbar's inline copies. The quiet bar is what every layout below full width
draws, so leaving them out meant ticking checkboxes anywhere but the Table
shape gave you nothing to do with the selection.

`GalleryTile` takes an optional pre-partitioned `cells` (and the new `edit`
node) so the densest layout doesn't walk each row's cells twice per tile.
