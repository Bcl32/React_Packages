---
"@bcl32/charts": minor
---

TimeSeriesChart: add `referenceAreas` and `referenceLines` overlay props for
annotating spans (e.g. print runs, downtime windows) and moments (e.g. deploys,
incidents), rendered behind the series.

Fix: series whose keys contain spaces or symbols (e.g. "Bambu H2D", "Silk
Multi-Color") now render with their configured colour. The `--color-<key>` CSS
variable is sanitised consistently where it is written (ChartStyle) and read
(the line/area strokes), so callers no longer need to slugify series keys.
