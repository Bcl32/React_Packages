---
"@bcl32/themes": major
---

Rework the bundled theme presets: 10 themes become 9, and every dark theme is
brought onto one surface/text structure.

BREAKING: the `blue` and `dark-green` presets are **removed**. Any app that
persisted either name (localStorage `vite-ui-theme`) or referenced it directly
will no longer match a `[data-theme]` selector. `ThemeProvider` now guards
against this — an unrecognised stored name falls back to `defaultTheme` instead
of applying a `data-theme` no stylesheet defines (previously the palette
silently fell back to the `:root` default while `theme_type` still classified
the dead name, so light surfaces could render while `theme_type` reported
`"dark"`).

- **`dark-blue` rebuilt** as the merge of the old `blue` and `dark-blue`, taking
  the working half of each: `dark-blue`'s surface elevation (`blue` had `card`
  *darker* than `background`, so cards sank into the page) and `blue`'s
  differentiated tokens (`dark-blue` assigned one identical value to `muted`,
  `border`, `input`, `secondary`, `accent` and `sidebar-accent`, flattening
  every surface). Then pushed bluer — background saturation 70%→88%, hue
  206→212 — now that `dark` no longer competes.
- **`dark` retuned to neutral grey.** It was a blue slate whose background had a
  wider RGB channel spread (21) than `dark-blue`'s own (18); it is now
  achromatic (spread 2) with a near-white `primary`, so it reads as the neutral
  dark rather than a second blue theme.
- **New `red` preset**, following the `purple`/`dark-blue` structure. `primary`
  and `destructive` are separated on three axes — hue (8° vs 350°), lightness
  (62% vs 42%) and text colour (dark vs white) — so a primary action never
  reads as a destructive one.
- **`purple` fixed and brightened.** Its `card`/`popover` sat *below*
  `background` (11%/10% vs 13%), so cards sank; the ladder now rises
  9→11→13→14. Its text was also the dimmest of any dark theme and is lifted to
  match `dark-blue` (body 83%→95%, body contrast 11.3:1→16.5:1).

`dark`, `dark-blue` and `red` now pass every WCAG AA text pair, chart-vs-surface
and chart-separation check. `light`, `green`, `yellow`, `light-blue` and
`light-gold` are unchanged and retain pre-existing contrast issues.
