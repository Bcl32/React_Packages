---
"@bcl32/datatable": minor
---

feat(datatable): Outline — row trees through the existing layouts. `./Outline` adds `buildRowTree`, `outlineRoots`, `outlineLines`, `rollupTree` (deep per-row figures: own / below / deep) and the tree walks; `./OutlineCard` is the card that draws one top-level row with its tree beneath (fold chevrons, indentation, fading of unmatched lines, click isolation). Pure additions, no change to existing exports.

The toolbar's layout picker is now a View dropdown (trigger shows the current view's icon and label; the menu lists every view) instead of a row of icon buttons, opening on a quick mouse hover (120 ms) as well as a click, and the built-in view labels are plain nouns: Table, Cards, Gallery, Detail, Board, Sections.

Rows take Shift-click (range from the anchor, in drawn order, additive) and Ctrl/Cmd-click (toggle one) selection in every layout, on the card, the table row or the checkbox (`./RowSelectGesture`). An Outline card's top line is highlighted when selected and no line carries a checkbox.
