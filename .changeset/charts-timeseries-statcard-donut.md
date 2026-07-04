---
"@bcl32/charts": minor
---

Add three concrete, context-free chart components (data in via props, events
out via callbacks — no FilterContext coupling):

- `TimeSeriesChart` — multi-series line/area chart over wide-format rows, with
  optional stacking, `<Brush>` range scrubbing, ReferenceArea drag-select
  box-zoom (index-slice based, works on the category bucket axis) plus a Reset
  control, `markedPoints` anomaly overlays rendered as themed ReferenceDots
  (`warning`/`danger`/`info` → semantic tokens), `syncId` crosshair grouping,
  and caller-supplied axis tick formatters.
- `StatCard` — KPI tile on `@bcl32/utils` Card primitives with unit, icon slot,
  direction-aware delta colouring (`success`/`destructive` respecting
  `positiveIsGood`), an axis-less sparkline, and a footer slot.
- `DonutChart` — standardized donut on `ChartContainer`/`PieChart` with
  per-slice colours from `ChartConfig` (falling back to the `chart-1..5`
  cycle), optional centre label, and an `onSliceClick` callback.

New subpath exports: `@bcl32/charts/TimeSeriesChart`, `/StatCard`, `/DonutChart`.
`recharts` remains a peerDependency.
