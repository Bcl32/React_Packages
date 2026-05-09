---
"@bcl32/hooks": minor
"@bcl32/filters": minor
---

feat(hooks,filters): auto-enrich options_source URLs

@bcl32/hooks gains useOptionsEnrichment, a hook that fetches every
attr.options_source.url declared on a ModelData and injects the response
as attr.options. @bcl32/filters' useEntityFilters now calls it internally
and returns enrichedModelData, so consumers can drop manual enrichment
calls and pass enrichedModelData straight to DataTable / forms.
