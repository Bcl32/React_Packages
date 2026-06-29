# Security Benchmarks (`security-benchmarks-react`) — UI / Architecture Audit

**App path:** `/home/brandon/Projects/web-app-monorepo/Security-Benchmarks/security-benchmarks-react`
**Package name:** `security-benchmarks-react` (`package.json` line 2)
**Type:** Standalone React SPA (not part of the pnpm workspace)

A front end for orchestrating and reviewing LLM security benchmark runs (e.g. Garak attack suites). It lets a user create a *run* by pairing target model endpoints with benchmarks, then drills into per-task results via a heatmap matrix, metrics tables, and a streamed records table. It is a thin React layer over a FastAPI backend (proxied to the `security-benchmarks-api` service), built on the monorepo's shared `@bcl32/*` UI and data packages.

See also:

- [`../02-INTEROP.md`](../02-INTEROP.md) — how apps consume shared `@bcl32/*` packages.
- [`../06-REFACTOR-PROPOSALS.md`](../06-REFACTOR-PROPOSALS.md) — cross-app refactor backlog.

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| UI framework | React 18 (`^18.2.0`, resolved `18.3.1`) |
| Build tool | Vite 5 (`^5.0.8`) + `@vitejs/plugin-react` (`^4.2.1`) |
| Data fetching | TanStack Query v5 (`^5.18.1`, resolved `5.100.9`) + react-query-devtools |
| Routing | React Router v6 (`react-router-dom` `^6.30.0`) |
| Styling | Tailwind CSS v3 (`^3.4.1`) + `tw-colors` (`^3.3.2`) + `@tailwindcss/forms` |
| Component libraries | MUI v5 (`@mui/material` `^5.15.7`, resolved `5.18.0`) + `@mui/icons-material`; Radix UI (dialog, dropdown-menu, select, checkbox, slider, tooltip, label, separator, slot, focus-scope, toggle-group); `@headlessui/react` (pinned `2.1.1`) |
| Toasts | Sonner v2 (`^2.0.7`) |
| Icons | `lucide-react` (`^0.344.0`) |
| Dates | `dayjs` (`^1.11.10`) |
| Prod serving | Nginx (static server) |
| Packaging | Docker (multi-stage build) |

The HTML root (`index.html`) injects runtime config from a container-generated `config.js` (`<script src="config.js">`) so the API base URL and `APP_ENV` can be set at container start without rebuilding the bundle.

---

## 2. Shared `@bcl32/*` Package Usage

| Package | Version (`package.json`) | How it is used |
| --- | --- | --- |
| `@bcl32/utils` | `^2.4.4` | `Sidebar`/`SidebarProvider` (`Layout.jsx`), `Button`, `Card`, `Dialog`, `Input`, `Label`, `Select`, `cn` — subpath imports across components and pages. |
| `@bcl32/datatable` | `^2.7.2` | `DataTable` in `RunsListPage`, `RunDetailPage`, `BenchmarksPage`, `ModelEndpointsPage`, and `RecordsDataTable`; `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` primitives in `MetricsTable`. |
| `@bcl32/filters` | `^3.1.2` | `useEntityFilters` + `useDataTableFilterBar` for client-side filter state and filter-bar rendering in `RunsListPage` and `RecordsDataTable`. |
| `@bcl32/hooks` | `^2.3.0` | `apiFetch` and `ApiError`/`isApiError` in `src/api.js`; `useGetRequest` in `useTasks.js` and `useRegistry.js`; `useApiMutation` in `useRuns.js` and `useRegistry.js`. |
| `@bcl32/navigation` | `^2.1.7` | `NavigationProvider` wraps `SidebarProvider` in `Layout.jsx`; `NavigationBreadcrumb` and `useNavigation` consumed in `RunDetailPage` and `TaskDetailPage` for breadcrumb state. |
| `@bcl32/charts` | `^2.1.6` | **Declared but never imported** anywhere in `src/`. |
| `@bcl32/forms` | `^2.6.0` | **Declared but never imported** anywhere in `src/`. |
| `@bcl32/themes` | `^2.1.5` | **Declared but never imported**; theme tokens are inlined directly in `tailwind.config.js` instead. |
| `@bcl32/data-utils` | `^2.1.10` | **Declared but never imported** anywhere in `src/`. |

