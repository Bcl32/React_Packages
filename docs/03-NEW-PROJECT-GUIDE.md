# New Project Guide — Building a React App with `@bcl32/*`

A step-by-step guide for scaffolding a **new** React app inside the
`web-app-monorepo` and wiring it to the shared `@bcl32/*` package suite.

> **Repo root:** `/home/brandon/Projects/web-app-monorepo`
> **Shared packages:** `/home/brandon/Projects/web-app-monorepo/react-packages/*`

This guide is the front-to-back path: prerequisites → scaffold → workspace
membership → dependencies → providers → a full datatable + filters + forms CRUD
page → charts → build/deploy. It assumes the backend entity already exists (or
will be created in parallel) — for the API side see the **entity-lifecycle**
skill, which is the single source of truth for the SQLAlchemy → Pydantic →
FastAPI → `ModelData` flow that every `@bcl32/datatable` page consumes.

Where the **react-website-dev** skill already documents a step in depth, this
guide summarizes and cites it rather than restating it.

---

## 0. How this fits the system (read first)

Two skills govern almost everything below — do not contradict them:

| Skill | What it owns | Cited in sections |
|-------|-------------|-------------------|
| **react-website-dev** | Vite, Tailwind + tw-colors, TanStack Query, subpath imports, runtime config, ports, nginx/Docker | 1, 3, 4, 5, 8, 9, 10 |
| **entity-lifecycle** | DB model → Pydantic schema → FastAPI route → `schema_registry.json` → `ModelData.js` | 6, 7 |

The shared packages are pre-built TanStack-based building blocks. The **golden
rule** from react-website-dev: a `@bcl32/datatable` page is *data-driven* — it
is fed a `ModelData` object (generated from your backend schema) plus a dataset,
and it renders the table, the add/edit/delete dialogs, and the filter bar for
you. You write almost no table code; you write the `ModelData` (generated) and
a small `TableData` column-definition file.

---

## 1. Prerequisites

Per the react-website-dev **Stack Overview**, the pinned toolchain is:

| Tool | Version | Notes |
|------|---------|-------|
| pnpm | `9.15.0` | The repo root pins `packageManager: "pnpm@9.15.0"`. Use pnpm, never npm/yarn. |
| Node | 18.x | CI builds on Node 18; match locally. |
| Vite | 5.0.8 | Dev server + production build. |
| React | 18.2.0 | Functional components only. |
| React Router | 6.22.0 | Nested routes. |
| TanStack Query | 5.18.1 | Server state — always via `@bcl32/hooks`. |
| Tailwind | 3.4.1 + `tw-colors` | 8-theme system from `@bcl32/themes`. |
| Bun | latest | Only needed for `pnpm generate-schemas` (runs `bun ../../tools/generate-schemas.ts`). |

Authentication to the GitHub Packages registry is needed even inside the
workspace (pnpm reads `.npmrc` before it links local packages). Export a token
with `read:packages`:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

The root `.npmrc` already wires the scope and token (see §4); you only supply
the env var.

---

## 2. Choose a location & app shape

The convention (react-website-dev **Monorepo Structure**) is one directory per
app at the repo root, holding both the React app and its API:

```
web-app-monorepo/
├── My-App/
│   ├── my-app-react/        ← the Vite app you are creating
│   ├── my-app-api/          ← FastAPI backend (see entity-lifecycle)
│   ├── compose-dev.yml
│   └── compose-prod.yml
└── react-packages/          ← shared @bcl32/* libraries (do not edit here)
```

Name the React package `my-app-react` and the directory `My-App/` to match
Print-Tracker (`Print-Tracker/print-tracker-react`) and Label-Designer.

---

## 3. Scaffold a Vite app

> Summarized from react-website-dev **Development Commands** and **Vite
> Configuration**.

```bash
# from the repo root
mkdir -p My-App
cd My-App
pnpm create vite@5 my-app-react --template react   # plain JSX (matches Print-Tracker)
```

Then add the dev-time toolchain the shared packages expect:

