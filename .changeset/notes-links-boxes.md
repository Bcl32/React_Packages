---
"@bcl32/forms": minor
---

RelationCollectionField draws a collection as two boxes — Links (rows with a URL, a compact list with thumbnails or an app-supplied `linkIcon`) and Notes (Markdown cards that fold when tall) — and edits one item at a time in place instead of switching the whole section into a form. Paste a web address to add a link (its preview image is fetched when the collection has thumbnails), delete with an Undo toast, and drag or Alt+↑/↓ to reorder within a box. A collection whose sub-fields include `section` also folds each box into named sections: add, rename, ungroup, add an item into one, and drag items or whole sections; who folded what is kept per viewer in localStorage. No new dependencies.
