# App Audit: AI Services POC (`image-poc-react`)

> **Path:** `Base-POC/image-poc-react`
> **Type:** Vite + React 18 single-page app (frontend of a FastAPI + PostgreSQL full-stack POC)
> **Audit focus:** UI architecture, shared `@bcl32` package consumption, theming wiring, and drift vs. the shared system.

See also: [Interop overview](../02-INTEROP.md) · [Refactor proposals](../06-REFACTOR-PROPOSALS.md)

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18.2 |
| Build tool | Vite 5.0.8 |
| Routing | React Router DOM 6.22 |
| Server state | TanStack Query v5.18 |
| Styling | Tailwind CSS 3.4 + `tw-colors` 3.3.2 |
| Component libs | MUI v5.15 (Material-UI) + Emotion; Radix UI primitives; Headless UI 2.1.1 |
| Icons | Lucide React |
| Animation | Framer Motion 11.11.17 |
| Dates | dayjs 1.11 |
| Backend (separate service) | FastAPI + PostgreSQL |
| Infra | Docker Compose + nginx reverse proxy |

**Radix primitives in use:** `checkbox`, `dialog`, `dropdown-menu`, `focus-scope`, `label`, `select`, `separator`, `slider`, `slot`, `toggle-group`, `tooltip`.

**Dead / unused stack entries** (flagged in [§5](#5-inconsistencies--drift)):

- `moment` 2.30 — listed in `package.json` but no import in `src/` (dayjs is the actual date lib).
- `@bokeh/bokehjs` 2.4.3 — listed in `package.json` but no import in `src/`.

---

## 2. Shared `@bcl32` packages — what and how

The app consumes nine shared packages. **Eight of the nine are absent from `package.json`** — they are installed at Docker image build time via explicit `npm install` lines in `Dockerfile.deps` (see [§4](#4-dependency-wiring-the-docker-deps-strategy)). As of 2026-07-04, `@bcl32/themes` is the one exception: it is now declared directly in `package.json` (`"@bcl32/themes": "^2.2.0"`), needed so `tailwind.config.js`'s `require("@bcl32/themes/tailwind-preset")` resolves at build time — see [§9](#9-theming-wiring).

| Package | Version (Dockerfile.deps) | How it is used |
| --- | --- | --- |
| `@bcl32/utils` | `^2.5.0` | The full `Sidebar` family (`Sidebar`, `SidebarProvider`, `SidebarTrigger`, `SidebarContent`, `SidebarGroup`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarHeader`, `SidebarMenuItem`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarRail`, `SidebarFooter`, `useSidebar`); `Button`; `Card`/`CardContent`/`CardDescription`/`CardHeader`/`CardTitle`; `Label`; `Slider`; `Separator`; `StatusBanner`; `DialogButton`/`SimpleDialog`; `AnimatedTabs`/`TabContent`; `CustomTooltip`; `ShowHierarchy` |
| `@bcl32/themes` | `^2.2.0` (declared directly in `package.json`, not just `Dockerfile.deps` — see above) | `ThemeProvider` (wraps `Layout`, drives system/local-storage theme); `Theming` (theme-switcher shown in the sidebar footer dialog) |
| `@bcl32/navigation` | `^2.1.8` | `NavigationProvider` (context in `Layout`); `NavigationBreadcrumb` (rendered in the `Layout` header); `useNavigation` (called in each page to set the breadcrumb trail) |
| `@bcl32/hooks` | `^2.3.0` | `useGetRequest` — drives the TanStack Query GET calls in `LoadAllEntities`/`LoadEntity` |
| `@bcl32/forms` | `^3.0.0` | `EditModelForm` — inline entity editing inside a `DialogButton` in `Metadata.jsx` and `MLModel.jsx` |
| `@bcl32/datatable` | `^2.8.0` | `DataTable` (`AllMLModels`, `AllClients`, `AllServices`, `MLModel`, `EntityViewerUnified`); `KeyValueTable` (`Metadata`, `MetadataAccordion`); `StatsTable` (`EntityViewerUnified`) |
| `@bcl32/filters` | `^3.2.0` | `ProcessDataset`, `AllFilters`, `ChartFilter`, `InitializeFilters`, `FiltersSummary`, `FilterContext`, `GetSubkeyValues` — the filter + chart panel in `EntityViewerUnified.jsx` |
| `@bcl32/charts` | `^3.0.0` | **No direct import in app `src/`** — consumed transitively by `ChartFilter` inside `@bcl32/filters`. As of `charts` 3.0.0, this package is recharts-only (`BokehLineChart` was removed); no impact on this app since it never imported `BokehLineChart`. |
| `@bcl32/data-utils` | `^2.1.10` | `Capitalize` (from `StringFunctions`) — capitalises child-tab labels in `Metadata.jsx` |

> **Note:** Imports use the subpath-`exports` form, e.g. `@bcl32/utils/AnimatedTabs`, `@bcl32/datatable/KeyValueTable`, `@bcl32/data-utils/StringFunctions`.

---

## 3. Bespoke UI components and their roles

App-level components and hooks that wrap or sit alongside the shared system:

| Component | Path | Role |
| --- | --- | --- |
| `DetectionCanvas` | `src/components/DetectionCanvas.jsx` | Canvas-based interactive object-detection visualizer. Draws the base image, optional per-instance segmentation masks (per-detection color tinting via `ImageData` pixel manipulation), and bounding-box overlays. Supports hover highlight, click-to-select, focus/isolate mode, and `ResizeObserver`-driven responsive scaling. |
| `ImageUploadZone` | `src/components/ImageUploadZone.jsx` | Drag-and-drop + file-picker image input. Wired to `useImageUpload`. Embeds a `SimpleDialog` hosting `SampleImages` for quick test selection. |
| `ModelSelector` | `src/components/ModelSelector.jsx` | Shows the active model name with a doc-URL `InfoTooltip`, then opens a `DialogButton` of `AnimatedTabs` (one per model) with `ModelDetails`. |
| `InfoTooltip` | `src/components/InfoTooltip.jsx` | Thin wrapper over `@bcl32/utils` `CustomTooltip`. Renders a `HelpCircle` trigger by default (or wraps arbitrary children) with an optional external URL. Used on settings sliders, toggle labels, and result-item labels throughout the AI service pages. |
| `ModelCard` / `ModelDetails` / `TraitPills` | `src/components/ModelCard.jsx` | Structured ML-model metadata display: speed/accuracy/architecture trait pills, description, specs grid (`tech_name`, `architecture`, `params`, `input_size`), HuggingFace/Ultralytics link, strengths (`CheckCircle2`), weaknesses (`AlertTriangle`), and best-for highlight. |
| `TextInputZone` | `src/components/TextInputZone.jsx` | Textarea text input for NLP features. Manual typing, `.txt` upload (capped at 10,000 chars), and a `SimpleDialog` hosting `SampleTexts`. Shows a character count. |
| `SettingsPanel` | `src/components/SettingsPanel.jsx` | Single-toggle (Live Update) panel rendered inside a sidebar `DialogButton`. Toggle is a hand-rolled `button role="switch"`, **not** a Radix primitive. |
| `EntityViewerUnified` | `src/EntityViewerUnified.jsx` | Generic entity list page: combines `@bcl32/filters` (`ProcessDataset`, `AllFilters`, `FilterContext`, `ChartFilter`) with `@bcl32/datatable` (`DataTable`, `StatsTable`) into a filters + charts + table layout. Reused by Clients/Services pages. |
| `Metadata` | `src/Metadata.jsx` | Generic entity detail panel. `AnimatedTabs` with Main Attributes, DB Metadata, Object, and JSON tabs — `KeyValueTable` for the first two, `ShowHierarchy` for the latter two. Used inside single-entity pages (`MLModel`, `Client`, `Service`). |
| `useImageUpload` | `src/hooks/useImageUpload.js` | Hook encapsulating all image-selection state: file/preview/drag state, `FileReader` preview generation, drag-and-drop handlers, file-input ref, clear, and sample-image URL→`File` conversion. |
| `LoadAllEntities` / `LoadEntity` | `src/LoadAllEntities.jsx`, `src/LoadEntity.jsx` | Thin data-fetching wrappers around `@bcl32/hooks` `useGetRequest` that also set breadcrumbs via `useNavigation`. Return datasets/metadata for list/detail pages. |

---

## 4. Dependency wiring: the Docker deps strategy

This app is **not in the pnpm workspace**, so it does **not** use the monorepo's standard `workspace:^2.0.0` protocol. Instead:

1. `@bcl32/*` packages are **absent from `package.json`** entirely.
2. `scripts/sync-base-packages.js` generates `package.base.json` by stripping `@bcl32/*` entries, producing a base-layer image without them.
3. `Dockerfile.deps` layers the packages back in via explicit `npm install` against the published GitHub Packages registry, e.g.:

```dockerfile
RUN --mount=type=secret,id=github_token \
    echo "Cache bust: $CACHEBUST" && \
    export GITHUB_TOKEN=$(cat /run/secrets/github_token) && \
    npm install \
      @bcl32/charts@^3.0.0 \
      @bcl32/data-utils@^2.1.10 \
      @bcl32/datatable@^2.8.0 \
      @bcl32/filters@^3.2.0 \
      @bcl32/forms@^3.0.0 \
      @bcl32/hooks@^2.3.0 \
      @bcl32/navigation@^2.1.8 \
      @bcl32/themes@^2.2.0 \
      @bcl32/utils@^2.5.0 \
      --no-audit && \
    rm -f .npmrc
```

This multi-stage Docker caching strategy is the deliberate alternative to the `workspace:` protocol, and it works — but it means `@bcl32` updates require bumping carets in `Dockerfile.deps` rather than just running `pnpm install`, and a developer running `npm install` outside Docker gets a broken install (except for `@bcl32/themes`, which — as of 2026-07-04 — is also declared in `package.json` directly; see [§2](#2-shared-bcl32-packages--what-and-how)). `vite.config.js` provides an opt-in `USE_LOCAL_PACKAGES=true` alias path that points the `@bcl32/*` specifiers at `react-packages/*/src` for local development.

---

## 5. Inconsistencies / drift

Drift vs. the shared system and internal inconsistencies, ranked by severity.

| # | Severity | Location | Issue |
| --- | --- | --- | --- |
| 1 | **Medium** | `package.json` + `Dockerfile.deps` | `@bcl32/*` packages are absent from `package.json`; installed only at Docker build time. `npm install` outside Docker produces a broken install. The `react-website-dev` convention is to declare packages with `workspace:^2.0.0`. **Partially changed 2026-07-04:** `@bcl32/themes` is now the exception — it's declared directly in `package.json` (`^2.2.0`) so `tailwind.config.js`'s `require("@bcl32/themes/tailwind-preset")` resolves. The other 8 packages are still Docker-only, so the core inconsistency persists for them. |
| 2 | **Medium** | `ImageClassifier.jsx`, `SentimentAnalyzer.jsx`, `components/ModelCard.jsx` | Hardcoded non-semantic Tailwind color classes (`text-green-600`, `bg-red-100`, `dark:bg-green-900`) for confidence/sentiment states. In non-light/dark themes (yellow, purple, green, dark-blue) these clash with the active palette and will not theme-switch correctly. |
| 3 | **Medium** | `vite.config.js` line 29 | `build: { minify: false }` ships unminified JS to production. With MUI, Radix, Framer Motion, and multiple `@bcl32/*` packages, this significantly inflates bundle size. No comment explains why. |
| 4 | **Low** | `package.json` line 2 | App name is `"time-series"`, a stale copy-paste artifact unrelated to the app's purpose. |
| 5 | **Low** | `package.json` line 37 | `moment` 2.30.1 is a dependency with zero imports in `src/`. |
| 6 | **Low** | `package.json` line 16 | `@bokeh/bokehjs` 2.4.3 is a heavy dependency with zero imports in `src/`. |
| 7 | **Low** | `components/SettingsPanel.jsx` (lines 23–38), `ObjectDetector.jsx` (lines 244–259) | Hand-rolled toggle (`button role="switch"` with manual `translate-x-6`/`translate-x-1` thumb animation) implemented independently in two places. `@radix-ui/react-toggle-group` is already installed. |
| 8 | **Low** | `Metadata.jsx` line 66 | Leftover `console.log(tab_titles)` in the render body — fires on every render. |
| 9 | **Low** | `MetadataAccordion.jsx` lines 39, 43 | Two `console.log` statements (`key_value_pairs`, `main_attributes`) in the render path. |
| 10 | **Low** | `LoadAllEntities.jsx` line 13, `LoadEntity.jsx` line 14 | Misspelled variable `obj_heirarchy` (should be `obj_hierarchy`) propagated across callsites. |
| 11 | **Low** | `themes.css` line 1 | Duplicates `tailwind.config.js` theme tokens; commented as unused. Several values diverge (e.g. light/dark background `hsl(229 41% 4%)` here vs. `hsl(222.2 84% 4.9%)` in `tailwind.config.js`), risking confusion if re-enabled. |
| 12 | **Low** | `vite.config.js` lines 50–56 | Proxy debug logging (`proxyReq`, `proxyRes` `console.log`) left enabled — noisy but dev-only. |
| 13 | **Low** | `src/index.css` line 48 | Stale `scrollbar-color: #007 #bada55;` (hardcoded hex) in `:root`, immediately overridden by the `*` rule that correctly uses `hsl(var(--primary))` / `hsl(var(--accent))`. |

---

## 6. Reinvented wheels

Local re-implementations of things already available from a shared package or that should be extracted to an app-level utility.

| What | Where | Adopt instead |
| --- | --- | --- |
| Custom toggle switch (`button role="switch"` + manual CSS thumb animation), implemented twice | `components/SettingsPanel.jsx`, `ObjectDetector.jsx` | `@radix-ui/react-toggle-group` (already installed), or a `Switch` primitive from `@bcl32/utils` if it exposes one |
| `fileToBase64` helper (`FileReader` + promise wrapper), duplicated identically 3× | `ImageClassifier.jsx` line 52, `ObjectDetector.jsx` line 57, `ImageDescriber.jsx` line 43 | App-level `src/utils/fileToBase64.js` |
| `getConfidenceColor` / `getConfidenceBgColor` (identical thresholds) | `ImageClassifier.jsx` line 124, `ObjectDetector.jsx` line 182 | App-level shared utility (and map to semantic theme tokens — see [§5 #2](#5-inconsistencies--drift)) |
| Inline `useQuery` for `ml-models/` with identical query key/fn, duplicated 4× | `ImageClassifier.jsx` line 29, `ImageDescriber.jsx` line 21, `ObjectDetector.jsx` line 34, `SentimentAnalyzer.jsx` line 61 | A shared `useMLModels()` hook in `src/hooks/` |
| Model initial-selection `useEffect` (set first active model on load), duplicated 4× | `ImageClassifier.jsx` line 45, `ImageDescriber.jsx` line 37, `ObjectDetector.jsx` line 48, `SentimentAnalyzer.jsx` line 77 | Fold into the same `useMLModels()` hook (return `filteredModels` + `selectedModel`) |

---

## 7. Notable UI issues

- **`MetadataAccordion.jsx` is effectively dead UI.** The Object and JSON tabs in `Metadata.jsx` replace its purpose; its commented-out alternative rendering suggests an abandoned mid-refactor. It also `console.log`s in render and shows raw JSON in tiny `<pre style="font-size:10px">` blocks with no search/copy.
- **The "JSON" debug tab in `Metadata.jsx`** runs `ShowHierarchy` on `obj_heirarchy` — the **nav breadcrumb array**, not the entity JSON — alongside a commented-out `<pre>`. This is developer scaffolding left in the production UI.
- **`DisplaySchema.jsx`** renders an empty `AnimatedTabs` (entity_list and schemas are empty arrays) — effectively a blank page, mounted at no route.
- **`AllMLModels.jsx`** uses `var` and gates the `DataTable` on `dataset.length > 0`. The empty-state message ("No ML models found. Create one to get started.") is unreachable because the create button lives inside the `DataTable`.
- **Capitalised route paths** (e.g. `/ClassifyImage`, `/MLModels`) are non-standard for URLs and case-sensitive on some platforms.
- **Sidebar sub-menu expand state is not persisted.** `imagingExpanded` / `nlpExpanded` / `docsExpanded` start `true` every load, so the sidebar re-expands on every hard reload.
- **`ModelSelector`'s `AnimatedTabs`** track the last hovered/visible tab (`TabTracker` fires `onActivate` on mount), so keyboard-only users browsing tabs can silently change the pending model selection.
- **`ReactQueryDevtools` is unconditionally included in the production bundle** (not dev-only conditional import), adding DevTools UI overhead to production.

---

## 8. Prioritized refactor opportunities

Effort key: **S** = small, **M** = medium.

| Priority | Title | Effort | Rationale |
| --- | --- | --- | --- |
| 1 | Extract a shared `useMLModels(task)` hook | S | Four pages duplicate the same `ml-models/` `useQuery`, active-model filter, and init `useEffect`. One parametrised hook removes ~60 lines and centralises the query key for consistent cache invalidation. |
| 2 | Extract `fileToBase64` to a shared app utility | S | The same `FileReader` promise wrapper is copy-pasted into three pages; one `src/utils/fileToBase64.js` removes the duplication. |
| 3 | Replace the duplicated toggle with a shared primitive | S | `SettingsPanel` and `ObjectDetector` both hand-roll `button[role=switch]`. Extract a `ToggleSwitch` (or use `@radix-ui/react-toggle-group`) to standardise and cut ~20 lines per toggle. |
| 4 | Remove unused heavy deps (`moment`, `@bokeh/bokehjs`) | S | Both have zero imports. Removing them shrinks the dependency surface and prevents accidental inclusion — compounded by `minify: false`. |
| 5 | Enable build minification | S | `vite.config.js` sets `minify: false`. Enable the default esbuild minifier for production; if disabled for debugging, document the reason in a comment. |
| 6 | Consolidate duplicate theme definitions | S | *(Narrowed 2026-07-04 — `tailwind.config.js` no longer holds an inline palette; it just references `@bcl32/themes/tailwind-preset`.)* Two stale local copies remain: `themes.css` (unused, divergent values) and this app's own `src/themes.json` (distinct from `@bcl32/themes`' `src/themes.json`, importable since 2.2.0 as `@bcl32/themes/themes.json`). Delete `themes.css`; switch this app to the shared `@bcl32/themes/themes.json` export instead of maintaining its own copy. |
| 7 | ~~Declare `@bcl32/*` in `package.json`~~ | M | *(Partially done 2026-07-04 — `@bcl32/themes` is now declared directly, for the tailwind-preset `require()`.)* The other 8 packages are still installed only inside Docker via `Dockerfile.deps`, so `npm install` outside Docker still breaks for them. Declaring the rest (with an npm/GitHub auth note) improves DX and makes the dependency graph explicit for tooling. |
| 8 | Make confidence/sentiment colors theme-aware | M | `getConfidenceColor`, `getConfidenceBgColor`, `sentimentColors`, and `barColors` use hardcoded non-semantic classes that clash in non-standard themes. Map them to semantic tokens or `tw-colors` `chart-*` slots. |

---

## 9. Theming wiring

- **Engine — changed 2026-07-04:** `tailwind.config.js` now reads
  `presets: [require("@bcl32/themes/tailwind-preset")]` instead of hand-wiring
  `tw-colors`' `createThemes()` with an inline palette. The preset (added in
  `@bcl32/themes` 2.2.0) wraps `createThemes()` around the shared `themes.json`
  data, so the **10 named themes** — `light`, `dark`, `green`, `yellow`, `purple`,
  `blue`, `dark-green`, `dark-blue`, `light-blue`, `light-gold` — now come from one
  source of truth instead of being hand-copied into this app's config.
- **Tokens:** Each theme defines ~25 semantic tokens (`background`, `foreground`, `muted`, `muted-foreground`, `primary`, `secondary`, `accent`, `destructive`, `warning`/`warning-foreground` (new in `themes` 2.2.0), `ring`, `chart-1..5`, plus `sidebar-*` variants). `produceCssVariable` maps them to `--token-name` CSS variables (no `hsl()` wrapper — `tw-colors` emits the class-scoped variable).
- **Activation:** `@bcl32/themes` `ThemeProvider` sets the `data-theme` attribute on the `<html>` element (`storageKey=vite-ui-theme`, `defaultTheme=system`), and now resolves `"system"` to a concrete `light`/`dark` name via `matchMedia` before classifying `theme_type` (fixed in `themes` 2.2.0 — see the `themes` package doc's Known Smells). Users switch at runtime via the `Theming` component in the sidebar footer.
- **Body defaults:** `index.css` applies `@apply border-border`, `font-sans`, `antialiased`, `bg-background`, `text-foreground` to `body`, and sets scrollbar colors to `--primary` / `--accent`.
- **Duplication / dead code — NOT resolved by the 2026-07-04 refactor** (the preset removed the *inline palette*, not these pre-existing leftover files):
  - `themes.css` — a legacy file (commented "Not currently used") holding the same tokens as raw `:root` declarations, with several **divergent values** vs. the palette. Still present; still dead code; should be deleted.
  - `src/themes.json` — a separate, app-local copy of palette-shaped data (distinct from `@bcl32/themes`' own `src/themes.json`, importable as `@bcl32/themes/themes.json` since 2.2.0). Still present; worth switching this app to import the shared one instead of maintaining its own copy.
- **Theme-breaking spots:** Some page components use hardcoded non-semantic classes (`text-green-600`, `text-yellow-600`, `bg-red-100`, `dark:bg-green-900`) for confidence/sentiment states; these do not respond to theme switching outside `light`/`dark`. Not addressed by this refactor, though the new `warning`/`warning-foreground` tokens are a natural target for some of them. See [§5 #2](#5-inconsistencies--drift) and refactor [§8 #8](#8-prioritized-refactor-opportunities).

---

*Cross-references: [Interop overview](../02-INTEROP.md) · [Refactor proposals](../06-REFACTOR-PROPOSALS.md)*