```bash
cd My-App/my-app-react
pnpm add -D tailwindcss@3.4.1 postcss autoprefixer tw-colors @tailwindcss/forms
pnpm add @tanstack/react-query@5.18.1 @tanstack/react-query-devtools \
         react-router-dom@6.22.0 sonner dayjs recharts
npx tailwindcss init -p
```

> **Why these direct deps?** `@bcl32/*` packages declare React, TanStack Query,
> `dayjs`, `recharts`, `sonner`, and the Radix primitives as **peerDependencies**
> — the consumer app must install them. `recharts` is only needed if you use
> `@bcl32/charts` or chart-based filters. `sonner` is required by `@bcl32/forms`
> (toast notifications).

### `vite.config.js`

The base path is driven by `APP_BASE_PATH` and the dev server proxies `/fastapi`
to the API (react-website-dev **Vite Configuration**). Local-package aliasing is
opt-in via `USE_LOCAL_PACKAGES`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const useLocalPackages = process.env.USE_LOCAL_PACKAGES === "true";

// Alias @bcl32/* to source for hot reload while editing shared packages.
const localPackageAliases = useLocalPackages
  ? {
      "@bcl32/utils": path.resolve(__dirname, "../../react-packages/utils/src"),
      "@bcl32/hooks": path.resolve(__dirname, "../../react-packages/hooks/src"),
      "@bcl32/data-utils": path.resolve(__dirname, "../../react-packages/data-utils/src"),
      "@bcl32/forms": path.resolve(__dirname, "../../react-packages/forms/src"),
      "@bcl32/datatable": path.resolve(__dirname, "../../react-packages/datatable/src"),
      "@bcl32/filters": path.resolve(__dirname, "../../react-packages/filters/src"),
      "@bcl32/charts": path.resolve(__dirname, "../../react-packages/charts/src"),
      "@bcl32/themes": path.resolve(__dirname, "../../react-packages/themes/src"),
      "@bcl32/navigation": path.resolve(__dirname, "../../react-packages/navigation/src"),
    }
  : {};

