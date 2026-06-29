# @bcl32/navigation

> Reference doc for the `@bcl32/navigation` package.
> Back to [Packages Overview](../00-OVERVIEW.md).

| | |
| --- | --- |
| **Package** | `@bcl32/navigation` |
| **Version** | `2.1.8` |
| **Tier** | mid |

## Purpose

Provides a React context-based navigation state manager and a breadcrumb UI
component that renders the current navigation stack. The breadcrumb is built
from `react-router-dom` `Link`s and the Radix-based `Breadcrumb` primitives
re-exported from `@bcl32/utils`.

The package is intentionally small (two source files): a context provider plus
hook (`NavigationProvider` / `useNavigation`) that hold a `NavigationEntry[]`
array, and a presentational `NavigationBreadcrumb` that reads that array and
renders it.

## Install & Import

This is a workspace package; consumers in the monorepo depend on it via the
workspace protocol and import from the package name.

```jsonc
// package.json (consumer)
{
  "dependencies": {
    "@bcl32/navigation": "workspace:^2.1.8"
  }
}
```

```ts
// Barrel (recommended)
import {
  NavigationProvider,
  useNavigation,
  NavigationBreadcrumb,
  type NavigationEntry,
} from "@bcl32/navigation";
```

Subpath entry points are also published and resolve to the same exports:

```ts
import { NavigationProvider, useNavigation } from "@bcl32/navigation/NavigationProvider";
import NavigationBreadcrumb from "@bcl32/navigation/NavigationBreadcrumb";
```

> The package is built as **pure ESM** (`tsup` `format: esm`) with `@bcl32/*`
> dependencies externalized. Consumers must have `@bcl32/utils` resolvable in
> their own bundler — it is **not** bundled into this package.

