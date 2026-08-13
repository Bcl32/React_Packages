---
"@bcl32/themes": minor
---

Tune `warning` / `warning-foreground` per theme.

`warning` was the one token `themes.json` never varied — `hsl(38 92% 50%)` in all
nine themes, with the same `warning-foreground` beneath it, while `primary`,
`destructive` and `success` were all tuned per theme. That fixed mid-amber only
ever contrasted against dark surfaces: on the light themes `text-warning`
measured **1.97:1**, so the token could not be used for text and consumers fell
back to hardcoded `text-amber-700 dark:text-amber-300` pairs.

Each theme now gets its own value, following the same shape as `success`: the
light themes (`light`, `light-blue`, `light-gold`) take a dark amber around 32-34%
lightness with a near-white foreground, and the six dark themes take a 50%
lightness amber with a dark foreground. Hue is shifted per theme where the
default amber would have collided with that theme's own palette — `yellow` and
`light-gold` move toward orange to clear their amber/gold `primary`, and `red`
moves yellower to stay clear of both its `primary` and `destructive`.

Every theme now clears WCAG AA (4.5:1) on all three of: `text-warning` on
`background`, `text-warning` on a `bg-warning/10` tint, and `warning-foreground`
on solid `warning`. Worst case is 4.53:1 (`yellow`, on tint). Perceptual
separation from each theme's `primary`, `destructive` and `success` is ΔE ≥ 25.7
(worst: `yellow` vs `destructive`).

Consumers currently working around the old value with hardcoded amber pairs can
switch to `text-warning` / `bg-warning` and drop the `dark:` variant.