export default defineConfig({
  base: process.env.APP_BASE_PATH || "/",
  plugins: [react()],
  resolve: { alias: { ...localPackageAliases } },
  server: {
    port: 3000,
    proxy: {
      "/fastapi": {
        target: "http://my-app-api:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fastapi/, ""),
      },
    },
  },
});
```

> **`@bcl32/hooks` makes raw `fetch` calls with the URL you pass** — it does not
> prepend a base. `apiFetch` calls `fetch(input, opts)` directly. That is why
> every request URL goes through `/fastapi/...` (dev: Vite proxy strips the
> prefix; prod: nginx/Traefik strips it). Build URLs with `apiUrl(...)` from your
> `config.js` (see §5), never hardcode hosts (react-website-dev **Anti-Patterns**).

---

## 4. Add the app to the workspace & install `@bcl32/*` deps

### 4a. Register in `pnpm-workspace.yaml`

The root `pnpm-workspace.yaml` currently lists only the nine `react-packages/*`
libraries. Add your app so pnpm can link the workspace packages locally:

```yaml
# /home/brandon/Projects/web-app-monorepo/pnpm-workspace.yaml
packages:
  - "react-packages/utils"
  - "react-packages/data-utils"
  - "react-packages/hooks"
  - "react-packages/charts"
  - "react-packages/datatable"
  - "react-packages/filters"
  - "react-packages/forms"
  - "react-packages/navigation"
  - "react-packages/themes"
  - "My-App/my-app-react"        # ← add your app
```

### 4b. `.npmrc` settings

The root `.npmrc` is already configured — your app inherits it. It contains:

```ini
@bcl32:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
link-workspace-packages=true
prefer-workspace-packages=true
```

- `@bcl32:registry=...` — where to fetch published `@bcl32` tarballs (CI / Docker).
- `link-workspace-packages=true` + `prefer-workspace-packages=true` — locally,
  pnpm symlinks the in-repo source instead of hitting the registry.

You do **not** need a per-app `.npmrc`; the root one applies workspace-wide.

### 4c. Declare the `@bcl32/*` dependencies

Because your app is now a **workspace member**, use the `workspace:^` protocol so
pnpm always resolves the local copy and never the registry. Add to
`My-App/my-app-react/package.json`:

```jsonc
{
  "dependencies": {
    "@bcl32/utils":      "workspace:^2.4.4",
    "@bcl32/data-utils": "workspace:^2.1.10",
    "@bcl32/hooks":      "workspace:^2.3.0",
    "@bcl32/charts":     "workspace:^2.1.6",
    "@bcl32/datatable":  "workspace:^2.7.2",
    "@bcl32/filters":    "workspace:^3.1.2",
    "@bcl32/forms":      "workspace:^2.6.1",
    "@bcl32/navigation": "workspace:^2.1.8",
    "@bcl32/themes":     "workspace:^2.1.5"
  }
}
```

> **`workspace:^` vs plain `^` — pick by membership.** pnpm strips
> `workspace:^X.Y.Z` to a bare caret range when it publishes a tarball, but
> `workspace:` is **invalid to plain npm** (e.g. in a Docker build that runs
> `npm install`). Two rules:
> - **App is in `pnpm-workspace.yaml`** → use `workspace:^X.Y.Z` (this guide).
> - **App is NOT in the workspace** (e.g. `Base-POC/image-poc-react`, or an app
>   whose Docker image is built with `npm`) → use **plain carets** `^X.Y.Z`.
>   Print-Tracker uses plain carets for exactly this reason.
>
> ⚠️ The `workspace:^` floor versions above are the **current published
> versions**; some inter-package floors inside `react-packages/*` lag behind
> (documented in `PACKAGE-MODEL.md`). Locally this is irrelevant — the workspace
> linker resolves to source regardless of the floor.

Install:

```bash
# from the repo root
pnpm install
```

### 4d. Dependency graph (build/awareness order)

`pnpm -r build` resolves this automatically via topological ordering, but it
helps to know the layering when reasoning about what pulls in what:

| Tier | Packages | Depends on |
|------|----------|-----------|
| 0 (foundational) | `utils`, `data-utils`, `hooks` | nothing (`@bcl32`-wise) |
| 1 (mid) | `themes`, `navigation` → `utils`; `charts` → `utils` + `hooks` | tier 0 |
| 2 (composite) | `forms` → `utils`+`hooks`+`data-utils`; `datatable` → `forms`+`utils`+`hooks`+`data-utils`; `filters` → `charts`+`utils`+`hooks`+`data-utils` | tiers 0–1 |

So a CRUD page implicitly pulls in the whole tree: `datatable` → `forms` →
`utils`/`hooks`/`data-utils`, and `filters` → `charts`.

---

## 5. Runtime config module (`src/config.js`)

> Summarized from react-website-dev **Runtime Configuration**. The pattern lets
> Docker images change config without rebuilding: `docker-entrypoint.sh` writes
> `window.__RUNTIME_CONFIG__` from `APP_*` env vars, `index.html` loads
> `config.js` before the bundle, and `src/config.js` reads it with fallbacks.

```js
// src/config.js
const rc = (typeof window !== "undefined" && window.__RUNTIME_CONFIG__) || {};
const get = (key, fallback) => (rc[key] != null && rc[key] !== "" ? rc[key] : fallback);

export const config = {
  BASE_PATH:      get("APP_BASE_PATH", "/"),
  API_URL:        get("APP_API_URL", ""),     // empty → use BASE_PATH + "fastapi/"
  APP_TITLE:      get("APP_TITLE", "My App"),
  APP_ENV:        get("APP_ENV", ""),
  SHOW_BANNER:    get("APP_SHOW_BANNER", "true") === "true",
  BANNER_VARIANT: get("APP_BANNER_VARIANT", "info"),
};

// Build a fully-qualified API URL. Defaults to the `/fastapi/` proxy prefix.
export function apiUrl(endpoint) {
  const base = config.API_URL || `${config.BASE_PATH.replace(/\/$/, "")}/fastapi/`;
  return `${base.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
}
```

`APP_BASE_PATH` is the single source of truth — Vite reads it at build time
(`base:` in §3), React reads it at runtime here, and FastAPI derives
`root_path` from it. Do **not** invent `VITE_BASE_PATH` / `APP_ROOT_PATH`
(react-website-dev **Anti-Patterns**).

---

## 6. Tailwind + theme configuration (`tw-colors`)

> Summarized from react-website-dev **Theme System (tw-colors)** and **Tailwind
> Config Pattern**.

`@bcl32/themes` ships **8 base themes**: `light`, `dark`, `green`, `yellow`,
`purple`, `blue`, `dark-green`, `dark-blue`. Apps may add their own (Print-Tracker
adds `light-blue` and `light-gold`).

### `tailwind.config.js`

Two facts about the **real** monorepo setup (matching Print-Tracker):

1. The content globs must include **both** `node_modules/@bcl32` (prod /
   non-aliased) **and** `react-packages/*/src` (local-dev aliases) — otherwise
   classes used only inside package components are purged. The unused path is a
   silent no-op when its directory is absent.
2. `createThemes` is configured with `produceCssVariable: (n) => `--${n}`` and
   themes are applied via a **`data-theme` attribute** (not a class — see §7).

```js
/** @type {import('tailwindcss').Config} */
const { createThemes } = require("tw-colors");

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@bcl32/**/*.{js,ts,jsx,tsx}",   // prod / published packages
    "../../react-packages/*/src/**/*.{js,ts,jsx,tsx}", // local dev (USE_LOCAL_PACKAGES)
  ],
  theme: { extend: {} },
  plugins: [
    require("@tailwindcss/forms"), // strips OS chrome from <select>/<input>
    createThemes(
      {
        // Define the HSL token sets per theme. The token names below are the
        // theme contract consumed by every @bcl32 component.
        light: {
          background: "hsl(229 57% 100%)",
          foreground: "hsl(229 63% 4%)",
          card: "hsl(0 0% 99%)",
          "card-foreground": "hsl(229 63% 3%)",
          primary: "hsl(229 100% 62%)",
          "primary-foreground": "hsl(0 0% 100%)",
          // ...muted, popover, secondary, accent, destructive, border, input,
          // ring, chart-1..5, sidebar-* — copy the full set from
          // Print-Tracker/print-tracker-react/tailwind.config.js
        },
        dark: { /* ... */ },
        // green, yellow, purple, blue, dark-green, dark-blue ...
      },
      {
        produceCssVariable: (colorName) => `--${colorName}`,
      }
    ),
  ],
};
```

> **Token contract.** Every `@bcl32` component styles itself with theme tokens —
> never hardcoded colors. The available tokens are: `background`, `foreground`,
> `muted`/`muted-foreground`, `card`/`card-foreground`,
> `popover`/`popover-foreground`, `primary`/`primary-foreground`,
> `secondary`/`secondary-foreground`, `accent`/`accent-foreground`,
> `destructive`/`destructive-foreground`, `border`, `input`, `ring`, `chart-1`
> through `chart-5`, and the `sidebar-*` variants. Use `bg-primary`,
> `text-card-foreground`, `border-border`, etc. — not `bg-blue-500`
> (react-website-dev **Anti-Patterns**). The fastest correct start is to copy
> the entire `createThemes({...})` block out of
> `/home/brandon/Projects/web-app-monorepo/Print-Tracker/print-tracker-react/tailwind.config.js`.

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 7. Providers: TanStack Query, Theme, Navigation, Router

### `src/main.jsx` — QueryClient + Router

> Pattern from react-website-dev **Routing Pattern** and Print-Tracker's
> `main.jsx`.

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";              // required by @bcl32/forms
import { config } from "./config";
import Layout from "./Layout";
import Items from "./pages/Items";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
});

function MainApp() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* basename respects APP_BASE_PATH for subpath deployments */}
      <BrowserRouter basename={config.BASE_PATH.replace(/\/$/, "")}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Items />} />
            <Route path="Items" element={<Items />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MainApp />
  </React.StrictMode>
);
```