### `src/api.js` — the shared-hooks integration point

`src/api.js` is the single seam onto `@bcl32/hooks`. It wraps the shared `apiFetch` (prefixing with `apiUrl()`, JSON-stringifying bodies, parsing JSON/text/`204`) and re-exports the shared typed error so call sites have one error shape:

```js
import { apiFetch as sharedApiFetch } from "@bcl32/hooks/apiFetch";
export { ApiError, isApiError } from "@bcl32/hooks/ApiError";
```

Reads flow through `useGetRequest`; mutations through `useApiMutation`; both throw the same `ApiError` (`.code` / `.status` / `.details` / `.message`).

---

## 3. Bespoke UI Components & Hooks

| Component / Hook | Path | Role |
| --- | --- | --- |
| `Layout` | `src/Layout.jsx` | App shell: a `collapsible="none"` Sidebar (title, 3 nav items — Runs / Benchmarks / Model Endpoints — and an optional `env:` footer) plus `<Outlet />`. Wraps `NavigationProvider` + `SidebarProvider`. |
| `RunMatrix` | `src/components/RunMatrix.jsx` | 2-D grid of (target model × benchmark) cells, heatmap-tinted by `attack_success_rate` (green = safe → red = unsafe). Cells are clickable to navigate to `TaskDetailPage`, surface a secondary judge metric, and highlight heuristic-vs-judge disagreement. |
| `StatusBadge` | `src/components/StatusBadge.jsx` | Pill badge mapping run/task status strings (`queued`, `provisioning`, `running`, `completed`, `partial`, `failed`, `cancelled`) to Tailwind color classes. |
| `RecordsDataTable` | `src/components/RecordsDataTable.jsx` | Client-side table for benchmark records streamed via NDJSON. Fetches all pages via `loadAllRecords`, enriches rows with `judge_agreement`, conditionally shows judge columns, and integrates `useEntityFilters` + `DataTable`. |
| `MetricsTable` | `src/components/MetricsTable.jsx` | Read-only table (using `@bcl32/datatable` `Table` primitives) showing task metric name / value / n / unit rows, with the primary metric bolded. |
| `BenchmarkConfigEditor` | `src/components/BenchmarkConfigEditor.jsx` | Per-benchmark JSON `<textarea>` inside a `<details>` disclosure, with hardcoded Garak preset configs (smoke test, quick injection, DAN 6.0, Goodside attacks) and inline JSON-validity feedback. |
| `ModelJudgeSelector` | `src/components/ModelJudgeSelector.jsx` | Sub-form for selecting target model endpoints (toggle buttons) and an optional LLM judge endpoint (native `<select>`) when creating a run. |
| `RunCreateDialog` | `src/components/RunCreateDialog.jsx` | Modal dialog wiring `ModelJudgeSelector`, benchmark toggle buttons, and `BenchmarkConfigEditor` together for the New Run workflow. |
| `useRunCreateForm` | `src/hooks/useRunCreateForm.js` | Form-state hook for run creation: model/benchmark selection `Set`s, per-benchmark JSON config with validation, judge selection, and a submit handler that POSTs tasks. |
| `useRegistry` | `src/hooks/useRegistry.js` | Factory producing CRUD hook bundles (`useList` / `useCreate` / `useUpdate` / `useDelete`) for registry resources (benchmarks, model-endpoints) on top of `@bcl32/hooks`. |

### Records streaming

`src/api.js` exposes a generator `streamRecords(taskId, …)` that reads the response body as a stream and yields one parsed object per NDJSON line, plus `loadAllRecords` which drains it in batches of 500 until a short batch ends the loop. This is the data source for `RecordsDataTable`.

