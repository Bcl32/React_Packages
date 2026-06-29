# Package Manager Dashboard (`package-manager-dashboard`) — UI / Architecture Audit

**App path:** `/home/brandon/Projects/web-app-monorepo/tools/dashboard`
**Package name:** `package-manager-dashboard` (`package.json` line 2)
**Type:** Standalone internal dev tool (a full-stack Bun + React app, **not** part of the pnpm workspace)

A developer-facing operations dashboard for the monorepo. It is a single-page React client (Vite) backed by a Bun HTTP server (`server/index.ts`) that shells out to repo tooling and surfaces the results: package version matrices (React + Python), Docker layer status, publish readiness, git worktrees, live Docker container status, a TCP port-allocation map, and a streaming release pipeline. Unlike the consumer apps documented in this folder, the dashboard **consumes zero `@bcl32/*` packages** — it is intentionally self-contained.

See also:

- [`../02-INTEROP.md`](../02-INTEROP.md) — how apps consume shared `@bcl32/*` packages and the workspace-vs-registry distinction.
- [`../06-REFACTOR-PROPOSALS.md`](../06-REFACTOR-PROPOSALS.md) — cross-app refactor backlog.

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| UI framework | React 18.2 (`react`/`react-dom` `^18.2.0`) |
| Language | TypeScript 5.7 (`^5.7.2`) |
| Build tool | Vite 5 (`^5.0.8`, `@vitejs/plugin-react`) |
| Data fetching | TanStack Query v5 (`@tanstack/react-query` `^5.18.1`) — **no devtools** |
| Routing | React Router v6 (`react-router-dom` `^6.22.0`) |
| Styling | Tailwind CSS 3.4 (`^3.4.1`) — **no `tw-colors`**, no shared theme plugin |
| Class merging | `clsx` `^2.1.0` + `tailwind-merge` `^2.2.0` (local `cn` helper) |
| Icons | `lucide-react` `^0.344.0` |
| Server runtime | Bun (`bun --watch server/index.ts`; `@types/bun` `^1.3.11`) |
| Dev runner | `concurrently` `^9.0.0` (runs Bun server + Vite client together) |

### Architecture

```
package.json scripts
├── dev    → concurrently: "bun run server" + "bun run client"
├── server → bun --watch server/index.ts   (HTTP API + release-runner.ts, SSE)
├── client → vite                          (React SPA on the dev port)
└── build  → vite build                    (static client only)
```

Routing is centralized in `src/App.tsx`: a single layout route (`Layout`) wraps nine routes — `Overview` (index), `react`, `python`, `docker`, `publish`, `worktrees`, `docker-status`, `ports`, and `release`. The `QueryClient` is configured with `staleTime: 60_000` and `refetchOnWindowFocus: false` (`src/App.tsx` lines 14–21). The sidebar nav is a static `NAV_ITEMS` array in `src/Layout.tsx` (lines 15–27) with two visual dividers ("Worktrees", "Release").

The client talks to the Bun server over three API modules (`src/api/queries.ts`, `release-queries.ts`, `worktree-queries.ts`), hitting `/api/*` endpoints; the release pipeline additionally consumes a Server-Sent Events stream via `useReleaseEvents`.

---

## 2. Shared `@bcl32/*` Package Usage

**None.** The dashboard imports **zero `@bcl32/*` packages**. It is entirely self-contained and re-implements (rather than consumes) several primitives the shared system already provides — see §6.

### Versioning style — fully disconnected from the workspace convention

| Aspect | Dashboard | Monorepo convention |
| --- | --- | --- |
| Workspace membership | **Absent** from `pnpm-workspace.yaml` (which lists only explicit `react-packages/*` dirs) | Workspace apps listed in `pnpm-workspace.yaml` |
| Package manager | **Bun** (`bun.lock`, `bun --watch`, `@types/bun`) | pnpm (`pnpm-lock.yaml`) |
| Dependency ranges | Bare caret ranges (e.g. `"@tanstack/react-query": "^5.18.1"`) | `workspace:^2.0.0` protocol for inter-package deps |
| Shared packages | None consumed | Apps consume `@bcl32/utils`, `@bcl32/hooks`, `@bcl32/themes`, etc. |

