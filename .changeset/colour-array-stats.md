---
"@bcl32/data-utils": patch
---

fix(data-utils): `CalculateFeatureStats` counts `colour_array` columns like `list`. They got no stats at all, so `@bcl32/filters` saw zero values and greyed colour filters out of "+ Add filter" as "no data" (and the bar's column fallback skipped them).
