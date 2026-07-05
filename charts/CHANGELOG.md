# @bcl32/charts

## 3.1.1

### Patch Changes

- 46167fd: TimeSeriesChart: apply `className` to the ChartContainer itself instead of an outer wrapper. Previously the container was always `aspect-video`, so consumer heights (e.g. `h-[280px]`) sized only the wrapper while the chart SVG rendered at 16:9 of the full width and overflowed the card and the content below it.

## 3.1.0

### Minor Changes

- dd612fd: Add three concrete, context-free chart components (data in via props, events
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

## 3.0.1

### Patch Changes

- Updated dependencies [1c61ce6]
  - @bcl32/hooks@4.0.0

## 3.0.0

### Major Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/utils@2.5.0

## 2.1.6

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions

## 2.1.5

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/utils@2.3.5
  - @bcl32/hooks@2.2.6