This is a deliberate but **undocumented** split: the dashboard is a Bun-native full-stack tool living under `tools/`, outside the React workspace entirely. See [`../02-INTEROP.md`](../02-INTEROP.md) for the workspace-vs-registry model it opts out of.

---

## 3. Bespoke UI Components

All UI is hand-rolled against raw Tailwind classes. Components live in `src/components/` (and `src/components/release/`).

| Component | File | Role |
| --- | --- | --- |
| `MatrixTable` | `components/MatrixTable.tsx` | Generic expandable data table with a typed row/column/render-cell API. Backs every package version matrix view and the port allocation table. |
| `StatusBadge` | `components/StatusBadge.tsx` | Pill badge mapping 14 domain status strings (`current`, `stale`, `drift`, `ahead`, `unused`, `published`, `changed`, `bumped`, `untagged`, `clean`, `dirty`, `running`, `stopped`, `healthy`, `unhealthy`) to `status-*` Tailwind colour tokens. |
| `HealthBadge` | `components/HealthBadge.tsx` | Pill badge for Docker container/health states (`healthy`, `unhealthy`, `starting`, `none`, `running`, `exited`, `paused`, `restarting`, `created`). Structurally identical to `StatusBadge` — see §5. |
| `RefreshControl` | `components/RefreshControl.tsx` | Header widget that invalidates all TanStack Query caches; supports manual refresh and auto-refresh at 30s / 1m / 5m intervals, with a spinning indicator while fetching. |
| `PortGrid` | `components/PortGrid.tsx` | Visual heatmap of allocated TCP ports grouped into 100-port rows, colour-coded per worktree environment with conflict highlighting. |
| `EnvironmentCard` | `components/EnvironmentCard.tsx` | Docker Compose environment summary card: per-container status, health, ports and uptime in an inline table. |
| `StatCard` | `components/StatCard.tsx` | KPI summary card with a Lucide icon, large value number and a detail subtitle. |
| `VersionCell` | `components/VersionCell.tsx` | Renders a version string with optional stale colour and an arrow-to-suggested-version annotation. |
| `SkeletonRows` | `components/Skeleton.tsx` | Animated placeholder skeleton matching the `MatrixTable` layout for loading states. |
| `ErrorCard` | `components/ErrorCard.tsx` | Inline error display with alert icon, message text and optional Retry button. |
| `LaunchBar` | `components/release/LaunchBar.tsx` | Release pipeline launcher: project/preset selects with a pre-flight validation banner and a Start Run button that fires a POST mutation. |
| `StageStepper` | `components/release/StageStepper.tsx` | Vertical pipeline stage list rendered from SSE-streamed `PipelineRun` data, delegating each stage to `StageCard`. |
| `DriftApprovalCard` | `components/release/DriftApprovalCard.tsx` | Approval-gate widget shown when a run reaches `awaiting-approval`; renders a per-project dep-bump table with Approve/Cancel buttons. |
| `DriftStatusList` | `components/release/DriftStatusList.tsx` | Per-project shared-package drift inspector with expand/collapse bump tables and an Apply Locally mutation. |

> `StageCard` and `GitHubLink` are additional internal components in the same folders; the table above lists the audited primitives.

---

## 4. Theming Wiring

The dashboard uses a **hardcoded dark theme only**. There is no theme toggle, no `ThemeProvider`, and no `@bcl32/themes` integration.

- `index.html` sets `class="dark"` on `<html>` and `bg-gray-950 text-gray-100` on `<body>` (lines 2 and 8). The dark class is static — nothing ever changes it.
- `tailwind.config.ts` sets `darkMode: 'class'` and extends the palette with **eight bespoke `status-*` tokens** defined as raw hex values:

