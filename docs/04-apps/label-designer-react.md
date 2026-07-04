# Label Designer (`label-designer-react`) — UI / Architecture Audit

**App path:** `/home/brandon/Projects/web-app-monorepo/Label-Designer/react`
**Package name:** `label-designer` (`package.json` line 2)
**Type:** Standalone React SPA (not part of the pnpm workspace)

A small coffee-themed label-design tool. It is a thin React front end over a FastAPI backend (proxied under `/fastapi/`), built around shared `@bcl32/*` UI and data packages. It serves as a showcase of the monorepo's shared design system applied to a standalone, registry-installed app.

See also:

- [`../02-INTEROP.md`](../02-INTEROP.md) — how apps consume shared `@bcl32/*` packages.
- [`../06-REFACTOR-PROPOSALS.md`](../06-REFACTOR-PROPOSALS.md) — cross-app refactor backlog.

---

## 1. Stack

| Layer | Technology |
| --- | --- |
| UI framework | React 18.2 |
| Build tool | Vite 5 (`@vitejs/plugin-react`) |
| Data fetching | TanStack Query v5 (`@tanstack/react-query` `^5.18.1`) + devtools |
| Routing | `react-router-dom` v6 |
| Styling | Tailwind CSS v3 + `tw-colors` + `@tailwindcss/forms` |
| Animation | `framer-motion` 11.11.17 (declared; **not imported anywhere** — see §5) |
| Icons | `lucide-react` |
| Primitives | Radix UI (checkbox, dialog, dropdown-menu, focus-scope, label, select, separator, slider, slot, toggle-group, tooltip), `@headlessui/react` 2.1.1 |
| Backend | FastAPI (proxied under `/fastapi/`) |
| Prod serving | nginx |

Routing is centralized in `src/main.jsx`: a single layout route (`Layout`) wraps the index/`Dashboard`, `CaffeineMeter`, `IntensityMeter`, `CoffeeLabel`, `Templates` (`TemplateGallery`), and `TemplateExplorer` routes. `BrowserRouter` derives its `basename` from `import.meta.env.BASE_URL`.

---

## 2. Shared `@bcl32/*` Package Usage