---

## 4. Theming Wiring

Theming is configured entirely in `tailwind.config.js`, which calls `tw-colors`' `createThemes()` inline with a full **light** and **dark** palette (`background`, `foreground`, `muted`, `primary`, `secondary`, `accent`, `destructive`, `warning`, `chart-1..5`, and the `sidebar-*` tokens). The `produceCssVariable` option emits `--token-name` CSS variables:

```js
const { createThemes } = require("tw-colors");
// ...
createThemes(
  { light: { /* ... */ }, dark: { /* ... */ } },
  { produceCssVariable: (colorName) => `--${colorName}` }
)
```

The HTML root is hardcoded to the light theme: `index.html` line 2 is `<html lang="en" class="light">`, and `<body>` carries `class="bg-background text-foreground"`. There is **no** `ThemeProvider`, `ThemeToggle`, or `useTheme` anywhere in the app — the theme is always light with no runtime toggle, so the `dark` block in the config is unreachable. `@bcl32/themes` is a declared dependency but is never imported; the token set is duplicated locally rather than consumed from the shared package.

---

## 5. Inconsistencies / Drift vs the Shared System

| # | Issue | Evidence / location | Severity |
| --- | --- | --- | --- |
| 1 | `@bcl32/themes` declared but unused; the full `tw-colors` token palette is duplicated inline rather than sourced from the shared theme package. | `package.json` (`@bcl32/themes ^2.1.5`); `tailwind.config.js` lines 14–91 (`createThemes()` with hardcoded HSL); no `src/` import. | Medium |
| 2 | `pnpm-lock.yaml` specifiers are stale for **6 of 9** `@bcl32` packages, so installed versions are older than what `package.json` requests — `pnpm install` has not been re-run since the bumps. | `pnpm-lock.yaml` lines 14–37 vs `package.json` lines 16–24: data-utils (`^2.1.9` vs `^2.1.10`), datatable (`^2.6.4` vs `^2.7.2`), filters (`^3.1.0` vs `^3.1.2`), forms (`^2.5.9` vs `^2.6.0`), navigation (`^2.1.6` vs `^2.1.7`), utils (`^2.4.2` vs `^2.4.4`). | Medium |
| 3 | Nine Radix UI primitives are installed directly even though `@bcl32/utils` already re-exports Radix-backed components the app imports — a parallel install that can drift in version. | `package.json` lines 30–48 (`@radix-ui/react-checkbox` … `@radix-ui/react-tooltip`); `@bcl32/utils` provides Radix-backed `Button`, `Dialog`, `Input`, `Label`, `Select`. | Medium |
| 4 | Three `@bcl32` packages declared but never imported, bloating `node_modules` and the lockfile. | `package.json` lines 16–18 (`@bcl32/charts ^2.1.6`, `@bcl32/data-utils ^2.1.10`, `@bcl32/forms ^2.6.0`); zero `src/` imports. | Low |
| 5 | No dark-mode toggle is wired — the dark palette can never be activated at runtime. | `index.html` line 2 (`<html lang="en" class="light">`); no toggle/class-switching code in `src/`. | Low |
| 6 | `@headlessui/react` is pinned to an exact version while every other peer-dep uses caret ranges, blocking patch/minor pickup on re-install. | `package.json` line 27: `"@headlessui/react": "2.1.1"`. | Low |

### Versioning convention (for context)

The app uses **caret ranges** (`^x.y.z`) against the GitHub Packages registry (`npm.pkg.github.com`), which is the correct convention for apps **not** in the pnpm workspace. `Security-Benchmarks/security-benchmarks-react` is absent from `pnpm-workspace.yaml` (which lists only `react-packages/*`), so the `workspace:^` protocol is unavailable — matching the documented pattern for non-workspace apps such as `Base-POC/image-poc-react`. The local `.npmrc` mirrors the root `.npmrc` `@bcl32`-scope registry redirect but **lacks** the root's `link-workspace-packages` and `prefer-workspace-packages` directives. (Issue #2 above is the actionable drift; this paragraph is the intended baseline.)

