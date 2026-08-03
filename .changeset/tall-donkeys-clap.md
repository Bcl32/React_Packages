---
"@bcl32/datatable": patch
---

Fix the row-actions Edit dialog leaving the whole page unclickable.

`RowActions` rendered its "Edit Entry" dialog as a child of the row's
`DropdownMenuContent`, keeping the menu mounted-but-`hidden` underneath while
the dialog was open, then closing both together. Both are modal Radix layers,
and each records `document.body`'s `pointer-events` on mount to restore on
unmount. Unmounting in the same commit, the dialog restored the `none` the menu
had set, so `body { pointer-events: none }` survived with no layer left to clear
it — every click on the page was dead until a reload, which reads as the page
having frozen. Closing the dialog by any route (Update, ✕, Escape) triggered it.

The dialog now renders as a sibling of the menu rather than inside it, and the
menu is non-modal, so it never writes that style and the dialog is the only
layer managing it. Focus still returns to the row's "…" trigger on close.
