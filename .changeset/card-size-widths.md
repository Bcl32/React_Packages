---
"@bcl32/datatable": minor
---

feat(datatable): a view can carry its own card size presets

`DataTableViewDef.cardSizeWidths` declares what Compact/Comfortable/Large mean
for that view, in px of minimum card width. Until now a bespoke `renderCard` had
one lever over its width — `cardMinWidth` — which pins a single value and
withdraws the toolbar's size control, on the grounds that a view naming its width
has answered the question the presets ask. A table answers it three times, so the
control stays.

The two built-in tables exist because a tile and a card want different numbers for
the same word (260/320/400 for five bands of text, 104/144/208 for one image and
one line); a picture-led card with a badge on it is a third shape and had no way
to say so. The size NAMES stay shared, so the stored preference and the toolbar
still carry across a view switch. A view that declares nothing falls back to its
variant's table and behaves exactly as before.
