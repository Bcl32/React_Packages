---
"@bcl32/filters": minor
---

feat(filters): custom sub-filters. A `CustomSubFilterSpec` hangs an app-drawn control under one value of an options filter — the app supplies the component, the predicate and the chip text (`CustomFilterDef`), the package gives it the sub-filter's scoping, ordering, chip and reset. `useEntityFilters`' `subFilters` takes a list of specs per parent field, so one value can carry a kind group and a custom control side by side; several sub-filters under one value AND together. New filter kind `custom`. A custom card may take the right half of the panel (`width: "half"`). `FilterHeader` is exported so a custom card can wear the same chrome.
