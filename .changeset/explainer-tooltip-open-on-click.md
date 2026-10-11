---
"@bcl32/utils": minor
---

feat: `ExplainerTooltip` takes `openOnClick`, so a tap can open it

Radix Tooltip opens on hover and keyboard focus and ignores touch by design, so
on a phone an explainer card could never be read. With `openOnClick` the card
also opens on a click: a tap or a keypress toggles it, a mouse click only opens
it (hovering already did), and tapping or clicking elsewhere closes it. It is
opt-in because a trigger that is itself an action button would otherwise do two
things on one click.
