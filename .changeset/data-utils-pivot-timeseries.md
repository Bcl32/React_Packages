---
"@bcl32/data-utils": minor
---

Add `pivotTimeSeries`, a pure helper that bridges the grouped time-series
backend contract (`Array<{ group, points: Array<{ bucket, value }> }>`) to the
wide row format the chart components consume, returning `{ data, seriesKeys }`.
A `null` group collapses to the `"value"` key; rows are keyed and sorted by
bucket string (no date math). Exposed at `@bcl32/data-utils/pivotTimeSeries`.
