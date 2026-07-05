---
"@bcl32/charts": patch
---

TimeSeriesChart: apply `className` to the ChartContainer itself instead of an outer wrapper. Previously the container was always `aspect-video`, so consumer heights (e.g. `h-[280px]`) sized only the wrapper while the chart SVG rendered at 16:9 of the full width and overflowed the card and the content below it.
