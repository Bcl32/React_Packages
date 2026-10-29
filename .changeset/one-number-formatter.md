---
"@bcl32/data-utils": minor
"@bcl32/filters": minor
---

One number formatter. `@bcl32/data-utils/numbers` adds `formatNumber(value, attr?, opts?)` and `formatNumberRange(min, max, attr?, opts?)`: exact by default (at most 3 decimals, 3 significant digits below 1, thousands separators), `compact: true` for previews ("1.2M"), locale pinned to en-CA, and "—" for anything that isn't a finite number. A unit suffix and a `UnitAdapter` are in the options but off by default. The filter UI now prints numbers through it: the three private `formatBound` copies are gone, the chip and the summary show a set range exactly and alike (`12,012.346 – 1,234,567`; the summary's hyphen becomes an en dash), the Min/Max tooltips and typed search suggestions are exact, and the histogram's tick labels are compact.