### `src/Layout.jsx` — Theme + Navigation providers

`ThemeProvider` and `NavigationProvider` come from the theme/navigation
packages. Note the **real** API:

- `ThemeProvider` props: `defaultTheme` (`"system"` resolves to OS light/dark),
  `storageKey` (defaults to `"vite-ui-theme"`). It applies the theme by setting
  `document.documentElement` **`data-theme`** — this matches the tw-colors
  `produceCssVariable` config in §6. `useTheme()` returns
  `{ theme, theme_options, theme_type, setTheme }`.
- `NavigationProvider` exposes `useNavigation()` → `{ navigation, setNavigation }`
  where each entry is `{ type?, name, url?, id? }`. `NavigationBreadcrumb` is the
  **default export** of `@bcl32/navigation/NavigationBreadcrumb`.

```jsx
import { Outlet } from "react-router-dom";
import { ThemeProvider, useTheme } from "@bcl32/themes/ThemeProvider";
import { ThemeDropdownSelect } from "@bcl32/themes/ThemeDropdownSelect";
import { NavigationProvider } from "@bcl32/navigation/NavigationProvider";
import NavigationBreadcrumb from "@bcl32/navigation/NavigationBreadcrumb";
import { Separator } from "@bcl32/utils/Separator";

export default function Layout() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <NavigationProvider>
        <div className="min-h-screen bg-background text-foreground">
          <header className="flex h-16 items-center gap-2 px-4 border-b border-border">
            <NavigationBreadcrumb />
            <div className="ml-auto">
              <ThemeDropdownSelect />
            </div>
          </header>
          <main className="w-full min-w-0 p-4">
            <Outlet />
          </main>
        </div>
      </NavigationProvider>
    </ThemeProvider>
  );
}
```

