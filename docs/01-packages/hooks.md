# @bcl32/hooks

> Shared React hooks and fetch utilities for interacting with FastAPI backends, wrapping TanStack Query with typed error handling, automatic JSON/multipart body detection, and ModelData options enrichment.

| | |
| --- | --- |
| **Package** | `@bcl32/hooks` |
| **Version** | `2.3.0` |
| **Tier** | `foundational` |
| **UI libraries** | none |

See the [package overview](../00-OVERVIEW.md) for how this package fits into the monorepo.

---

## Purpose

`@bcl32/hooks` is a **foundational** package: it sits low in the dependency graph and has no internal `@bcl32/*` dependencies, so most other React packages and apps can build on it. It centralizes the boilerplate of talking to the monorepo's FastAPI backends:

- A single structured error type (`ApiError`) thrown by every helper.
- A `fetch` wrapper (`apiFetch`) that normalizes three different server error-envelope shapes into that error type.
- A set of TanStack Query hooks for GET, mutation, file-based chart/data fetching, and `ModelData` options enrichment.
- Transparent JSON-vs-multipart body detection so the same mutation hook handles ordinary DTOs and file uploads.

---

## Install & Import

This package is consumed via the pnpm workspace protocol inside the monorepo:

```jsonc
// package.json
{
  "dependencies": {
    "@bcl32/hooks": "workspace:^2.3.0"
  }
}
```

It exposes a barrel entry plus per-module subpath exports (`@bcl32/hooks/apiFetch`, `@bcl32/hooks/useGetRequest`, etc.), but importing from the package root is the common case:

```ts
import {
  apiFetch,
  ApiError,
  isApiError,
  useGetRequest,
  useApiMutation,
  useDatabaseMutation,
  useBokehChart,
  useDataLoader,
  useOptionsEnrichment,
} from "@bcl32/hooks";
```

> **Required ancestor:** Every hook uses `useQuery` / `useMutation` / `useQueries` internally, so your component tree **must** be wrapped in a TanStack Query `<QueryClientProvider>`. Without it, the hooks throw at render time.

---

## Public Exports