| Package | Version (`package.json`) | How it is used |
| --- | --- | --- |
| `@bcl32/hooks` | `^2.2.7` | `useGetRequest` (TanStack Query wrapper) in `CaffeineMeter`, `IntensityMeter`, `TemplateGallery`, `TemplateExplorer`; `useApiMutation` in `CoffeeLabel`. |
| `@bcl32/navigation` | `^2.1.6` | `NavigationProvider` + `useNavigation` for breadcrumb state on every page; `NavigationBreadcrumb` in the `Layout` header. |
| `@bcl32/themes` | `^2.2.0` | `ThemeProvider` wraps the whole app in `Layout`; `Theming` renders the theme-switcher UI inside a `DialogButton` in the sidebar footer. `tailwind.config.js` now uses `@bcl32/themes/tailwind-preset` (see [§4](#4-theming-wiring)). |
| `@bcl32/utils` | `^2.5.0` | Sidebar primitives (`Sidebar`, `SidebarProvider`, `SidebarTrigger`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`, `SidebarRail`, `useSidebar`); `Separator`, `StatusBanner`, `DialogButton`; `Card`/`CardContent`/`CardHeader`/`CardTitle`/`CardDescription`; `Button`, `Input`, `Label`, `Slider`, `Skeleton`, `Checkbox`, `Select`, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`; `useIsMobile`. |

### Provider composition (`src/Layout.jsx`)

```jsx
<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
  <StatusBanner />
  <div className={import.meta.env.DEV ? "pt-7" : ""}>
    <NavigationProvider>
      <SidebarProvider>
        <MainSidebar />
        <main>
          <header>
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <NavigationBreadcrumb />
          </header>
          {children}      {/* dead code — see §4 */}
          <Outlet />
        </main>
      </SidebarProvider>
    </NavigationProvider>
  </div>
</ThemeProvider>
```

The shared subpath-export convention is used throughout (e.g. `@bcl32/utils/Sidebar`, `@bcl32/themes/ThemeProvider`, `@bcl32/navigation/NavigationProvider`), consistent with sibling apps.

### Versioning style — diverges from the workspace convention

This app uses **plain caret ranges** (e.g. `"@bcl32/hooks": "^2.2.7"`) resolved from the GitHub Package Registry (`npm.pkg.github.com` via `.npmrc`) rather than the `workspace:^2.0.0` protocol used by apps inside the pnpm workspace. `Label-Designer/react` is **not** listed in `pnpm-workspace.yaml`. This is intentional: it follows the documented standalone-app exception (same pattern as `Base-POC/image-poc-react`). See [`../02-INTEROP.md`](../02-INTEROP.md) for the workspace-vs-registry distinction.

---

## 3. Bespoke UI Components

| Component | File | Role |
| --- | --- | --- |
| `CaffeineMeter` | `src/CaffeineMeter.jsx` | Slider + number-input controls driving a live `useGetRequest` to `/fastapi/caffeine/?caffeine=N`; renders the returned SVG string via `dangerouslySetInnerHTML`, plus preset caffeine-level buttons. |
| `IntensityMeter` | `src/IntensityMeter.jsx` | Slider + 13-button quick-select driving a live query to `/fastapi/intensity/?intensity=N`; renders the returned SVG donut chart and computes a roast label client-side. |
| `CoffeeLabel` | `src/CoffeeLabel.jsx` | Form (intensity `Slider`, caffeine `Input`, size `Select`, milk/iced `Checkbox`es) that POSTs to `/fastapi/coffee-label/` via `useApiMutation` and renders the JSON response (success / error / idle states). |
| `TemplateGallery` | `src/TemplateGallery.jsx` | Grid of template cards from `/fastapi/templates/`; clicking a card opens a `Dialog` with a canvas-style preview rendered from the content JSON. |
| `TemplateExplorer` | `src/TemplateExplorer.jsx` | Responsive split-pane explorer (two-column on desktop, stacked on mobile via `useIsMobile`). Hover-debounced (150 ms) prefetch populates a right-panel `TemplatePreview` that scales the canvas to fit via `ResizeObserver`. |
| `TemplatePreview` (inline) | `src/TemplateExplorer.jsx` (lines 48–161) | **Not exported.** Renders a CSS-transform-scaled label canvas from template content JSON plus a raw-JSON collapsible. |
| `MainSidebar` | `src/MainSidebar.jsx` | App-specific sidebar built from `@bcl32/utils` Sidebar primitives. Three nav groups (Navigation, Coffee Tools, Templates) with an icon-only collapsed state. Footer holds the theme switcher (`DialogButton` + `Theming`). |

---

## 4. Theming Wiring

- **Theme definitions** are consumed from the shared `@bcl32/themes` package via
  `presets: [require("@bcl32/themes/tailwind-preset")]` in `tailwind.config.js`
  (changed 2026-07-04 — previously this app hand-wired `tw-colors`' `createThemes(...)`
  inline with its own copy of **8** named themes). The shared preset exposes all
  **10** themes.json entries: `light`, `dark`, `green`, `yellow`, `purple`, `blue`,
  `dark-green`, `dark-blue`, `light-blue`, `light-gold` — the two this app's old
  inline config was missing are now available for free.
- The preset is configured with `produceCssVariable: (colorName) => '--${colorName}'`, so each color becomes a `--token` CSS variable consumed by Tailwind utilities (`bg-background`, `text-primary`, `bg-card`, etc.).
- The token set (`sidebar-*`, `chart-*`, `popover-*`, `card-*`, etc.) exactly matches the shadcn-style convention used by the other monorepo apps.
- `ThemeProvider` (from `@bcl32/themes`) persists the user selection to `localStorage` under the key `"vite-ui-theme"` and applies the active theme class to the document root. It is mounted in `Layout` with `defaultTheme="system"`.
- The `Theming` component (from `@bcl32/themes`) renders the in-app switcher, surfaced through a `DialogButton` in the sidebar footer.
- `index.css` seeds `--radius: 0.5rem` and global scrollbar colors (`scrollbar-color: hsl(var(--primary)) hsl(var(--accent))`) from the variables emitted by `tw-colors`.

---

## 5. Inconsistencies / Drift vs the Shared System

| # | Issue | Location | Severity |
| --- | --- | --- | --- |
| 1 | `Dockerfile.deps` installs `@bcl32/utils@^2.3.9` while `package.json` requires `^2.4.0`. A rebuild from the cached deps image layer runs a different `@bcl32/utils` than a fresh `npm install`. | `Dockerfile.deps` line 20 vs `package.json` line 16 | **Medium** |
| 2 | `@bcl32/hooks` is behind sibling apps: `^2.2.7` here vs `^2.3.0` in Print-Tracker and Security-Benchmarks. May miss fixes (e.g. `useGetRequest` `responseType` support). | `package.json` line 13 | Low |
| 3 | `ReactQueryDevtools` is rendered **outside** `BrowserRouter`/`ThemeProvider` (still inside `QueryClientProvider`), so it always renders in default light styling regardless of the active theme. | `src/main.jsx` line 35 | Low |
| 4 | `Layout` renders both `{children}` **and** `<Outlet />`. All routes go through `<Outlet />`, so the `children` prop is dead code (and a potential double-render trap). | `src/Layout.jsx` lines 13, 29–30 | Low |
| 5 | Leftover debug scrollbar color `scrollbar-color: #007 #bada55;` inside `@layer base :root`, immediately overridden by the theme-aware rule below it. | `src/index.css` line 48 | Low |
| 6 | `getLayoutColor(layout)` helper is duplicated verbatim in two files instead of being shared. | `src/TemplateGallery.jsx` lines 31–35 and `src/TemplateExplorer.jsx` lines 16–21 | Low |

> Note on #1: the `@bcl32/*` version pin in `Dockerfile.deps` should always equal the `package.json` caret. The `deps-sync` tooling exists precisely to close this "stale caret floor + Docker layer cache" gap.

---

## 6. Reinvented Wheels

| What | Location | Adopt instead |
| --- | --- | --- |
| `TemplateExplorer` calls `queryClient.prefetchQuery` with an inline raw `fetch()` to prefetch detail data on hover. `@bcl32/hooks` already wraps TanStack Query (`useGetRequest` handles `staleTime`/caching). A shared `queryOptions`/queryKey factory from the hook package should drive both prefetch and live query. | `src/TemplateExplorer.jsx` lines 197–205 | `@bcl32/hooks` |
| The canvas-style label preview (rendered from `bgColor`, `textColor`, `fontFamily`, `borderWidth`, `titleSize`, etc.) is duplicated in `TemplateGallery` (Dialog content) and `TemplateExplorer` (`TemplatePreview`) with only minor differences (scale transform vs fixed clamp). | `src/TemplateGallery.jsx` lines 96–128 and `src/TemplateExplorer.jsx` lines 67–118 | App-internal shared component (no external package needed) |

---

## 7. Prioritized Refactor Opportunities

Ordered by value-to-effort. All are estimated **Small (S)** effort. See [`../06-REFACTOR-PROPOSALS.md`](../06-REFACTOR-PROPOSALS.md) for cross-app tracking.

| # | Title | Rationale | Effort |
| --- | --- | --- | --- |
| 1 | Sync `@bcl32/*` pins between `package.json` and `Dockerfile.deps` | `Dockerfile.deps` installs `@bcl32/utils@^2.3.9` while `package.json` requires `^2.4.0`. They should always be identical to avoid surprise behavior from the cached deps image layer; a CI diff check would prevent recurrence. | S |
| 2 | Extract a shared `TemplateCanvas` component | The near-identical inline canvas preview lives in two files. A single component (with a `scale` prop for the explorer's scaled variant) removes the duplication so styling changes apply to both pages at once. | S |
| 3 | Extract `getLayoutColor` to a shared util (e.g. `src/utils/templateUtils.js`) | Copied verbatim into two files; extracting avoids drift if the layout type strings change. | S |
| 4 | Upgrade `@bcl32/hooks` to `^2.3.0` | Aligns with Print-Tracker and Security-Benchmarks; picks up hooks fixes (notably `useGetRequest` `responseType` support). | S |
| 5 | Remove the dead `{children}` path from `Layout` | All consumers are React Router routes using `<Outlet />`; dropping `children` removes confusion and a double-render risk. | S |
| 6 | Move `ReactQueryDevtools` inside `ThemeProvider` | Currently outside `Layout`'s `ThemeProvider`, so it always shows in default (light) style; relocating it makes the devtools respect the active theme. | S |

---

## 8. Additional UI Polish Notes

- **`index.css` line 48** — remove the leftover `scrollbar-color: #007 #bada55;` debug placeholder; the theme-aware rule below already supersedes it.
- **`TemplateGallery` loading state** shows a single small `Skeleton` spinner (`h-12 w-12 rounded-full`) centered on the page rather than skeleton card placeholders. It gives no sense of the incoming layout, unlike the richer `PreviewSkeleton` used in `TemplateExplorer`.
- **`CaffeineMeter` / `IntensityMeter`** fetch a new SVG on every slider tick (no debounce); rapid dragging fires many in-flight requests. A short debounce (100–200 ms) on the slider value before it updates the query key would cut API load.
- **`TemplateExplorer` hover handling** — `handleCardMouseEnter` fires `setHoveredTemplateId` (which triggers `useGetRequest`) and `queryClient.prefetchQuery` in the same 150 ms timeout callback, so the live query and the prefetch **race** on the same `["template-detail", id]` key; whichever resolves first wins and the other is redundant. They should be coordinated via a shared `queryOptions`/queryKey factory.
- **`index.html`** still references the default Vite favicon (`/vite.svg`); no app-specific icon has been set.
- **`framer-motion` 11.11.17** is declared in `package.json` but **not imported** anywhere in `src/` — dead weight in the production bundle; remove it or start using it.