> **Subpath imports only.** Every import above uses the package subpath
> (`@bcl32/themes/ThemeProvider`), never the barrel (`@bcl32/themes`). The
> packages are built with tsup `splitting: true` and a full `exports` subpath
> map; barrel imports defeat tree-shaking and pull in the whole package
> (react-website-dev **Using Packages**). Subpath resolution depends on
> `moduleResolution: "bundler"` — already set in
> `react-packages/tsconfig.base.json`.

---

## 8. The backend `ModelData` (entity-lifecycle)

A `@bcl32/datatable` + `@bcl32/filters` + `@bcl32/forms` CRUD page is driven by a
**`ModelData`** object generated from your backend schema. You do not hand-write
it. Per the **entity-lifecycle** skill, the flow is:

```
SQLAlchemy model (db_models.py)
  → Pydantic Base/Create/Update/Response schemas (schemas/{entity}.py)
  → FastAPI CRUD router (routes/{entity}.py, wired in main.py)
  → schema_registry.json   (./tools/generate-registry.sh)
  → API /schema/all endpoint
  → src/metadata/{Entity}ModelData.js   (pnpm generate-schemas)
```

Two generation commands (run with the API container up):

```bash
# 1. Regenerate the registry (from the repo root). Pass --skip for junction tables.
./tools/generate-registry.sh --project My-App --service my-app-api

# 2. Regenerate the frontend ModelData files (from the React app)
cd My-App/my-app-react && pnpm generate-schemas
```

Add the script to `package.json` (point it at your API's `/schema/all`):

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "generate-schemas": "bun ../../tools/generate-schemas.ts --api-url https://localhost:8443/my-app/fastapi --output src/metadata"
  }
}
```

The generated `src/metadata/{Entity}ModelData.js` is an ES module whose default
export carries the five API URL keys the table/forms need — note the **exact**
key names (entity-lifecycle: *"NOT `get_url`/`post_url`"*):

```js
// Auto-generated by generate-schemas.ts — do not edit manually
import { apiUrl } from "../config";

