---
"@bcl32/datatable": minor
---

feat(datatable): card quick actions, keyboard navigation, scroll hand-off and motion

Four follow-ups to the card view, all of which apply to every DataTable without
consumer changes.

**Quick actions.** A `ToolbarAction` that sets `card` now renders twice from one
declaration: the toolbar's bulk button over the selection, and a per-card button
in the card footer, invoked with just that row's id. `cardLabel`,
`cardVisible(row)` and `cardDisabled(row)` tune the card affordance, and
`onCardClick(row)` covers handlers that want the row rather than its id. The
card button deliberately ignores `visible` / `disabled` — those are near-always
derived from the selection, which says nothing about the single row a card
stands for — which also makes `{ visible: false, card: "full" }` the way to
declare an action that only ever made sense per row. `ToolbarAction` is now
generic in the row type, and `toolbarActions` is resolved once per render
instead of being called again for the card grid.

**Keyboard navigation.** The grid is a roving-tabindex `role="grid"`: arrows
move a focus ring in two dimensions using the measured column count, Home/End
jump to the ends, Space toggles selection, Enter activates. Keys are handled
only when the event target is a card root, so a keystroke inside a card's own
controls still belongs to that control. Focus requests survive across commits,
since under virtualization the card being moved to usually isn't rendered yet.
The pre-focus tab stop tracks the first *rendered* card rather than index 0,
which would otherwise leave a scrolled grid with no tab stop at all.

**Scroll position across a view toggle.** Both layouts now expose a
`ViewScrollHandle`; `DataTable` reads the topmost visible row index off the
outgoing layout and the incoming one restores it on mount, the card grid
converting row index to chunk index via its column count. Both layouts stamp
`data-row-index` per row and `data-row-scope` on the element that owns them, so
a DataTable nested in an expansion panel can't be mistaken for the outer one's
rows. This removes the one UX regression the card view had shipped with.

**Motion** (framer-motion, already a `@bcl32/utils` dependency). A 120 ms
cross-fade on the view toggle, and card enter/exit plus reflow as the row set
changes. Both are off under `prefers-reduced-motion` or `animate={false}`, and
card enter/exit is additionally off while `virtualized`, where cards mount and
unmount on scroll and the transitions would fire on scrolling rather than on the
data changing.

**`renderCard` gains a context argument.** Building the first real bespoke card
showed the escape hatch forced consumers to re-implement selection and the
row-actions menu from scratch. `renderCard(row, ctx)` now hands back
`ctx.quickActions`, `ctx.select` and `ctx.actions` ready-rendered, keeping it a
layout override rather than a fork of the card feature. A card's media slot also
collapses instead of reserving padding when the row has no thumbnail.
