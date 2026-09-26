---
"@bcl32/data-utils": patch
---

CalculateFeatureStats no longer counts empty number cells as 0.

`Number(null)` and `Number("")` are both 0, so a column with blanks got a
slider minimum of 0 and an inflated first histogram bin. `null` and `""` are
now dropped before conversion. First test in the new root vitest harness
(`pnpm test`).
