# @bcl32/hooks

## 2.3.0

### Minor Changes

- ddc65e5: feat(hooks,filters): auto-enrich options_source URLs

  @bcl32/hooks gains useOptionsEnrichment, a hook that fetches every
  attr.options_source.url declared on a ModelData and injects the response
  as attr.options. @bcl32/filters' useEntityFilters now calls it internally
  and returns enrichedModelData, so consumers can drop manual enrichment
  calls and pass enrichedModelData straight to DataTable / forms.

## 2.2.8

### Patch Changes

- 4b98b89: feat(hooks,forms,datatable): structured ApiError system + cascade-delete conflict UX
- 45dcfbc: fix(forms,hooks,utils): standardize @tanstack/react-query as peerDep + externalize in tsup

## 2.2.7

### Patch Changes

- 94e4ba1: feat(hooks,forms): multipart auto-detect in mutations + file type in FormElement

## 2.2.6

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