| Name | Kind | Signature | Description |
| --- | --- | --- | --- |
| `ApiError` | type (class) | `class ApiError extends Error { readonly code: string; readonly status: number; readonly details: unknown; }` | Custom `Error` subclass thrown by all API helpers. Carries `code` (stable backend string, defaults to `'unknown_error'`), `status` (HTTP code), and `details` (polymorphic per-code payload, defaults to `null`). |
| `isApiError` | util | `(e: unknown) => e is ApiError` | Type guard for `ApiError`. Lets consumers branch on `mutation.error` without writing `instanceof` everywhere. |
| `apiFetch` | util | `(input: RequestInfo \| URL, opts?: RequestInit) => Promise<Response>` | `fetch` wrapper that throws `ApiError` on any non-OK response. Handles the new `{code, message, details}` envelope, legacy FastAPI `{detail: string}`, structured `{detail: {code, message}}`, and FastAPI 422 validation arrays (formatted as `'field: reason'`). |
| `useGetRequest` | hook | `<T = unknown>(url: string, options?: { queryKey?: string[]; enabled?: boolean; staleTime?: number; responseType?: 'json' \| 'text' }) => UseQueryResult<T, ApiError>` | TanStack Query wrapper for GET requests. `queryKey` defaults to `[url]`. Supports custom `queryKey`, `enabled` flag, `staleTime`, and `responseType`. |
| `useApiMutation` | hook | `<TData = unknown, TResponse = unknown>(url: string, options?: { method?: 'POST'\|'PUT'\|'PATCH'\|'DELETE'; invalidateKeys?: string[] }) => UseMutationResult<TResponse, ApiError, TData>` | Mutation hook where the payload is passed at `.mutate(data)` call time. Defaults to `POST`. Auto-detects `File`/`Blob` in the payload and switches to `multipart/form-data`. Optionally invalidates `invalidateKeys` on success. |
| `useDatabaseMutation` | hook | `<TData = unknown, TResponse = unknown>(url: string, formData: TData, key_to_invalidate: string[], method?: 'POST' \| 'PATCH') => UseMutationResult<TResponse, ApiError, void>` | Mutation hook where the payload is bound at **hook-call time** via a `useRef`; the caller invokes `.mutate()` with **no arguments**. Supports `POST`/`PATCH` and invalidates the single `key_to_invalidate` query key array on success. |
| `useBokehChart` | hook | `<T = BokehChartData>(url: string, file_url: string, graphOptions: GraphOptions, lazy_load_enabled?: boolean, lazy_load_value?: unknown) => UseQueryResult<T, ApiError>` | Fetches a Bokeh chart from an endpoint that takes `file_url` as a query param and `graphOptions` as the POST body. Lazy loading: when `lazy_load_enabled` is `true`, the query is disabled until `lazy_load_value` is truthy. |
| `BokehChartData` | type | `interface BokehChartData { [key: string]: unknown }` | Loose index-signature type for Bokeh chart responses. |
| `GraphOptions` | type | `interface GraphOptions { [key: string]: unknown }` | Loose index-signature type for Bokeh graph option payloads. |
| `useDataLoader` | hook | `<T = unknown>(url: string, file_url: string) => UseQueryResult<T, ApiError>` | Fetches arbitrary data from an endpoint that takes `file_url` as a query param (POSTs an empty JSON body). Simpler sibling to `useBokehChart` with no lazy-load or options support. |
| `useOptionsEnrichment` | hook | `<T extends { model_attributes: AttrLike[] }>(modelData: T) => { enrichedModelData: T; getLookup: (url: string) => unknown[] }` | Reads `options_source.url` fields from a `ModelData`'s `model_attributes`, fans out parallel `useQueries` fetches, and returns an enriched copy of `ModelData` with `options` arrays injected. Also exposes `getLookup(url)` for direct access to fetched arrays. |

> **Not exported:** `_buildRequestBody.ts` defines a `RequestBody` interface and a `buildRequestBody` function. These are used internally by both mutation hooks but are **not** re-exported from the barrel or the package's `exports` map — treat them as private.

---

## Dependencies

### Internal `@bcl32` dependencies

None. This is a leaf in the internal dependency graph, which is why it is classified `foundational`.

### Peer dependencies

| Peer | Range | Notes |
| --- | --- | --- |
| `react` | `^18.2.0` | |
| `react-dom` | `^18.2.0` | |
| `@tanstack/react-query` | `^5.18.1` | Required at runtime; consumers must provide a `QueryClientProvider`. |
| `dayjs` | `^1.11.10` | **Vestigial.** Declared as a peer dep but never imported anywhere in `src/` (see Caveats). |

### External dependencies

- `@tanstack/react-query` — the underlying query/mutation engine.

### UI libraries

None — this package ships no components or styling.

---

## Conventions & Patterns

These are contracts a consumer must follow to use the package correctly.

1. **A `QueryClientProvider` ancestor is mandatory.** All hooks rely on TanStack Query internals.

2. **Choose the right mutation hook for your form architecture:**
   - `useApiMutation` binds the payload at `.mutate(data)` time — pass data when the user submits.
   - `useDatabaseMutation` binds the payload at **hook-call time** (a `useRef` is updated on every render), and `.mutate()` is called with **no arguments**. This suits forms that keep the full DTO in component state.
   - Note the differing invalidation shapes: `useApiMutation` takes `invalidateKeys?: string[]` (optional), while `useDatabaseMutation` takes a required positional `key_to_invalidate: string[]`.

3. **File uploads are transparent.** Both mutation hooks pipe the payload through the internal `buildRequestBody`. If any top-level value is a `File`, a `Blob`, or an array of files, the body automatically becomes `multipart/form-data` (and the `Content-Type` header is dropped so the browser sets the boundary). Non-file fields are appended as strings, JSON-encoding objects/arrays. No opt-in flag is needed.