```ts
// tailwind.config.ts (lines 8–17)
colors: {
  'status-current': { DEFAULT: '#22c55e', light: '#dcfce7' },
  'status-stale':   { DEFAULT: '#eab308', light: '#fef9c3' },
  'status-unused':  { DEFAULT: '#6b7280', light: '#f3f4f6' },
  'status-changed': { DEFAULT: '#f97316', light: '#ffedd5' },
  'status-ready':   { DEFAULT: '#06b6d4', light: '#cffafe' },
  'status-error':   { DEFAULT: '#ef4444', light: '#fee2e2' },
  'status-running': { DEFAULT: '#3b82f6', light: '#dbeafe' },
  'status-warning': { DEFAULT: '#f59e0b', light: '#fef3c7' },
}
```

- There is **no `tw-colors` / `createThemes` plugin** (`plugins: []`) and **no CSS-variable token set** (`--background`, `--primary`, `sidebar-*`, etc.) like the consumer apps use. All styling is raw Tailwind class strings against `gray-*` and `status-*` tokens.
- The `light` shade on each `status-*` token is declared but unused in practice, since the app never leaves dark mode.

This is acceptable for an internal dev tool, but it means the dashboard shares **no design tokens** with the rest of the monorepo and cannot inherit theme changes from `@bcl32/themes`.

---

## 5. Inconsistencies / Drift vs the Shared System

| # | Issue | Location | Severity |
| --- | --- | --- | --- |
| 1 | **Not a pnpm workspace member.** `pnpm-workspace.yaml` lists only `react-packages/*` dirs; `tools/dashboard` is absent. The dashboard has its own `bun.lock` and installs deps via Bun, not pnpm — two package managers in one repo with no documentation of the choice. | `pnpm-workspace.yaml` + `tools/dashboard/bun.lock` | **Medium** |
| 2 | **`fetchJSON` duplicated across all three API files.** An identical async `fetchJSON<T>` helper (fetch + error extraction) is copy-pasted in each query module. | `src/api/queries.ts:82`, `src/api/release-queries.ts:87`, `src/api/worktree-queries.ts:111` | Low |
| 3 | **`StatusBadge` and `HealthBadge` are near-identical.** Both render the same pill `<span>` (`inline-flex … rounded-full border px-2 py-0.5 text-xs font-medium`) with `status-*` classes; they differ only in the status union and the config map. | `src/components/StatusBadge.tsx`, `src/components/HealthBadge.tsx` | Low |
| 4 | **`SUPPORTED_PROJECTS` hardcoded in a component.** `const SUPPORTED_PROJECTS = ['print-tracker', 'image-poc']` is a static list inside `LaunchBar`; adding a project requires a code change even though the server already returns a `projects` array. | `src/components/release/LaunchBar.tsx:10` | Low |
| 5 | **Machine-specific absolute paths baked into the UI.** `ExpandedWorktree` embeds the literal `/home/brandon/Projects/web-app-monorepo/tools/update-worktree.sh` (and `remove-worktree.sh`) — the dashboard is not portable across machines/users. | `src/pages/Worktrees.tsx:218–219` | Low |
| 6 | **`lucide-react` pinned older than `@bcl32/themes`.** Dashboard pins `^0.344.0` (Mar 2024); `react-packages/themes` uses `^0.447.0`. If co-installed, the icon set would differ. | `tools/dashboard/package.json:17` vs `react-packages/themes/package.json` | Low |
| 7 | **`useReleaseEvents(null)` fragility.** The SSE hook is called with `null` during the no-run state and guards its `useEffect` with `if (!id)`. This is correct under the Rules of Hooks (the `useState`/`useCallback` still run unconditionally), but is fragile if the hooks are ever reordered. | `src/api/release-queries.ts:218–266` | Low |

---

## 6. Reinvented Wheels

Things the dashboard re-implements that the shared system already provides (or could).

