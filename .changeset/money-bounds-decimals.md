---
"@bcl32/data-utils": minor
"@bcl32/utils": minor
"@bcl32/forms": minor
"@bcl32/filters": minor
---

Numbers know their bounds, their decimal places and whether they are money (R13).

- **data-utils**: `ModelAttribute` declares `min`, `max`, `min_exclusive`, `max_exclusive` and `decimals` (planned: schema_utils emits them next) and `format: "money"`. `parseNumber` refuses a value outside the bounds (`"range"`) and more digits than the field holds (`"decimals"`; money holds 2). `formatNumber` shows a column's `decimals`, prints money at its full places — as currency when the adapter carries one (`$1,249.50`) — and reads a plain decimal string (`"12.50"`) as its number instead of printing "—". New helpers: `numberDecimals`, `withinBounds`, `convertsUnits`, `currencySymbol`; `UnitAdapter` gains `currency`.
- **utils**: `NumberAdapterProvider` takes `currency` (one per app) and `adapterFor` becomes optional.
- **forms**: the reasons are named under the field ("Between 1 and 5", "More than $0.00", "2 decimal places at most") and block the submit; the number box takes native `min`/`max`, steps by the column's last place, and shows a money field's currency symbol. A currency-only adapter keeps the `number` box.
- **filters**: the number card never steps finer than a column's last decimal place; chips, summary and search print money as currency.
