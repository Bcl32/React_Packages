---
"@bcl32/utils": minor
---

`Input` takes optional `prefix` and `suffix` slots, drawn inside the border. A
string or number is muted text whose id joins the input's `aria-describedby`
(after the caller's own); an element (an icon, a clear button, a unit select)
renders as given. With an affix, a wrapper box owns the border, background,
height, focus ring, disabled dimming and error colour, `className` styles that
box and the new `inputClassName` styles the `<input>`; the ref still resolves to
the `<input>`. A mouse-down on the box or a text affix focuses the input; one on
a button, select, link or field in a slot does not. `prefix` is omitted from
React's input attributes (where it is an RDFa string) to become the slot.

With no affix, `Input` renders the same bare `<input>` as before, with one added
class: `aria-[invalid=true]:border-destructive`, so an input marked
`aria-invalid` now draws a red border on both paths.