export default {
  "model_name": "Item",
  "set_name": "Items",
  "chart_filters": [],
  "api_url_base":   apiUrl("items/"),
  "get_api_url":    apiUrl("items/"),
  "add_api_url":    apiUrl("items/"),
  "delete_api_url": apiUrl("items/delete"),
  "update_api_url": apiUrl("items"),       // EditModelForm appends "/" + id
  "model_attributes": [
    {
      "name": "name", "type": "string", "title": "Name",
      "editable": true, "filter": true, "filter_type": "string",
      "filter_rule": "contains", "primaryFilter": true
    }
    // ... one entry per field; references/options drive dropdowns & filters
  ]
};
```

> A field's `editable` flag is derived from the Pydantic **`Update`** schema —
> fields absent from `{Entity}Update` render read-only. See entity-lifecycle
> Step 4 for the full registry field reference (`display_field`,
> `field_overrides`, `collections`, etc.) and the junction-table `--skip`
> guidance.

---

## 9. A full CRUD page — DataTable + filters + forms

This is the canonical composition, exactly as Print-Tracker's list pages do it.
Three pieces:

1. **Data load** — `useGetRequest` from `@bcl32/hooks` fetches the list.
2. **Columns** — a small `TableData` file builds columns via `ColumnGenerator`
   (which auto-injects select/edit/actions columns and wires the edit dialog to
   `EditModelForm`).
3. **Filters** — `useEntityFilters` + `useDataTableFilterBar` produce the filtered
   dataset and the toolbar/panel object the table consumes.
4. **Render** — `DataTable` ties it together and provides add/bulk-edit/delete
   dialogs from `@bcl32/forms`.

### 9a. Columns: `src/components/tables/ItemsTableData.jsx`

`ColumnGenerator` takes your `custom_columns` (built with TanStack's
`createColumnHelper`) and returns the full `ColumnDef[]` with select/edit/actions
columns prepended/appended. Its props are:
`{ custom_columns, query_invalidation, ModelData, add_edit?, onEditSuccess? }`,
and `ModelData` must include an `update_api_url` (the generated one does).

```jsx
import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ColumnGenerator } from "@bcl32/datatable/ColumnGenerator";
import ModelData from "../../metadata/ItemModelData";

export function ItemsTableData({ query_invalidation, add_api_url, create_enabled = true }) {
  const columnHelper = createColumnHelper();

  const custom_columns = [
    columnHelper.accessor("name", {
      header: () => <span>Name</span>,
      cell: ({ row }) => (
        <Link to={`/Items/${row.original.id}`} className="hover:underline font-medium">
          {row.original.name}
        </Link>
      ),
    }),
    columnHelper.accessor("status", {
      header: () => <span>Status</span>,
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-accent text-accent-foreground">
          {row.original.status}
        </span>
      ),
    }),
  ];

  const columns = ColumnGenerator({
    custom_columns,
    query_invalidation,
    ModelData,          // carries update_api_url → drives the edit dialog
  });

  return {
    columns,
    create_enabled,
    add_api_url,
    query_invalidation,
    defaultSort: "time_created",
    columnVisibility: {},          // optional: hide columns by id
    expandOnRowClick: false,
  };
}
```

### 9b. The page: `src/pages/Items.jsx`

```jsx
import { useGetRequest } from "@bcl32/hooks/useGetRequest";
import { DataTable } from "@bcl32/datatable/DataTable";
import { useEntityFilters } from "@bcl32/filters/useEntityFilters";
import { useDataTableFilterBar } from "@bcl32/filters/DataTableFilterBar";
import ModelData from "../metadata/ItemModelData";
import { ItemsTableData } from "../components/tables/ItemsTableData";

