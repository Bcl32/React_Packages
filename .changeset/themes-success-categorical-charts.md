---
"@bcl32/themes": minor
---

Add `success` / `success-foreground` tokens to all 10 themes (green hues
tuned per theme, WCAG-checked foreground pairing) and rework
`chart-1`..`chart-5` into categorical five-hue palettes in the 9 themes
that previously shipped monochrome same-hue ramps (`purple` already had a
categorical set and is unchanged). Each palette anchors chart-1 near the
theme's primary hue and is validated for CVD separation and >=3:1
contrast against the theme's background and card surfaces.
