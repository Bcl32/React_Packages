---
"@bcl32/utils": patch
---

Fix `ToggleGroup`'s selected state pairing mismatched colour tokens. The
`data-[state=on]` variant painted `bg-primary/90` but set
`text-accent-foreground` — two tokens never designed to sit together. It only
ever read correctly by accident, whenever a theme's `primary` happened to be
dark enough for near-white text.

Measured across the bundled themes, the selected pill was effectively invisible
in `green` (1.26:1), `yellow` (1.18:1) and `dark` (1.08:1), and failed WCAG AA
in every theme except `light-gold`. It now uses `text-primary-foreground`, the
token guaranteed to contrast with `primary` in every theme — e.g. `dark` goes
1.08:1 → 14.63:1, `green` 1.26 → 14.64, `purple` 2.01 → 6.25.

Visible anywhere `ToggleGroup` renders a selected option (range/interval/group-by
pills, segmented controls).
