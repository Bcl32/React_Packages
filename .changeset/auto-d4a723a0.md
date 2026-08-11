---
"@bcl32/filters": minor
"@bcl32/themes": minor
---

Self-labelling filter charts on a shared chart palette.

Filter charts draw their own header instead of relying on the consuming app to
label them from outside. Histogram, PieChartFilter and BarChartFilter take an
optional `title`, falling back to a humanized field name, so a chart is
self-describing wherever it is dropped. `ChartMetadata.title?: string` is new —
additive, hence minor. Single-series charts drop their now-redundant legend.

Themes: the chart palette is reworked across the theme set so `--chart-1..n`
read as one deliberate ramp per theme rather than unrelated accents. No presets
added or removed, so nothing breaks — but every consuming app's chart colours
change on upgrade.

Consumers that hand-rolled a label above each chart (e.g. the app-side
`entry.type !== "bar"` header block) should drop it and pass `title` through the
chart metadata instead, or the label will render twice.