## Public Exports

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `NavigationProvider` | component | `({ children }: { children: React.ReactNode }) => JSX.Element` | Context provider holding the `NavigationEntry[]` state and its setter. Must wrap any component that calls `useNavigation` or renders `NavigationBreadcrumb`. |
| `useNavigation` | hook | `() => { navigation: NavigationEntry[]; setNavigation: React.Dispatch<React.SetStateAction<NavigationEntry[]>> }` | Returns the current navigation array and its setter. Throws if called outside `NavigationProvider` (guard is technically unreachable — see [Smells & Caveats](#smells--caveats)). |
| `NavigationEntry` | type (interface) | `interface NavigationEntry { type?: string; name: string; url?: string; id?: string \| number }` | Shape of a single breadcrumb entry. `url` drives link rendering; `id` is passed as router state; `type` renders a small label above `name`. |
| `NavigationBreadcrumb` | component | `(_props: { data?: unknown }) => JSX.Element` | Renders the current `navigation[]` array as a Radix/shadcn-style breadcrumb with `Slash` separators and `react-router-dom` `Link`s. Always prepends a `Home` link to `/`. The `data` prop is accepted but ignored (see [Smells & Caveats](#smells--caveats)). |

### `NavigationEntry` fields

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `name` | `string` | yes | The visible label for the entry. Rendered `capitalize`. |
| `type` | `string` | no | When present, renders a small `text-xs` label (`type:`) above the `name`. |
| `url` | `string` | no | When present, the entry renders as a `Link`; otherwise it renders as a non-clickable `BreadcrumbPage`. The value is prefixed with `/` (`to={"/" + entry.url}`) — **do not** include a leading slash. |
| `id` | `string \| number` | no | Passed as router location state (`state={{ object_id: entry.id }}`) on linked entries. |

## Dependencies

### Internal (`@bcl32/*`)

| Package | Why |
| --- | --- |
| `@bcl32/utils` | Provides the Radix-based `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbList`, `BreadcrumbPage`, and `BreadcrumbSeparator` primitives imported from `@bcl32/utils/Breadcrumb`. |

### Peer dependencies

| Package | Range |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `react-router-dom` | `^6.22.0` |

### External dependencies

| Package | Range | Why |
| --- | --- | --- |
| `lucide-react` | `^0.447.0` | Provides the `Slash` icon used as the breadcrumb separator. |

### UI libraries

- **Radix** — via the `Breadcrumb` primitives re-exported from `@bcl32/utils/Breadcrumb`.
- **Tailwind CSS** — `className` strings on the breadcrumb list (`text-xl text-foreground`) and the link-label `div`s (`flex flex-col`, `text-xs capitalize`, etc.).

## Conventions & Patterns

Things a consumer must follow:

1. **Provider placement.** `NavigationProvider` must be placed *above* any
   component that uses `useNavigation` or renders `NavigationBreadcrumb`. No
   automatic provider wrapping is performed.
2. **Imperatively drive state.** Consumers update the breadcrumb by calling
   `setNavigation` (from `useNavigation`) with a `NavigationEntry[]` array —
   typically inside a `useEffect` that fires on route or data changes.
3. **No leading slash in `url`.** `NavigationEntry.url` is prepended with `/`
   in the `Link` `to` prop (`to={"/" + entry.url}`), so `url` values must
   **not** start with a slash (use `"projects/42"`, not `"/projects/42"`).
4. **Read `id` downstream via router state.** `NavigationEntry.id` is passed as
   `state={{ object_id: entry.id }}` on linked entries, so the destination page
   can read it via `useLocation().state?.object_id`.
5. **`@bcl32/utils` must be resolvable.** Because the package externalizes
   `@bcl32/*`, the consumer's bundler must resolve `@bcl32/utils` (and its
   `./Breadcrumb` subpath) at build time.

## Minimal Usage Example

```tsx
import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import {
  NavigationProvider,
  useNavigation,
  NavigationBreadcrumb,
  type NavigationEntry,
} from "@bcl32/navigation";

// 1. Wrap the app (above anything that reads navigation state).
function App() {
  return (
    <BrowserRouter>
      <NavigationProvider>
        <NavigationBreadcrumb />
        <ProjectPage />
      </NavigationProvider>
    </BrowserRouter>
  );
}

// 2. Drive the breadcrumb imperatively from a page/route.
function ProjectPage() {
  const { setNavigation } = useNavigation();

  useEffect(() => {
    const trail: NavigationEntry[] = [
      // NOTE: no leading slash on `url`.
      { name: "Projects", url: "projects" },
      { type: "project", name: "Garage Sign", url: "projects/42", id: 42 },
    ];
    setNavigation(trail);
  }, [setNavigation]);

  return <div>Project detail…</div>;
}

// 3. The destination page reads the id from router state.
function ProjectDetail() {
  const location = useLocation();
  const objectId = location.state?.object_id; // 42
  return <div>Object id: {String(objectId)}</div>;
}
```

The rendered breadcrumb always begins with a `Home` link to `/`, followed by
each entry separated by a `Slash` icon. Entries with a `url` render as links;
entries without one render as the current (non-clickable) page.

## Smells & Caveats

Known rough edges in the current implementation, documented so consumers aren't
surprised:

- **Dead `data` prop.** `NavigationBreadcrumb`'s `data?: unknown` prop
  (`src/NavigationBreadcrumb.tsx:17`) is accepted but immediately discarded —
  the parameter is named `_props` and never read. It is dead API surface with
  no purpose; do not pass anything meaningful to it.
- **Unreachable provider guard.** The `useNavigation` guard
  `if (context === undefined)` (`src/NavigationProvider.tsx:45`) can never be
  true, because `createContext` is initialized with a non-`undefined`
  `initialState` object. Calling `useNavigation` outside a provider returns the
  inert `initialState` (whose `setNavigation` is a no-op `() => null`) rather
  than throwing — so the guard provides **no** runtime protection. Always
  ensure a real provider is mounted.
- **Invalid HTML nesting.** Each breadcrumb entry is wrapped in a
  `<div className="inline-flex …">` (`src/NavigationBreadcrumb.tsx:31-57`) that
  contains both the separator and the item. This inserts a block-level `div`
  as a direct child of `<BreadcrumbList>` (which renders an `<ol>`), violating
  HTML semantics — only `<li>` is a valid child of `<ol>`.
- **Unnecessary DOM depth.** `LinkLabel` always renders a
  `<div className="flex flex-col">` wrapper even when `entry.type` is absent and
  there is only a single `<span>` child (`src/NavigationBreadcrumb.tsx:67-82`),
  adding needless depth in the common case.
- **`NavigationContextValue` not exported.** The
  `NavigationContextValue` interface (`src/NavigationProvider.tsx:12`) is not
  exported, so consumers cannot type their own wrappers around `useNavigation`
  without duplicating its shape. Use `NavigationEntry` plus the inferred hook
  return type instead.
- **Asymmetric export style.** `src/index.ts` re-exports everything from
  `NavigationProvider` with `export *` but names `NavigationBreadcrumb`
  explicitly with `export { default as … }` — an inconsistent style within a
  two-file package.

---

See also: [Packages Overview](../00-OVERVIEW.md).