export default function Items() {
  // queryKey defaults to [url]; mutations invalidate the same key.
  const { data, error } = useGetRequest(ModelData.get_api_url, {
    queryKey: [ModelData.get_api_url],
  });
  const dataset = data?.items;   // ListResponse[T] → { items, total }

  const table = ItemsTableData({
    add_api_url: ModelData.add_api_url,
    query_invalidation: [ModelData.get_api_url],
  });

  // useEntityFilters processes the dataset against the ModelData schema.
  const {
    filters, changeFilters, filteredData, activeFilters, filteredCount, totalCount,
  } = useEntityFilters(dataset, ModelData);

  // useDataTableFilterBar turns that state into the { toolbar, panel,
  // filteredCount, totalCount } object DataTable's `filter` prop expects.
  const filter = useDataTableFilterBar({
    filters, changeFilters, activeFilters, filteredCount, totalCount,
  });

  if (error) return <p className="text-destructive p-8">{error.message}</p>;
  if (!Array.isArray(dataset)) return <p className="text-muted-foreground p-8">Loading…</p>;

  return (
    <div className="bg-card rounded-lg border border-border p-4 h-[calc(100vh-8rem)] flex flex-col">
      <DataTable
        title={ModelData.set_name}
        ModelData={ModelData}
        columns={table.columns}
        tableData={filteredData}
        filter={filter}
        create_enabled={table.create_enabled}
        add_api_url={table.add_api_url}
        query_invalidation={table.query_invalidation}
        defaultSort={table.defaultSort}
        columnVisibility={table.columnVisibility}
        bulk_delete_enabled
        virtualized
      />
    </div>
  );
}
```

**What you get for free** from `DataTable` (toolbar-integrated dialogs from
`@bcl32/forms`): an **Add** button (renders `AddModelForm` against `add_api_url`),
a per-row **Edit** dialog (`EditModelForm` against `update_api_url`), **Bulk
Edit** (`BulkEditModelForm`), and **Delete**. Column visibility toggle, row
selection, sorting, pagination, optional virtualization, and expandable rows
(`renderSubComponent` / `expandOnRowClick`) are also built in.

> **Cache invalidation contract** (entity-lifecycle Step 5): use the **same key**
> in `useGetRequest`'s `queryKey` and the table's `query_invalidation` /
> `add_api_url` flow. Here both are `[ModelData.get_api_url]`, so any add/edit/
> delete refetches the list automatically.

### 9c. Hooks cheat-sheet (`@bcl32/hooks`)

> Summarized from react-website-dev **Hook Selection Guide**. All hooks wrap
> TanStack Query with typed `ApiError` handling for 4xx responses.

| Hook | Import subpath | Use for |
|------|----------------|---------|
| `useGetRequest` | `@bcl32/hooks/useGetRequest` | Any GET. Options: `queryKey`, `enabled`, `staleTime`, `responseType: "json" \| "text"`. Returns `UseQueryResult<T, ApiError>`. |
| `useApiMutation` | `@bcl32/hooks/useApiMutation` | Any mutation; data passed at `mutate()` time. Options: `method`, `invalidateKeys`. |
| `useDatabaseMutation` | `@bcl32/hooks/useDatabaseMutation` | Form data bound at hook init; always invalidates a cache key. `mutate()` takes no args. |
| `useOptionsEnrichment` | `@bcl32/hooks/useOptionsEnrichment` | Enriches `ModelData` reference fields with fetched option lists (used internally by `useEntityFilters`). |
| `useBokehChart` | `@bcl32/hooks/useBokehChart` | Fetch Bokeh chart data (POST + graph options). |

The forms package consumes these internally; when you need a hand-coded mutation
outside the data-driven table, use `useApiMutation` directly:

```jsx
import { useApiMutation } from "@bcl32/hooks/useApiMutation";

const create = useApiMutation(ModelData.add_api_url, {
  method: "POST",
  invalidateKeys: [ModelData.get_api_url],
});
create.mutate({ name: "New Item", status: "draft" });
```

> Avoid `useEffect`-based fetching or raw `useQuery`/`useMutation` with inline
> `fetch` — use these hooks (react-website-dev **Anti-Patterns**).

---

## 10. Adding charts (`@bcl32/charts`)

`@bcl32/charts` exposes two systems via two subpaths:

| Export | Subpath | Use for |
|--------|---------|---------|
| `BokehLineChart` | `@bcl32/charts/BokehLineChart` | Server-rendered Bokeh line chart with built-in controls (pairs with `useBokehChart`). |
| `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle` + types `ChartConfig` / `ChartConfigItem` | `@bcl32/charts/Charts` | shadcn-style **recharts** wrapper for themeable compositions. |

The recharts wrapper maps a `ChartConfig` to the theme's `chart-1..5` tokens:

```jsx
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@bcl32/charts/Charts";
import { Bar, BarChart, XAxis } from "recharts";

const chartConfig = {
  count: { label: "Count", color: "hsl(var(--chart-1))" },
};

