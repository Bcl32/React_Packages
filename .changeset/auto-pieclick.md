---
"@bcl32/filters": patch
---

fix(filters): PieChartFilter slice clicks now filter — chart-level onClick never receives activePayload for pies; the handler moved onto the Pie itself (legend clicks already worked)