---

## 6. Reinvented Wheels

| Duplicated logic | Location(s) | What to adopt instead |
| --- | --- | --- |
| `formatDate` helper (`new Date(iso).toLocaleString()`) copy-pasted across two pages. | `src/pages/RunsListPage.jsx:12–18`, `src/pages/ModelEndpointsPage.jsx:7–13` | `dayjs` (already in the dependency tree as a `@bcl32` peer dep) for consistent locale-aware formatting. |
| `formatDuration` (seconds → `Xh Xm Xs`) duplicated identically. | `src/pages/RunsListPage.jsx:29–34`, `src/pages/RunDetailPage.jsx:48–53` | A shared utility — `@bcl32/data-utils` is already declared and could host a duration helper. |

---

## 7. UI Issues

- **No runtime dark mode.** The dark palette exists in `tailwind.config.js` but the HTML root is hardcoded `class="light"` with no toggle, so users cannot switch.
- **`RunCreateDialog` has no visible close button.** It relies solely on the Radix `Dialog` `onOpenChange` (overlay click / Escape), which may be unexpected for users unfamiliar with Radix conventions.
- **`RecordsDataTable` loads eagerly with no per-batch progress.** `loadAllRecords` fetches up to N batches of 500 inside a `useEffect`; for large task outputs data only appears after the final batch resolves, so the loading state can mislead.
- **`BenchmarkConfigEditor` uses a raw `<textarea>` for JSON** with no syntax highlighting, line numbers, or schema validation beyond a generic "invalid JSON" message. The row count is derived from newline count but capped at 12, which can truncate large configs.
- **No explicit empty state for filtered-to-zero.** `RunsListPage` / `RunDetailPage` render an empty `DataTable` body with no message explaining an active filter.
- **`StatusBadge` hardcodes `bg-emerald-600` for `completed`** (`StatusBadge.jsx` line 5) — a raw Tailwind color outside the theme palette, so it won't respect a future theme change or honor dark mode.

---

## 8. Prioritized Refactor Opportunities

| Priority | Opportunity | Rationale | Effort |
| --- | --- | --- | --- |
| 1 | **Run `pnpm install` to sync the lockfile with `package.json`.** | Six `@bcl32` specifiers in `pnpm-lock.yaml` lag `package.json`; the installed build doesn't reflect intended versions. A reinstall regenerates the lockfile. | S |
| 2 | **Remove unused `@bcl32` packages** (`charts`, `forms`, `data-utils`, `themes`). | Declared but never imported; removing them trims the dependency tree, speeds installs/Docker builds, and cuts version-drift noise. | S |
| 3 | **Extract shared `formatDate` / `formatDuration`** into a module (or use `dayjs`). | Eliminates copy-pasted helpers across pages; future formatting changes become a single edit. | S |
| 4 | **Wire a dark-mode toggle or delete the dead dark theme.** | The full dark palette is unreachable behind a hardcoded `class="light"`. Either add a `ThemeToggle` from `@bcl32/utils/ThemeToggle` or remove the dark block. | S |
| 5 | **Drop direct Radix UI installs and rely on `@bcl32/utils`.** | Nine Radix packages are installed directly while `@bcl32/utils` already exposes the Radix-backed primitives the app imports; removing them eliminates duplicate installs and version skew. | M |
| 6 | **Add the app to `pnpm-workspace.yaml` for local-source development.** | As a non-workspace app, consuming a `@bcl32/*` change requires publishing + bumping `package.json` first. Adding it to the workspace (and switching deps to `workspace:^`) lets the `USE_LOCAL_PACKAGES` Vite alias flow resolve locally alongside the compose-dev path. | M |
