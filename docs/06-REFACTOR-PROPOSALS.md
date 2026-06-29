# @bcl32 React System — Refactor Proposals

> **Audience:** Maintainers of the `@bcl32/*` shared packages and the apps that consume them (`image-poc-react`, `label-designer-react`, `print-tracker-react`, `security-benchmarks-react`, the `dashboard`).
>
> **Scope:** A prioritized, themed set of refactor recommendations grounded in code-level findings. Documentation-only fixes (stale versions, wrong example imports, etc.) are tracked separately in [`05-INCONSISTENCIES.md`](./05-INCONSISTENCIES.md); this doc focuses on *code and structural* changes. Each proposal lists the problem, the proposed change, the affected packages/apps, a rough effort (S/M/L), and the risk.
>
> **How to read effort:** **S** = a few hours, isolated. **M** = a day or two, touches multiple files/packages. **L** = multi-day, cross-cutting, likely staged.

---

## Prioritized summary

The table is ordered by *value-to-risk ratio*: high-impact, low-risk items first. Theme IDs map to the detailed sections below.

| # | Theme | Proposal | Scope | Effort | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | [Dead code & debug artifacts](#1-dead-code--debug-artifacts) | Strip leftover debug code: `test` layoutId, `console.log`s, `#007/#bada55` scrollbars, proxy logging, `StepperDemo` route | utils, charts; all 4 apps | S | Low |
| 2 | [Dependency hygiene](#2-dependency-hygiene) | Remove unused declared deps (peer & runtime) across packages and apps | utils, hooks, datatable; image-poc, security-benchmarks, label-designer | S | Low |
| 3 | [Dependency hygiene](#2-dependency-hygiene) | Move heavy libs to `peerDependencies` / lighter subpackages (MUI, bokeh, d3) | charts, data-utils | M | Medium |
| 4 | [Display-name & naming correctness](#3-display-name--naming-correctness) | Fix mismatched/typo `displayName`s and misleading prop names | utils, charts | S | Low |
| 5 | [Reinvented wheels in apps](#4-reinvented-wheels-in-consumer-apps) | Extract per-app duplicated helpers (`fileToBase64`, `formatDuration`, `getLayoutColor`, `fetchJSON`, badges) | all apps + dashboard | S–M | Low |
| 6 | [Theming unification](#5-theming-unification) | Replace hardcoded `dark:`/palette badge colours with semantic tokens; single light-theme source of truth | themes, print-tracker, image-poc, security-benchmarks, dashboard | M | Medium |
| 7 | [Internal duplication in packages](#6-internal-duplication-within-packages) | Collapse copy-paste within packages (overlays, file-trees, `LabelWithHelp`, mutation hooks, alpha convention) | utils, hooks, themes, forms, datatable | M | Medium |
| 8 | [API consistency & correctness bugs](#7-api-consistency--correctness-bugs) | Fix correctness bugs: `useDataLoader` cache key, falsy-`0` rendering, render-time DOM mutation, bespoke prop APIs | hooks, charts, utils, filters, datatable | M | Medium |
| 9 | [Subpath export completeness](#8-subpath-export-completeness--tree-shaking) | Add missing subpath exports / tsup entries to restore tree-shaking and type access | data-utils, filters, forms, hooks | M | Low |
| 10 | [Consumer workspace migration](#9-consumer-workspace-migration) | Bring apps into the pnpm workspace + `workspace:^`; retire Dockerfile.deps imperative installs | print-tracker, security-benchmarks, image-poc | L | High |
| 11 | [Build & bundle config](#10-build--bundle-configuration) | Enable minification, conditional DevTools, sync Dockerfile.deps↔package.json carets | image-poc, label-designer, security-benchmarks | S–M | Low |

> **Suggested execution order:** ship themes 1–5 first (they are nearly all S, low-risk, and remove noise that obscures the harder work). Tackle 6–9 as a "package hardening" milestone. Treat 10 as its own project with a per-app rollout.

---

## 1. Dead code & debug artifacts

**Problem.** A consistent pattern of forgotten debug code is scattered across both packages and apps. None of it changes behaviour today, but it is confusing, ships to production, and in a few cases fires on every render.

Package-level:

- `@bcl32/utils` `AnimatedTabs.tsx:22` — a variable literally named `test` (`const test = tab_titles[0] + tab_titles[1]`) is used as the framer-motion `layoutId`. The name reads like forgotten scaffolding.
- `@bcl32/datatable` — the `'🔵'` emoji fallback in `expand_column` (`ColumnGenerator.tsx:147`) is unreachable because `DataTable` sets `getRowCanExpand: () => true` unconditionally; the empty `'children'`/`'id_list'` case blocks in `StatsTable.tsx:165-166` silently discard data.

App-level (confirmed in code):

- `console.log`s in the render path: `image-poc-react` `Metadata.jsx:66`, `MetadataAccordion.jsx:39,43`.
- Leftover placeholder scrollbar colours `scrollbar-color: #007 #bada55;` in `:root`, immediately overridden two lines later — `image-poc-react/src/index.css:48`, `label-designer-react/src/index.css:48`, `print-tracker-react/src/index.css:109`.
- `image-poc-react/vite.config.js` proxy `proxyReq`/`proxyRes` debug logging (~lines 47–57) that fires on every proxied request.
- `print-tracker-react/main.jsx` exposes a `/StepperDemo` development sandbox route in the production route table.
- `image-poc-react` `MetadataAccordion.jsx` and the `DisplaySchema.jsx` (empty `AnimatedTabs`) / "JSON" debug tab in `Metadata.jsx` are abandoned mid-refactor UI.

**Proposed change.** Delete the dead branches and debug statements. Rename `AnimatedTabs`' `test` to a descriptive `layoutId` (e.g. `tabsLayoutId`). For the `StatsTable` empty cases, either implement them or render an explicit placeholder/`console.warn` in dev so unsupported types are visible. Guard or remove `/StepperDemo` behind `import.meta.env.DEV`. Remove the `image-poc` proxy logging or gate it on an env flag.

**Affected.** Packages: `utils`, `datatable`. Apps: `image-poc-react`, `label-designer-react`, `print-tracker-react`.

**Effort.** S. **Risk.** Low — these are no-ops or dev-only paths.

---

## 2. Dependency hygiene

**Problem.** Several declared dependencies are never imported, and a few heavy libraries are declared as `dependencies` (forcing a copy into every consumer bundle) or pulled in whole when a subpackage would do.

Unused / misleading declarations (verified against `package.json` + source):

| Where | Declared | Reality |
| --- | --- | --- |
| `@bcl32/utils` | `@radix-ui/react-select` (peer) | No source file uses it; `Select.tsx` is a raw `<select>` wrapper. |
| `@bcl32/hooks` | `dayjs` (peer) | Imported nowhere in `src/`. |
| `@bcl32/datatable` | `@bcl32/hooks` (dep) | No `@bcl32/hooks` import in any `src` file. |
| `image-poc-react` | `moment`, `@bokeh/bokehjs` | Zero imports in `src/`. |
| `security-benchmarks-react` | `@bcl32/charts`, `@bcl32/forms`, `@bcl32/data-utils`, `@bcl32/themes` | Declared, never imported. Plus 9 direct `@radix-ui/*` installs duplicating what `@bcl32/utils` already provides. |
| `label-designer-react` | `framer-motion` | Declared, not imported in `src/`. |

Heavy libs in the wrong dependency class:

- `@bcl32/charts` declares `@mui/material` and `@bokeh/bokehjs` as **`dependencies`** (`charts/package.json:49-50`). MUI especially should be a `peerDependency` so every consumer doesn't bundle its own copy.
- `@bcl32/data-utils` depends on all of **`d3@7`** (`data-utils/package.json:65`) but only uses d3's `bin()` — that lives in `d3-array`.

**Proposed change.** Remove the unused declarations. Reclassify `@mui/material` (and likely `@bokeh/bokehjs`) in `charts` to `peerDependencies`. Swap `d3` for `d3-array` in `data-utils`. For `security-benchmarks-react`, drop the unused `@bcl32/*` and direct `@radix-ui/*` installs, relying on the Radix-backed primitives already exported by `@bcl32/utils`.

**Affected.** Packages: `utils`, `hooks`, `datatable`, `charts`, `data-utils`. Apps: `image-poc-react`, `security-benchmarks-react`, `label-designer-react`.

**Effort.** Removals = S; the MUI/bokeh peer-dep reclassification = M (consumers must now declare the peer).

**Risk.** Removals: Low. Peer-dep moves: **Medium** — moving a `dependency` to a `peerDependency` is a breaking change for any consumer that wasn't already declaring it; do it in a minor/major bump and update each app's `package.json` + `Dockerfile.deps` in the same release.

---

## 3. Display-name & naming correctness

**Problem.** Several components expose names that are wrong or misleading, surfacing in React DevTools and confusing consumers.

- `@bcl32/charts`: `ChartTooltipContent.displayName = 'ChartTooltip'` (`charts/src/Chart.tsx:287`) and `ChartLegendContent.displayName = 'ChartLegend'` (`:353`) — both mismatch the component identity.
- `@bcl32/utils`: `BreadcrumbEllipsis.displayName = "BreadcrumbElipssis"` (double-s typo, `Breadcrumb.tsx:99`).
- `@bcl32/utils` `RadioButton.tsx`: bespoke prop API (`interval_name`, `value: unknown`, `timeChange: unknown`) inconsistent with the library's `forwardRef` + `HTMLAttributes` convention; `timeChange` is typed `unknown` with no docs.
- `@bcl32/navigation` `NavigationBreadcrumb.tsx:17`: a `data?: unknown` prop that is accepted then discarded (`_props`, never read) — dead API surface.
- `@bcl32/forms`: `RelationCollectionField` accepts `formData?`/`setFormData?` purely for `FormElement` compatibility but documents them as unused — callers may expect `setFormData` to wire state.

**Proposed change.** Correct each `displayName` to match its component. Fix the `BreadcrumbElipssis` typo. Re-type `RadioButton` to the standard `forwardRef` + typed-`onChange` convention (deprecate the old prop names for one minor version). Remove the unused `data` prop from `NavigationBreadcrumb`. Document the inert `formData`/`setFormData` props on `RelationCollectionField` clearly, or drop them if `FormElement` no longer requires them.

**Affected.** Packages: `charts`, `utils`, `navigation`, `forms`.

**Effort.** S (display-name/typo fixes) to M (`RadioButton` re-type). **Risk.** Low for display names; Medium for the `RadioButton` API change (callers depend on prop names) — stage with deprecation aliases.

---

## 4. Reinvented wheels in consumer apps

**Problem.** Each app independently re-implements the same small helpers, with subtle behavioural drift between copies.

| Helper / pattern | Duplicated in | Drift / note |
| --- | --- | --- |
| `fileToBase64` (FileReader→promise) | image-poc `ImageClassifier`, `ImageDescriber`, `ObjectDetector` | Identical; extract to `src/utils/fileToBase64.js`. |
| `useMLModels(task)` query + active-model filter + init `useEffect` | image-poc 4 AI pages | Centralise the query key so cache invalidation is consistent. |
| Hand-rolled `button[role=switch]` toggle | image-poc `SettingsPanel`, `ObjectDetector` | Extract a `ToggleSwitch` (or use installed `@radix-ui/react-toggle-group`). |
| `getConfidenceColor`/`getConfidenceBgColor` | image-poc `ImageClassifier`, `ObjectDetector` | Identical thresholds. |
| `getLayoutColor` | label-designer `TemplateGallery`, `TemplateExplorer` | Identical body. |
| Canvas `TemplateCanvas` preview | label-designer `TemplateGallery`, `TemplateExplorer` | Near-identical; explorer adds a scale transform → make it a prop. |
| `formatDuration` / `formatGrams` | print-tracker `Dashboard`, `Stats`, `sliceFormat.js` | **Behavioural drift:** Dashboard/Stats return `"0m"` for zero/null; `sliceFormat` returns `"—"`. |
| `formatDate` / `formatDuration` | security-benchmarks `RunsListPage`, `RunDetailPage`, `ModelEndpointsPage` | Could use `dayjs` (already a transitive peer). |
| `fetchJSON<T>` | dashboard `queries.ts`, `release-queries.ts`, `worktree-queries.ts` | Char-for-char; extract `api/client.ts`. |
| `StatusBadge` + `HealthBadge` | dashboard | Structurally identical; merge into one `BadgePill`. |
| `cn()` (clsx + tailwind-merge) | dashboard `lib/utils.ts` | Re-implemented per app; candidate for `@bcl32/utils`. |

**Proposed change.** Extract per-app shared modules first (lowest risk, highest immediate payoff). For print-tracker, replace the three local `formatDuration`/`formatGrams` copies with `@bcl32/data-utils` (already declared in `package.json` but unused) — and converge on one null/zero behaviour. Where a primitive recurs across *apps* (badge pill, `cn`, skeleton, toggle), consider promoting it into `@bcl32/utils` (see §6/§8).

**Affected.** All four apps + `dashboard`; potentially `@bcl32/utils`/`@bcl32/data-utils` if promoted.

**Effort.** S per app helper; M if promoting shared primitives into `@bcl32/utils`. **Risk.** Low — pure consolidation; the only judgement call is the `formatDuration` null/zero contract, which should be decided explicitly.

---

## 5. Theming unification

**Problem.** The theming story is fragmented in two ways: (a) status indicators use hardcoded Tailwind palette classes that ignore the active named theme, and (b) the set of "light" themes is maintained in more than one place.

Hardcoded colours that bypass theme tokens:

- `print-tracker-react` `SpoolsTableData.jsx` and `FilamentDetailGrid.jsx` use `bg-green-100 … dark:bg-green-900` style pairs — they only flip on the OS `dark` class, not on the custom named themes (`green`, `purple`, `yellow`, …).
- `image-poc-react` `getConfidenceColor`/`sentimentColors`/`barColors`/`ModelCard` labels use raw palette classes.
- `security-benchmarks-react` `StatusBadge` uses `bg-emerald-600`, a non-theme colour, and dark mode is unreachable anyway (`<html class="light">` hardcoded, no toggle).
- `dashboard` `StatusBadge`/`HealthBadge` use `status-*` classes (dev tool, dark-only — lower priority).

Duplicated theme source of truth:

- `print-tracker-react/src/utils/viewerBackdrop.js` keeps a `LIGHT_THEMES` set documented as "mirrors ThemeProvider's own set" — and it is **already out of sync** (contains `light-green`, which does not exist in `tailwind.config.js`).
- Multiple apps (print-tracker, security-benchmarks) duplicate the full theme palette inline in `tailwind.config.js` rather than referencing `@bcl32/themes`.

**Proposed change.**
1. Replace hardcoded status-badge colour pairs with semantic tokens (e.g. `bg-success`/`text-success`, `bg-destructive`, …) or, at minimum, CSS-variable-driven classes so badges follow the active theme.
2. Expose a single source of truth for "is this theme light?" — either a `theme_type`/`isLightTheme()` API from `@bcl32/themes` (the package already classifies light themes in `ThemeProvider`) or an exported constant — and have `viewerBackdrop.js` consume it instead of a hand-maintained copy. Fix the stale `light-green` entry.

**Affected.** Packages: `themes` (new derivation/export API). Apps: `print-tracker-react`, `image-poc-react`, `security-benchmarks-react`, `dashboard`.

**Effort.** M. **Risk.** Medium — visual regression is possible if a semantic token doesn't map cleanly to the old palette colour; do it theme-by-theme with screenshots.

---

## 6. Internal duplication within packages

**Problem.** Beyond the app layer, the packages themselves carry copy-paste that should be a shared internal module.

- `@bcl32/utils`: `SheetOverlay` and `DialogOverlay` are identical (`fixed inset-0 z-50 bg-black/80` + identical animation classes). Two file-tree implementations — `FileSystem.tsx` (heroicons, no animation) and `AnimatedFileSystem.tsx` (lucide, framer-motion) — serve the same purpose with no shared abstraction; only `AnimatedFileSystem` is wrapped by `ShowHierarchy`.
- `@bcl32/forms`: `LabelWithHelp` is duplicated verbatim across `FormElement.tsx`, `ColourField.tsx`, and `ColourArrayField.tsx`. `dayjs.extend(utc)/extend(timezone)` is called at module scope in three form files (`AddModelForm`, `EditModelForm`, `BulkEditModelForm`).
- `@bcl32/hooks`: `useDatabaseMutation` and `useApiMutation` are near-duplicate wrappers over the same `buildRequestBody`+`apiFetch`+`res.json()`; they differ only in payload-binding time and `invalidateKeys` shape.
- `@bcl32/datatable`: `RowActions` and the private `EditCell` inside `ColumnGenerator` both open the same `EditModelForm` in a `DialogButton` — copy-paste with no shared abstraction.
- `@bcl32/themes`: `updateCSSVariables` logic is duplicated between `Theming.tsx` and `ThemeGenerator.tsx`; `hslToObject` is a strict subset of `parseToHSL` (duplicated regex); the `alpha` convention is *inverted* in `ColourControls` (0–100, 0 = opaque) versus the 0–1 fraction used everywhere else (see also §7).
- `@bcl32/filters`: `OptionsFilter` `'dropdown'` and `'combobox'` cases render identical JSX; `extractLabels` in `utils.ts` is defined and exported but imported nowhere.

**Proposed change.** Extract one shared internal module per cluster: a single `Overlay` primitive, one `LabelWithHelp`, one `dayjs` setup module, one `updateCSSVariables`, one `EditDialog` shared by `RowActions`/`EditCell`. Have `hslToObject` delegate to `parseToHSL`. Decide on a single file-tree implementation (or extract a shared `FileTree` with pluggable icons). Unify the two mutation hooks behind one core with thin wrappers. Collapse the duplicate `OptionsFilter` branch and remove dead `extractLabels`.

**Affected.** Packages: `utils`, `forms`, `hooks`, `datatable`, `themes`, `filters`.

**Effort.** M. **Risk.** Medium — these are exported surfaces; keep public signatures stable, refactor internals only, and lean on the golden harness / app smoke tests.

---

## 7. API consistency & correctness bugs

**Problem.** A handful of findings are genuine latent bugs rather than style issues.

| Bug | Location | Effect |
| --- | --- | --- |
| Wrong query key | `@bcl32/hooks` `useDataLoader.ts:22` uses `['useBokehChart', url, file_url]` (copy-paste from `useBokehChart`) | A `useDataLoader` and `useBokehChart` call for the same `url`+`file_url` collide on one cache entry → stale/mismatched data. |
| Falsy-`0` suppressed | `@bcl32/charts` `ChartTooltipContent` `{item.value && …}` (`Chart.tsx:271`) | A legitimate value of `0` is never rendered. |
| DOM mutation during render | `@bcl32/charts` `BokehLineChart` calls `update_bokeh_graph` in the render body (`:63-78`) | Breaks Strict Mode double-invocation; should be in `useEffect`. |
| Singleton DOM ids | `BokehLineChart` hardcodes `#myplot`/`#graphContainer` (`:65-73`) | Cannot render two instances on one page. |
| Stale closure | `BokehLineChart` initialises `anomalies` from `metadata` once, never updates on prop change (`:45`) | Stale anomalies after `metadata` changes. |
| Inverted alpha | `@bcl32/themes` `ColourControls` (0–100, 0 = opaque) vs 0–1 fraction elsewhere | Round-trips and consumers misinterpret alpha. |
| `hslToHex` drops alpha | `@bcl32/themes` `colorUtils.ts:96-115` returns 6-char hex despite an `a` param | Misleading given `ColourPicker` expects 8-char alpha hex. |
| Bespoke/awkward prop APIs | `useBokehChart` two positional booleans + `unknown`; `RadioButton` `unknown` props; filters `GetActiveFilters.ts:37` spuriously adds `timespan_begin: 'filter'` | Error-prone call sites; corrupted `ActiveFilters` entry. |
| Vite-only env access | `@bcl32/utils` `StatusBanner.tsx` uses `import.meta.env.DEV` | Throws in non-Vite bundlers. |
| Swallowed errors | `@bcl32/hooks` `useOptionsEnrichment` `catch → []`; `image-poc` options endpoints fail silently | No observable error state for consumers. |
| Generics | `@bcl32/datatable` `ColumnGenerator` typed against `RowData` not `<TData>` (`:65`); `action_column` requires `update_api_url` not enforced at the type level | Forces `as unknown` casts; runtime type mismatch in `RowActions`. |
| Unstable defaults | `@bcl32/datatable` default sort hardcoded to `time_created` desc (`DataTable.tsx:106`); array-index React keys in `KeyValueTable`/`StatsTable` | Invalid sort id for tables without that column; fragile keys on reorder. |

**Proposed change.** Fix the query key, the falsy-`0` guard (`item.value != null`), and move `BokehLineChart` DOM work into a `useEffect` keyed by `metadata`, parameterising the container id (accept an `id`/`ref` prop). Make `ColumnGenerator` generic (`<TData extends RowData>`). Normalise the `themes` alpha convention to a single 0–1 fraction and append the alpha byte in `hslToHex`. Convert positional-boolean APIs (`useBokehChart`) to an options object behind a deprecation. Remove the spurious `timespan_begin: 'filter'` mutation in `GetActiveFilters`. Surface (don't swallow) options-enrichment errors. Replace `import.meta.env.DEV` with a runtime-agnostic check.

**Affected.** Packages: `hooks`, `charts`, `themes`, `utils`, `filters`, `datatable`.

**Effort.** M. **Risk.** Medium — the query-key, alpha, and DOM-timing fixes change observable behaviour; the alpha change in particular needs a coordinated bump and consumer review.

---

## 8. Subpath export completeness & tree-shaking

**Problem.** The system's design philosophy is per-file subpath exports for tree-shaking, but several useful modules are reachable only through the `.` barrel (or not at all), and a few exported subpaths are fragile because they aren't in the tsup entry list.

- `@bcl32/data-utils`: `./types` is in `package.json` exports but `src/types.ts` is **not** a tsup entry — the chunk only exists as a side effect of code-splitting from `index.ts`. Internal return types `StatEntry`/`BinEntry`/`FeatureStats` aren't exported, so consumers can't type `CalculateFeatureStats`'s return.
- `@bcl32/filters`: `EntityGroupCards`, `useEntityGroups`, `getGroupableAttrs`, `useDataTableFilterBar`, and `utils.ts` have no subpath entry → only reachable via the barrel, blocking tree-shaking for subpath importers.
- `@bcl32/forms`: `useGroupedSwatches`, and `_diff.ts`'s `deepEqual`/`changedFields` are internal-only with no entry point, despite being reusable.
- `@bcl32/hooks`: `_buildRequestBody.ts`'s `RequestBody`/`buildRequestBody` aren't re-exported from `index.ts` or the exports map — dead from a consumer's view.
- `@bcl32/navigation`: `NavigationContextValue` interface isn't exported, so consumers can't type wrappers around `useNavigation`.

**Proposed change.** Add the missing modules to both `tsup.config.ts` `entry` and the `package.json` `exports` map (and re-export the public types). Add a `./types` entry for `data-utils`. Export `StatEntry`/`BinEntry`/`FeatureStats`, `NavigationContextValue`, and (if intended as public) the swatch/diff helpers. Decide deliberately which internals stay private.

**Affected.** Packages: `data-utils`, `filters`, `forms`, `hooks`, `navigation`.

**Effort.** M. **Risk.** Low — additive export changes are backwards-compatible; just avoid accidentally widening the public API for things meant to stay internal.

---

## 9. Consumer workspace migration

**Problem.** Three of the four React apps live *outside* the pnpm workspace, so iterating on a shared package requires publishing a new version (or relying on the fragile `USE_LOCAL_PACKAGES` Vite alias). The two most acute cases:

- `image-poc-react`: declares **no** `@bcl32/*` in `package.json` at all — they are installed imperatively in `Dockerfile.deps` at image build time. A plain `npm install` outside Docker produces a broken build; there are no lockfile pins for `@bcl32` packages. (The `package.json` `name` is also a stale `"time-series"`.)
- `security-benchmarks-react`: lockfile specifiers lag `package.json` for 6 of 9 `@bcl32` packages, so the installed build doesn't match intent.
- `print-tracker-react`: *does* declare all nine `@bcl32/*` as plain carets (good), but is still outside the workspace, so local source resolution isn't instant.

**Proposed change.** Add the apps to `pnpm-workspace.yaml` and switch their `@bcl32/*` deps to `workspace:^`, giving instant local-source resolution like the in-workspace packages. Where an app must build in Docker without the workspace (prod), keep the plain-caret + `Dockerfile.deps` path but generate it from `package.json` rather than hand-maintaining it. For `image-poc-react`, first add the nine packages to `package.json` so the dependency graph is explicit to tooling (`pnpm outdated`, `pnpm audit`, `deps-sync`).

**Affected.** Apps: `print-tracker-react`, `security-benchmarks-react`, `image-poc-react` (and root `pnpm-workspace.yaml`). The `dashboard` is a separate case — it uses Bun/`bun.lock` and is intentionally outside the pnpm workspace; either fold it in or document the split in `pnpm-workspace.yaml`.

**Effort.** L. **Risk.** **High** — touches install/build/CI/Docker for multiple apps; `workspace:` is invalid to npm in Docker contexts, so the prod path must keep plain carets. Roll out one app at a time and validate both `pnpm dev` and the Docker build per app.

---

## 10. Build & bundle configuration

**Problem.** A cluster of small build/config issues inflate bundles or ship dev tooling to production.

- `image-poc-react/vite.config.js` sets `build: { minify: false }` — with MUI, Radix, framer-motion, and several `@bcl32/*` packages, the unminified prod bundle is far larger than necessary.
- `ReactQueryDevtools` is included unconditionally in the production bundle (`image-poc-react`); in `label-designer-react` it renders **outside** `ThemeProvider`, so it always shows in default light style.
- `Dockerfile.deps` ↔ `package.json` caret drift: `label-designer-react` installs `@bcl32/utils@^2.3.9` in `Dockerfile.deps` but declares `^2.4.0` in `package.json`, so a cached-layer rebuild installs an *older* package than a fresh install. `label-designer`'s `@bcl32/hooks` is `^2.2.7` vs siblings' `^2.3.0`.
- `label-designer-react`'s `Layout` renders both `{children}` and `<Outlet />`; `children` is never passed (dead path). `index.html` still references the default `/vite.svg` favicon.
- `security-benchmarks-react` pins `@headlessui/react` to an exact `2.1.1` while everything else uses carets.

**Proposed change.** Enable `minify` (default esbuild) for `image-poc-react` prod builds, or document the reason for disabling it in a comment. Conditionally import `ReactQueryDevtools` in dev only, and (label-designer) render it inside `ThemeProvider`. Run `deps-sync` to converge `Dockerfile.deps` and `package.json` carets, then add a CI check that diffs the two. Remove `Layout`'s dead `{children}` path. Bump `label-designer`'s `@bcl32/hooks` to `^2.3.0`. Restore caret consistency on `@headlessui/react`.

**Affected.** Apps: `image-poc-react`, `label-designer-react`, `security-benchmarks-react`.

**Effort.** S–M. **Risk.** Low — config-level; the only thing to watch is that enabling minification doesn't surface a previously-masked bundling bug (smoke-test the prod build).

---

## Appendix: theme → finding traceability

For reviewers cross-checking against the source findings:

| Theme | Primary package findings | Primary app findings |
| --- | --- | --- |
| Dead code (§1) | utils `AnimatedTabs.test`; datatable `🔵`/empty `StatsTable` cases | image-poc console.logs/proxy logging; index.css `#bada55`; print-tracker `/StepperDemo` |
| Dependency hygiene (§2) | utils radix-select peer; hooks dayjs peer; datatable hooks dep; charts MUI/bokeh deps; data-utils d3 | image-poc moment/bokeh; security-benchmarks unused `@bcl32`/Radix; label-designer framer-motion |
| Naming (§3) | charts/utils displayName; navigation `data` prop; forms `RelationCollectionField` | — |
| Reinvented wheels (§4) | (candidates to promote into utils/data-utils) | image-poc/label-designer/print-tracker/security-benchmarks/dashboard duplicated helpers |
| Theming (§5) | themes light-theme allowlist / alpha | print-tracker badges + `viewerBackdrop`; image-poc/security-benchmarks/dashboard badges |
| Internal dup (§6) | utils overlays/file-trees; forms LabelWithHelp/dayjs; hooks mutation hooks; datatable EditCell; themes updateCSSVariables; filters OptionsFilter | — |
| Correctness bugs (§7) | hooks useDataLoader key; charts falsy-0/render-DOM; themes alpha/hslToHex; filters GetActiveFilters; datatable generics | image-poc silent option errors |
| Subpath exports (§8) | data-utils/filters/forms/hooks/navigation | — |
| Workspace migration (§9) | — | print-tracker/security-benchmarks/image-poc (+ dashboard Bun split) |
| Build config (§10) | — | image-poc minify/devtools; label-designer Dockerfile drift/devtools/Layout; security-benchmarks pin |

---

> **See also:** [`00-OVERVIEW.md`](./00-OVERVIEW.md) for the system model, [`05-INCONSISTENCIES.md`](./05-INCONSISTENCIES.md) for the documentation-only fixes that complement these code changes, and the per-package references in [`./01-packages/`](./01-packages/).
