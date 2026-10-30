---
"@bcl32/data-utils": minor
"@bcl32/utils": minor
"@bcl32/forms": minor
"@bcl32/filters": minor
---

Numbers carry numbers, end to end, with one seam for unit conversion.

- **data-utils**: `parseNumber` (typed text → stored number; `""` is null, unreadable text is an error, a fraction on an `integer` field is refused), `formatEditable` and `toNumberValue` in `./numbers`. `UnitAdapter` gains optional `parse`, `formatEditable` and `step`. `ModelAttribute` declares `integer` (planned: schema_utils emits it next).
- **utils**: new `./NumberAdapter` — `NumberAdapterProvider`, `useNumberAdapter`, `NO_ADAPTER`, `AdapterResolver`. No provider means no change anywhere.
- **forms**: the number box emits `number | null`, never the browser's string, so request bodies carry `12` and `null` where they carried `"12"` and `""` (a cleared optional number now saves as NULL instead of a 422). Edit diffs against a normalised row (a Decimal retyped is no change). An emptied non-nullable number, unreadable text and a fraction on an integer field are named under the field and block the submit.
- **filters**: the number card's boxes hold draft text and commit on blur or Enter (clamp, swap an inverted pair, empty = no limit, unreadable text kept and marked, Escape reverts, arrow keys step); the step is a readable 1/2/5 × 10ⁿ; the +/− buttons leave the tab order; no echo write after an outside reset. Chips, summary, search and the add-filter picker read the app's `NumberAdapter`, and a typed search number is converted to the stored unit.