function ItemsByMonth({ data }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
```

> `recharts` is a **peerDependency** of both `charts` and `filters` — it must be
> installed in your app (done in §3). Chart-based filters (`BarChartFilter`,
> `LineChartFilter`, `PieChartFilter`, `Histogram`, etc.) live in
> `@bcl32/filters` and are configured per field through the `chart_filters` key
> in `ModelData`.

---

## 11. Build & deploy

> Summarized from react-website-dev **Development Commands**, **Production
> Deployment**, and **Ports & Interfaces**.

### Local dev

```bash
# React only (proxies /fastapi → my-app-api:8000)
cd My-App/my-app-react && pnpm dev

# Editing shared packages live (Vite aliases @bcl32/* to source)
USE_LOCAL_PACKAGES=true pnpm dev

# Full stack via Docker Compose (browser → https://localhost:8443)
docker compose -f compose-dev.yml up
```

### Production build

```bash
cd My-App/my-app-react
APP_BASE_PATH=/my-app/ pnpm build     # outputs static dist/
```

The production image is multi-stage: build the Vite `dist/` then serve it with
nginx (SPA fallback, gzip, immutable asset caching, never-cached `config.js`,
`/fastapi/` proxy). Copy `nginx.conf`, `Dockerfile`, and `docker-entrypoint.sh`
from Print-Tracker and substitute the app slug — the templates are in
react-website-dev **Production Deployment**. In prod/K8s the outer
nginx/Traefik strips the `/my-app/` prefix before proxying; `APP_BASE_PATH`
keeps Vite asset paths, React routing (`basename`), and FastAPI `root_path`
aligned.

### Ports (quick reference)

| Environment | URL | Notes |
|-------------|-----|-------|
| Compose Dev | `https://localhost:8443` | Self-signed cert, Vite HMR on :3000 internal |
| Compose Prod | `https://localhost:8443` | nginx serves static `dist/` on :80 internal |
| K8s Prod | `https://my-app.local` | Traefik IngressRoute, strip-prefix `/my-app` |

---

## 12. Shared-package publishing (only if you edit `react-packages/*`)

If your work changes a `@bcl32/*` package itself (not just your app), the
publish path is automatic on push to `main`: a **post-commit git hook** generates
a patch-level changeset for every commit touching a package directory, and CI
(`react-packages/.github/workflows/publish-react-packages.yml`) runs
`pnpm -r build` (topological) then `pnpm -r publish` to GitHub Packages. For a
minor/major bump, run `pnpm changeset` manually **before** committing (the
auto-hook only ever produces patch bumps). See the **npm-publishing** and
**release-pipeline** skills for the full flow. After a publish, run the
**deps-sync** workflow to bump consumer carets / Docker deps layers.

> Editing a shared package is **out of scope for a new app** — building the app
> needs no publishing. Only project code (pages, `ModelData`, columns) changed
> → no publish required (entity-lifecycle Step 6).

---

## Checklist

- [ ] `GITHUB_TOKEN` exported (read:packages)
- [ ] App scaffolded at `My-App/my-app-react` (Vite + React 18)
- [ ] Added to `pnpm-workspace.yaml`
- [ ] `@bcl32/*` deps declared with `workspace:^` (workspace member) and `pnpm install` run
- [ ] `vite.config.js`: `base` from `APP_BASE_PATH`, `/fastapi` proxy, optional local aliases
- [ ] `src/config.js` runtime config + `apiUrl()`
- [ ] `tailwind.config.js`: content globs (both paths) + `createThemes` with `data-theme`
- [ ] Providers wired: `QueryClientProvider` → `BrowserRouter` (basename) → `ThemeProvider` → `NavigationProvider`, plus `<Toaster />`
- [ ] Backend entity built (entity-lifecycle) and `ModelData.js` generated
- [ ] CRUD page: `useGetRequest` + `ColumnGenerator` + `useEntityFilters` + `useDataTableFilterBar` + `DataTable`
- [ ] Subpath imports everywhere; theme tokens (no hardcoded colors)
- [ ] Production build with `APP_BASE_PATH=/my-app/` + nginx/Docker templates
```