4. **`useBokehChart` and `useDataLoader` follow the `file_url` query-param convention.** Both POST to endpoints that accept `file_url` as a query parameter — a backend convention for file-based chart/data endpoints. `useBokehChart` sends `graphOptions` as the JSON body; `useDataLoader` sends an empty `{}` body.

5. **`useOptionsEnrichment` relies on the monorepo `ModelData` contract.** It expects `modelData.model_attributes: AttrLike[]`, where dynamic select options are declared via `options_source: { url: string }`. It de-duplicates the URLs, fetches them in parallel (30s `staleTime`), and injects each response array as `attr.options`. Backend endpoints are expected to return the canonical `{ value, label }[]` shape, so no client-side transformation is performed. This same contract is shared with the monorepo's form/filter packages (e.g. `useEntityFilters` uses it internally).

6. **Error handling is uniform.** Any non-OK response from any helper produces an `ApiError`. Branch on `error.status` / `error.code`, and use `isApiError(error)` as a type guard rather than `instanceof`.

---

## Caveats & Known Smells

These are documented issues to be aware of when consuming the package.

- **`useDataLoader` shares a cache namespace with `useBokehChart`.** `useDataLoader` uses `queryKey: ['useBokehChart', url, file_url]` (a copy-paste artifact in `src/useDataLoader.ts`). A `useDataLoader` query and a `useBokehChart` query for the same `url` + `file_url` will collide on the same cache entry, which can yield stale or mismatched data. Provide distinct URLs or avoid mixing the two for the same endpoint.

- **`dayjs` is a dead peer dependency.** It is listed in `package.json` `peerDependencies` but imported nowhere in `src/`. It can trigger unnecessary peer-resolution warnings and confuse consumers; do not assume the package needs dayjs.

- **`useBokehChart`'s lazy-load API is positional and error-prone.** The two trailing positional args (`lazy_load_enabled?: boolean`, `lazy_load_value?: unknown`) are easy to misuse — passing a non-boolean truthy value for `lazy_load_enabled` will not behave as an options object would. Pass an explicit boolean for `lazy_load_enabled`.

- **`useOptionsEnrichment` silently swallows fetch errors.** A failed options fetch resolves to `[]` with no observable error state. A broken options endpoint produces empty selects rather than a surfaced error — verify endpoints independently if a select renders empty.

- **`useApiMutation` and `useDatabaseMutation` are near-duplicate abstractions** over the same build-body + `apiFetch` + `res.json()` flow. The only meaningful differences are payload-binding time and the invalidation argument shape. They are not unified, so pick based on form architecture (see Conventions).

- **`RequestBody` / `buildRequestBody` are effectively private.** They are exported from `_buildRequestBody.ts` but not surfaced through the public `exports` map — do not depend on them from outside the package.

---

## Minimal Usage Example

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useGetRequest,
  useApiMutation,
  isApiError,
} from "@bcl32/hooks";

const queryClient = new QueryClient();

interface Filament {
  id: number;
  name: string;
}

function FilamentList() {
  // GET — queryKey defaults to ["/api/filaments"]
  const { data, isLoading, error } = useGetRequest<Filament[]>("/api/filaments");

  // Mutation — payload supplied at .mutate(data) time.
  // Invalidates the GET query on success.
  const create = useApiMutation<Partial<Filament>, Filament>("/api/filaments", {
    method: "POST",
    invalidateKeys: ["/api/filaments"],
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{isApiError(error) ? error.message : "Failed"}</p>;

  return (
    <>
      <ul>{data?.map((f) => <li key={f.id}>{f.name}</li>)}</ul>
      <button onClick={() => create.mutate({ name: "PLA Matte Black" })}>
        Add
      </button>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FilamentList />
    </QueryClientProvider>
  );
}
```

---

[← Back to package overview](../00-OVERVIEW.md)
