---
"@bcl32/themes": patch
---

Retune the light themes' card backdrops — they were below the perceptual
just-noticeable-difference threshold.

`surface-1 … surface-8` on `light`, `light-blue` and `light-gold` now carry a
×2.2 saturation gain (28/35/35 → 62/77/77). Values only; no API change, and the
six dark themes are byte-identical.

HSL saturation is not perceptually uniform across lightness: near white the
gamut narrows, so the same nominal `S` buys far less actual colour. Measured,
the light backdrops had a mean chroma of 5.5 and a ΔE of **1.5** between
adjacent members — below the ~2.3 JND, i.e. not reliably distinguishable, which
is how it looked in an app. The weakest dark theme (`dark`, S20) clears that on
nominal values alone at chroma 9.6 / ΔE 4.2. The gain brings light to chroma
12.1 / ΔE 3.3.

A multiplier rather than a raised floor, because a floor flattens all three
light themes onto one number and discards the "saturation comes from the theme's
own accent" rule.

Contrast against `card-foreground` is unaffected in practice — worst of all 72
values is 8.7:1, still comfortably past AA.
