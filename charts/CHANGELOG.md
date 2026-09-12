# @bcl32/charts

## 3.2.1

### Patch Changes

- 31ef177: Every package declares `sideEffects: false`

  A bundler's central question about an unused export is "may I delete the module
  it came from?", and without this field the answer has to be no: a module that
  _might_ do something at import time cannot be dropped just because nothing reads
  a symbol from it. Tree-shaking then works only as far as Rollup's own analysis
  can prove purity on its own, which is well but not reliably, and not at all
  under bundlers that lean on the field instead.

  The promise is safe here, and it was checked rather than assumed. Across all
  eleven packages there are **no bare side-effect imports** (`import "./x.css"`),
  **no top-level writes to `window`, `document` or `globalThis`**, and **no CSS
  files at all** — styling is Tailwind classes, so nothing depends on import order
  to paint. That last one is the usual reason a package cannot make this promise,
  and it does not apply: there is no stylesheet here to be stripped.

  Module-level state that some modules do hold (a `Map` built at module scope) is
  not a blocking side effect — such a module is still only retained when something
  imports from it, which is exactly the behaviour wanted.

  What it is worth today was measured rather than guessed, and it is small:
  Home Helper's whole bundle came out 2,562 bytes lighter with the field than
  without it (3,647,634 against 3,650,196, same container, same inputs, both
  green) — 0.07%. Rollup was already proving most of this on its own.

  So this is insurance, not an optimisation. It guarantees the behaviour instead
  of leaving it to a bundler's analysis, and it matters more for anything that
  leans on the field rather than deriving the answer, where the current absence
  means no tree-shaking across this boundary at all. The related measurement, for
  scale: importing `RowActions` alone costs 58 KB more through the barrel than
  through its subpath, while in a file that already imports `DataTable` the two
  are byte-identical.

- Updated dependencies [31ef177]
  - @bcl32/hooks@4.2.1
  - @bcl32/utils@2.10.3

## 3.2.0

### Minor Changes

- 48db3f7: TimeSeriesChart: add `referenceAreas` and `referenceLines` overlay props for
  annotating spans (e.g. print runs, downtime windows) and moments (e.g. deploys,
  incidents), rendered behind the series.

  Fix: series whose keys contain spaces or symbols (e.g. "Bambu H2D", "Silk
  Multi-Color") now render with their configured colour. The `--color-<key>` CSS
  variable is sanitised consistently where it is written (ChartStyle) and read
  (the line/area strokes), so callers no longer need to slugify series keys.

## 3.1.2

### Patch Changes

- 47a1f90: fix(charts): ChartTooltipContent renders exact-zero values

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
