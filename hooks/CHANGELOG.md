# @bcl32/hooks

## 4.2.1

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

## 4.2.0

### Minor Changes

- 7e8ce97: `useApiMutation` accepts hook-level `onError` / `onSuccess` / `meta`. Caller `onSuccess` runs after `invalidateKeys` invalidation; hook-level `onError` doubles as the opt-out signal for an app-wide `MutationCache.onError` default toast (global handlers can't see mutate-time callbacks), with `meta: { silenceErrorToast: true }` as the handler-less opt-out.

## 4.1.0

### Minor Changes

- 7f8a9f5: Error-contract hardening: `apiFetch` now normalises no-response failures into typed errors (`ApiError{status: 0, code: "network_error"}` for offline/DNS/TLS, `code: "request_timeout"` for an elapsed new `timeoutMs` option, caller aborts re-thrown untouched); `useGetRequest` applies a 30s default GET timeout (`timeoutMs` option, `null` disables); new `queryDefaults` subpath exports `sharedQueryRetry` / `defaultShouldRetry` / `defaultRetryDelay` — no retry on 4xx or timeout, 2× capped backoff on 5xx/network.

## 4.0.1

### Patch Changes

- 4fc115b: Stop `useOptionsEnrichment` from returning a new `enrichedModelData` identity on
  every render.

  `dataByUrl` was memoized on `[sources, queries]`, but `useQueries` returns a
  fresh array each render by design, so the memo never hit. That gave
  `enrichedModelData` a new identity every render, which invalidated every
  consumer memo chained off it — most importantly the `columns` memo in each
  page's table-data hook, forcing TanStack Table to rebuild its column and row
  models on any unrelated state change.

  The cache is now keyed on the individual `data` references, which react-query
  keeps stable across refetches that return equal payloads.

  Measured on Print-Tracker's Print Jobs page (1303 rows), switching filter-bar
  tabs: ~150–210 ms per switch before, ~43–56 ms after.

## 4.0.0

### Major Changes

- 1c61ce6: Remove `useBokehChart` (dead since `BokehLineChart` was removed from
  `@bcl32/charts` in 3.0.0). `useBokehChart`, `BokehChartData`, and
  `GraphOptions` are no longer exported from `@bcl32/hooks`.

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