| What | Location | Adopt instead |
| --- | --- | --- |
| `cn()` utility (`clsx` + `tailwind-merge`) re-implemented locally. | `src/lib/utils.ts` | `@bcl32/utils` — the same helper is used by sibling apps; duplicating it per-app creates drift. |
| Generic status / health badge (pill component). | `src/components/StatusBadge.tsx`, `src/components/HealthBadge.tsx` | A shared badge/chip primitive in `@bcl32/utils` (alongside `Button`, `DialogButton`) would serve apps and the dashboard alike. |
| `SkeletonRows` loading placeholder. | `src/components/Skeleton.tsx` | A shared skeleton primitive from `@bcl32/utils` (the consumer apps already use `Skeleton` from there) or `@bcl32/datatable`. |

> Caveat: adopting `@bcl32/*` here would require pulling the dashboard into the pnpm workspace (or onto the registry), which conflicts with its current Bun-only setup. The reuse benefit must be weighed against re-introducing the workspace coupling the tool currently avoids (§5 #1).

---

## 7. Prioritized Refactor Opportunities

Ordered by value-to-effort. See [`../06-REFACTOR-PROPOSALS.md`](../06-REFACTOR-PROPOSALS.md) for cross-app tracking.

| # | Title | Rationale | Effort |
| --- | --- | --- | --- |
| 1 | Extract `fetchJSON` into a shared `src/api/client.ts` | The same ~10-line helper is copy-pasted in all three `api/*.ts` files. One module gives a single place to add auth headers or error enrichment later. | S |
| 2 | Merge `StatusBadge` + `HealthBadge` into one generic `BadgePill` | Both are structurally identical (config map → `status-*` span). A single component (config prop or merged status union) removes ~60 lines of duplication and one import per call site. | S |
| 3 | Drive `SUPPORTED_PROJECTS` from server config | `LaunchBar` filters the release config by a static list. The server already returns `ReleaseConfigResponse.projects`; dropping the client-side filter makes new projects appear automatically. | S |
| 4 | Replace machine-specific absolute paths with config/env | The `MONOREPO_ROOT` / script paths appear in `server/index.ts` (env var with a hardcoded default) **and** directly in `Worktrees.tsx`. The component should fetch the path from the API or derive it from `MONOREPO_ROOT` so the tool is portable. | S |
| 5 | Add the dashboard to the pnpm workspace **or** document the Bun/pnpm split | Two package managers coexist with no documented rationale. Either bring it under pnpm or add a note in `pnpm-workspace.yaml` recording the intentional exclusion. | S |
| 6 | Co-locate client/server API types in a shared `types.ts` | API interfaces (`PipelineRun`, `WorktreeEntry`, `DockerContainer`, `PortAllocation`, …) are declared independently in the client `api/` files with "replicated from server/…" comments. A shared types file imported by both ends drift if shapes change. | M |

---

## 8. Additional UI Polish Notes

- **Empty header bar.** `Layout.tsx` (line 79) renders an empty `<div />` on the left of the header; the app title lives only in the sidebar, so the header is nearly empty on wide screens.
- **Skeleton jitter.** `SkeletonRows` uses `Math.random()` to vary placeholder widths on every render (`Skeleton.tsx` lines 17, 34), so widths visibly jump each time React re-renders the skeleton while data is still loading. Seed the widths once (e.g. `useMemo`) for a stable placeholder.
- **Hard-to-spot expandable rows.** The "click to expand" hint in `ReactPackages` is rendered as plain grey text inside every Package Name cell, with no chevron — easy to miss which rows expand.
- **Capped log viewer.** `ReleasePipeline` embeds a `<pre>` log viewer capped at 60 lines (`max-h-60`) with no way to expand to full height or copy the full log to the clipboard.
- **Unbalanced stats bar.** `PortMap`'s stats grid fills only 2 of 4 column slots (Total Ports, Conflicts); the remaining two cells are empty, leaving an unbalanced bar on large screens.
- **Opaque age thresholds.** The `Worktrees` `AgeBadge` shows raw values (`14d`, `7d`) with no tooltip explaining the colour thresholds — users must read the source to understand them.
- **Dark-only.** No light mode and no theme toggle (§4) — acceptable for a dev tool, but worth noting if it ever needs to run on a light-background display.
