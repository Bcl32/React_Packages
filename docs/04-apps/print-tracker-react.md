# Print Tracker React — UI / Architecture Audit

**App path:** `Print-Tracker/print-tracker-react`
**Type:** Vite + React 18 SPA, the consumer-facing frontend for the Print-Tracker FastAPI backend (3D-print filament / spool / part / project / printer tracking).

Related reading:

- [../02-INTEROP.md](../02-INTEROP.md) — how apps consume the shared `@bcl32/*` packages.
- [../06-REFACTOR-PROPOSALS.md](../06-REFACTOR-PROPOSALS.md) — cross-cutting refactor backlog this app feeds into.

---

## 1. Technology stack

| Concern | Technology |
|---|---|
| Framework | React 18.2 |
| Build / dev server | Vite 5 (`build.minify: false`, dev server on port 3000 with `/fastapi` proxy → `http://print-tracker-api:8000`) |
| Routing | `react-router-dom` 6.22 |
| Server state | `@tanstack/react-query` 5.18 + `@tanstack/react-query-devtools` |
| Styling | Tailwind CSS 3.4 + `tw-colors` 3.3 + `@tailwindcss/forms`; `tailwind.config.js` now uses the shared `@bcl32/themes/tailwind-preset` (see [§4](#4-theming-wiring)) |
| 3D | Three.js 0.172 (WebGL mesh viewer), `meshWorker.js` Web Worker for off-thread mesh build |
| Charts | Recharts 2.15 (pie/donut) — imported **directly**, not via `@bcl32/charts` |
| Component libs | `@headlessui/react` 2.1, multiple `@radix-ui/*` primitives, `lucide-react` 0.344, `react-day-picker` 9 (transitive, via `@bcl32/utils` `DateTimePicker`). **Zero `@mui/*`/`@emotion/*`** — the app's one MUI usage (`FilterPanel.jsx`'s `@mui/icons-material` `FilterList` icon) was swapped for lucide's `ListFilter` as part of the 2026-07-04 MUI-removal refactor. |
| Toasts | `sonner` 2 |
| Dates | `dayjs` ^1.11 |
| Realtime | WebSocket via `useLivePrinters` (printer telemetry ~1 Hz, hand-rolled reconnect) |

The route table (`src/main.jsx`) registers ~50 routes across Dashboard, Stats, Filaments, Spools, Vendors, Printers, PrintJobs/Queue, Projects, Parts/PartSets, Hardware, Systems, Plates, Slicer/SlicerProfiles, Compare, and inbox/wizard utility pages. Legacy `/Slices*` routes now `<Navigate>`-redirect to `/Parts`.

---

## 2. Consumed `@bcl32/*` packages

The app declares **all nine** `@bcl32/*` packages, but two are dead weight (see §5).

| Package | Version | How it is used |
|---|---|---|
| `@bcl32/utils` | `^2.5.0` | Primary UI primitive library across every page. Subpath imports: `Sidebar/*`, `Card`, `Button`, `Dialog`, `Tooltip` (`CustomTooltip`), `Input`, `Select`, `Combobox`, `Slider`, `Label`, `Separator`, `StatusBanner`, `DialogButton`/`SimpleDialog`, `Dropdown`, `Stepper`, and the `cn` class-merge utility. |
| `@bcl32/hooks` | `^2.3.0` | Core data-access layer. `useGetRequest` (all reads), `apiFetch` (Layout prefetch + `LivePrinterCard`), `useApiMutation` (Slicer, ImportModal), `useOptionsEnrichment` (ProjectDetail, PartDetail). |
| `@bcl32/datatable` | `^2.8.0` | `DataTable` on every list/entity page; `ColumnGenerator` inside all `*TableData.jsx` helpers to build column arrays from `ModelData`. |
| `@bcl32/filters` | `^3.2.0` | `useEntityFilters` (client-side filter state), `useDataTableFilterBar` (filter-bar UI), `AllFilters` + `FiltersSummary` rendered inside `FilterPanel.jsx`. |
| `@bcl32/forms` | `^3.0.0` | `EditModelForm` (PartDetail edit/create dialogs), `FormElement` (Slicer override fields). |
| `@bcl32/navigation` | `^2.1.8` | `NavigationProvider` wraps the layout; `NavigationBreadcrumb` in the header; `useNavigation` on every page to set breadcrumbs. |
| `@bcl32/themes` | `^2.2.0` | `ThemeProvider` wraps the app (`Layout.jsx`); `Theming` component in the sidebar footer (theme picker); `useTheme` in `MeshViewer` and `ThumbnailCell` for dark-theme detection. `tailwind.config.js` uses `@bcl32/themes/tailwind-preset` instead of an inline `createThemes()` block (see [§4](#4-theming-wiring)). |
| `@bcl32/charts` | `^3.0.0` | **Declared but unused** — no import found in `src/`. `Stats.jsx` uses Recharts directly. |
| `@bcl32/data-utils` | `^2.1.10` | **Declared but unused** — no import found in `src/`. Format helpers (`formatDuration`, `formatGrams`, `formatBytes`) are re-implemented locally instead. |

### Versioning style — drift from the monorepo convention

```
"@bcl32/utils": "^2.5.0"   // caret range vs published GitHub Packages version
```

This app uses **caret ranges against published versions**, not the monorepo's `workspace:^2.0.0` protocol. The app is **not** in the root `pnpm-workspace.yaml`, so `@bcl32/*` resolves from GitHub Packages rather than local source. The only local-dev escape hatch is the `USE_LOCAL_PACKAGES=true` Vite alias in `vite.config.js` — but those aliases point at `react-packages/*/src` paths *relative to the app dir*, which do not exist under `Print-Tracker/` (they live at the monorepo root), so the aliases only resolve when Vite is invoked from the root. This is a real local-dev friction point (see §6).

---

## 3. Bespoke UI components and their roles

These are app-local components that are not (and arguably should not all be) in the shared system.

| Component | Path | Role |
|---|---|---|
| `MeshViewer` | `src/components/MeshViewer.jsx` | Full Three.js WebGL viewer: OrbitControls/TrackballControls, dynamic resolution scaling, slerp camera tweening, lighting presets, isometric/orthographic views, PNG thumbnail capture at 1024px. ~650+ LOC. |
| `MeshScene` | `src/components/MeshScene.js` | Three.js scene helpers: `applyLighting`, `buildIsometricCamera`, `buildPaletteMaterial`, `computeCombinedBounds`, `VIEW_PRESETS`. Companion to `MeshViewer`. |
| `meshWorker` | `src/workers/meshWorker.js` | Web Worker: fetches JSON geometry, parses, computes crease/smooth/smooth-indexed normals, transfers typed arrays zero-copy to the main thread. |
| `EditableDetailItem` | `src/components/EditableDetailItem.jsx` | Click-to-edit detail field (string/number/select/list/id_list/single_combobox). Gates editability via `modelData` attribute spec; ships patches through `onSave`. ~490 LOC. |
| `useLivePrinters` | `src/hooks/useLivePrinters.js` | WebSocket hook: live printer telemetry with hand-rolled exponential-backoff reconnect, ping/pong keep-alive, per-printer id subscription. |
| `CompareBasket` / `useCompareBasket` | `src/components/CompareBasket.jsx` + `src/hooks/useCompareBasket.jsx` | `sessionStorage`-backed basket (max 8 parts) for side-by-side comparison. Provider+context exposes add/remove/toggle/clear; floating widget shows current basket. |
| `SettingsContext` / `SettingsPanel` | `src/context/SettingsContext.jsx` + `src/components/SettingsPanel.jsx` | `localStorage`-backed app settings (cache duration, toolbar style, 3D backdrop tuning). `QueryCacheSync` bridges settings into the TanStack Query client. |
| `FilterPanel` | `src/components/FilterPanel.jsx` | Dialog wrapper around `@bcl32/filters` `AllFilters`; per-page trigger with active-filter count badge. |
| `ThumbnailCell` | `src/components/ThumbnailCell.jsx` | Table thumbnail cell that applies a tunable dark-on-dark radial-gradient backdrop behind near-black parts on dark themes. |
| `viewerBackdrop` | `src/utils/viewerBackdrop.js` | Pure logic for the dark-theme/near-black backdrop: channel parsing, theme detection, gradient CSS generation. |
| `SpoolsTableData` | `src/components/tables/SpoolsTableData.jsx` | Spool list columns: inline SVG spool icon with filament colour, translucent-checkerboard pattern, status badges, weight progress bar; expands rows into `SpoolDetailGrid`. |
| `ProjectDetail` (page) | `src/pages/ProjectDetail.jsx` | Recursive part-set grouping (parent/child nesting), stats rollup (weight / print time / completion %), flat/nested toggle, thumbnail regeneration queue, hardware table, move-items / claim-from-bin modals. ~530 LOC. |
| `Slicer` (page) | `src/pages/Slicer.jsx` | Multi-step 3MF upload → per-object colour assignment → profile selection → streaming slice-and-save. Integrates `MeshViewer`, `ColourPickerPopover`, `Stepper`, `FilamentPalette`, duplicate-part detection, perf instrumentation. |
| `PlateBuilder` (page) | `src/pages/PlateBuilder.jsx` | Part picker, client-side bin-packing (`plateLayout.js`), streaming `POST /plates/build`, assembly-completeness tracking. |
| `LoadAllEntities` | `src/LoadAllEntities.jsx` | Shared data-fetch + breadcrumb helper used by all top-level list pages. |
| `groupVisualAdapters` | `src/utils/groupVisualAdapters.jsx` | App-side visual resolver injected into `@bcl32/filters` `EntityGroupCards` — adds colour dot + icon visuals for Filament/Project/PrintJob/Spool status groups without pulling `lucide-react` into the shared package. |
| `ColourSwatch` | `src/components/ColourSwatch.jsx` | Circular colour swatch with CSS checkerboard background for translucent/alpha filaments. |

---

## 4. Theming wiring

The app uses **`tw-colors` 3.3** via the shared `@bcl32/themes/tailwind-preset` (new
in `themes` 2.2.0, part of the 2026-07-04 MUI-removal refactor). `tailwind.config.js`
now reads:

```js
presets: [require("@bcl32/themes/tailwind-preset")],
```

instead of hand-copying a `createThemes({...})` block — the ten named themes
(`light, dark, green, yellow, purple, blue, dark-green, dark-blue, light-blue,
light-gold`) and their tokens now live in exactly one place, `themes/src/themes.json`.

- Each theme maps ~25+ semantic tokens (`background`, `foreground`, `primary`, `card`, `muted`, `sidebar-*`, `chart-*`, `warning`/`warning-foreground` (new in 2.2.0), etc.) to HSL values.
- The preset's `produceCssVariable` override strips `tw-colors`' default `tw-` prefix, so tokens read as `--primary`, `--background`, etc.
- `ThemeProvider` (from `@bcl32/themes`) manages the active theme via a `data-theme` attribute + `localStorage` (key `vite-ui-theme`).
- The `Theming` component (`@bcl32/themes/Theming`) sits in the sidebar footer for user-facing switching.

**Fragile coupling — RESOLVED 2026-07-04.** `src/utils/viewerBackdrop.js` used to keep
its own `LIGHT_THEMES` set:

```js
// src/utils/viewerBackdrop.js:48 (old)
const LIGHT_THEMES = new Set(["light", "light-green", "light-blue", "light-gold"]);
```

with a comment noting this "Mirrors ThemeProvider's own set" — except the set had
already drifted (`light-green` was never one of the ten real themes). It now imports
`isLightTheme` directly from the new `@bcl32/themes/themeMeta` subpath instead:

```js
import { isLightTheme } from "@bcl32/themes/themeMeta";
```

There is no longer a hand-maintained list to drift out of sync with `themes.json`.

---

## 5. Inconsistencies / drift vs the shared system

| # | Issue | File reference(s) | Severity |
|---|---|---|---|
| 1 | `@bcl32/*` use caret ranges (`^2.4.4`) instead of the monorepo `workspace:^` protocol; app is outside the pnpm workspace. | `package.json` (lines 14–22) | Medium |
| 2 | `USE_LOCAL_PACKAGES` Vite aliases point at `react-packages/*/src` relative to the app dir, where those paths do not exist (they're at the repo root). Aliases only resolve from the root. | `vite.config.js` (lines 7–19) | Medium |
| 3 | `@bcl32/data-utils` and `@bcl32/charts` declared as deps but never imported in `src/`. | `package.json` + `src/pages/Stats.jsx` | Medium |
| 4 | `formatDuration` / `formatGrams` independently re-implemented in three places with diverging null-handling (`sliceFormat` returns `'—'`, Dashboard returns `'0m'`). | `src/pages/Dashboard.jsx`, `src/pages/Stats.jsx`, `src/utils/sliceFormat.js` | Medium |
| 5 | `LoadAllEntities.jsx` uses `var` declarations inside an `if` block and passes possibly-undefined values to `useEffect` (relies on hoisting). | `src/LoadAllEntities.jsx` (lines 11–17) | Low |
| 6 | Typo `obj_heirarchy` survives here even though `ShowHeirarchy → ShowHierarchy` was fixed elsewhere in the monorepo. | `src/LoadAllEntities.jsx` (line 13) | Low |
| 7 | ~~`LIGHT_THEMES` in `viewerBackdrop.js` must be hand-synced with `ThemeProvider` (and already appears to have drifted).~~ **RESOLVED 2026-07-04** — now imports `isLightTheme` from `@bcl32/themes/themeMeta`. | `src/utils/viewerBackdrop.js` | Low |
| 8 | ~~`FilterPanel.jsx` imports `@mui/icons-material/FilterList` — the only MUI icon in an otherwise `lucide-react` app.~~ **RESOLVED 2026-07-04** — now imports `ListFilter` from `lucide-react`; the app has zero `@mui/*` imports. | `src/components/FilterPanel.jsx` | Low |
| 9 | `index.css` `:root` has a leftover debug `scrollbar-color: #007 #bada55;` (dead code, overridden two rules later). | `src/index.css` (line 109) | Low |
| 10 | Status badge classes are hardcoded Tailwind `dark:` colour names (`dark:bg-green-900`, `dark:text-green-200`, `dark:bg-amber-900`) instead of theme tokens — they only flip on the `dark` system theme, not custom named themes. | `src/components/tables/SpoolsTableData.jsx` (lines 11–17), `src/components/FilamentDetailGrid.jsx` (line 35) | Low |

---

## 6. Reinvented wheels

| What was reinvented | Where | Package to adopt instead |
|---|---|---|
| `formatDuration`, `formatGrams`, `formatBytes` re-implemented locally (three diverging copies). | `src/pages/Dashboard.jsx`, `src/pages/Stats.jsx`, `src/utils/sliceFormat.js`, `src/utils/formatBytes.js` | `@bcl32/data-utils` (already a declared dep, but unused) |
| Manual `apiFetch` + `res.json()` inside a TanStack `prefetchQuery`, duplicating what `useGetRequest` already encapsulates. | `src/Layout.jsx` (lines 28–35) | `@bcl32/hooks/useGetRequest` (used everywhere else) |
| Recharts primitives wired up by hand for the Stats donut/pie. | `src/pages/Stats.jsx` | `@bcl32/charts` (declared dep, unused) — or drop the dep and keep direct Recharts |

---

## 7. Prioritized refactor opportunities

Effort key: **S** = small, **M** = medium.

### High priority

1. **Wire up `workspace:^` so `@bcl32/*` resolve locally during development.** (Effort: S)
   Add the app to `pnpm-workspace.yaml` and switch deps to `workspace:^`. Today, iterating on a shared package requires publishing to GitHub Packages or relying on the broken `USE_LOCAL_PACKAGES` alias. This gives instant local-source resolution like other workspace apps. *(Addresses inconsistencies #1, #2.)*

2. **Replace local `formatDuration` / `formatGrams` duplicates with `@bcl32/data-utils` imports.** (Effort: S)
   Three diverging copies already exist; the package is in `package.json` but unused. Centralising removes the divergence and makes the declared dep earn its place. *(Addresses #3, #4.)*

3. **Resolve the unused `@bcl32/charts` dependency.** (Effort: S)
   Either delete it (Stats uses Recharts directly) to cut install size, or actually adopt the `@bcl32/charts` wrappers for consistent chart styling across the monorepo. *(Addresses #3.)*

### Medium priority

4. **Rewrite `LoadAllEntities.jsx` with `const`/`let` and fix the `var`-inside-`if` pattern.** (Effort: S)
   Used by ~15 list pages. Move to `useEffect`-driven navigation, eliminate hoisting reliance and the `obj_heirarchy` typo. *(Addresses #5, #6.)*

5. ~~**Extract a shared theme-classification module between `ThemeProvider` and `viewerBackdrop`.**~~ **DONE 2026-07-04** — `@bcl32/themes/themeMeta`'s `isLightTheme()` now provides exactly this, and `viewerBackdrop.js` consumes it. *(Addresses #7.)*

6. **Consolidate status-badge styling onto theme tokens.** (Effort: M)
   Replace hardcoded `dark:bg-*` pairs with semantic tokens so badges respect custom named themes. *(Addresses #10.)*

### Low priority / cleanup

7. ~~**Swap `FilterPanel`'s MUI `FilterList` icon for `lucide-react`'s `Filter`.**~~ **DONE 2026-07-04** — `FilterPanel.jsx` now uses lucide's `ListFilter`, removing the only MUI-icon subtree from the app. *(Addresses #8.)*

8. **Add a shared `LoadingState` / `ErrorState` component.** (Effort: S)
   ~20 detail pages each ship an inline `Loading …` paragraph. A small shared component allows consistent skeleton/spinner treatment.

9. **Delete the dead `scrollbar-color: #007 #bada55;` debug line.** (Effort: S) *(Addresses #9.)*

---

## 8. Additional UI issues to track

- **Dead CSS:** `index.css` line 109 placeholder scrollbar colour (`#007 #bada55`) is a debugging artefact left in production CSS.
- **Theme-blind badges:** `SpoolsTableData` / `FilamentDetailGrid` status badges only flip on the `dark` system theme, not on custom named themes (green, purple, yellow, …).
- **Hardcoded currency:** `Dashboard.jsx` currency formatter is fixed to `en-CA` / `CAD` with no i18n hook.
- **Non-persistent nav state:** `CollapsibleNavSection` in `MainSidebar.jsx` uses local `useState`, so Parts/Plates groups reset to `defaultOpen` on every route change.
- **Bare loading states:** detail pages show plain `"Loading …"` text — no spinner/skeleton.
- **Prefetch stale-time drift:** `Layout.jsx` hardcodes `staleTime: 5 * 60 * 1000` for the dashboard prefetch instead of reading `SettingsContext`, so the prefetched entry may be stale-timed differently than the user's configured cache duration.
- **Dev sandbox in prod routes:** `StepperDemo` is reachable at `/StepperDemo` (`main.jsx` line 122) — should be dev-flag-guarded or excluded from production builds.
- **Always-on compare widget:** `CompareBasket` is rendered inside `SidebarProvider` but outside the router `<Outlet>`, so it floats over every page including tool/utility pages (e.g. `PlateThumbnail`, `StepperDemo`) where comparison is irrelevant.

---

*See [../02-INTEROP.md](../02-INTEROP.md) for shared-package interop conventions and [../06-REFACTOR-PROPOSALS.md](../06-REFACTOR-PROPOSALS.md) for the consolidated cross-app refactor backlog.*
