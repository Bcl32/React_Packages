# @bcl32/command-palette

> Reference doc for the `@bcl32/command-palette` package.
> Back to [Packages Overview](../00-OVERVIEW.md).

| | |
| --- | --- |
| **Package** | `@bcl32/command-palette` |
| **Version** | `1.0.0` (seed; first published version is the auto-patch bump) |
| **Tier** | top (depends on `utils`, `hooks`, `themes`) |

## Purpose

A Ctrl/Cmd+K command palette built on [`cmdk`](https://github.com/pacocoursey/cmdk).
It gives every app a single keyboard-driven surface for three things:

1. **Navigation** — jump to any route (usually derived from the app's sidebar).
2. **Actions** — arbitrary commands, including the built-in **theme switcher**.
3. **Entity search** — nested "search pages" that query an API list endpoint
   (server mode) or filter a fully-fetched list locally (client mode) and
   navigate to the picked record.

The palette is a controlled-by-itself component: it owns its open state and
installs its own window-level hotkey listener. A consumer renders it once,
somewhere inside the app's provider stack, and passes it data.

## Install & Import

This is a workspace package; consumers in the monorepo depend on the published
version (apps are not workspace members and resolve `@bcl32/*` from the GitHub
Packages registry).

```jsonc
// package.json (consumer)
{
  "dependencies": {
    "@bcl32/command-palette": "^1.0.1"
  }
}
```

```ts
// Barrel (recommended)
import {
  CommandPalette,
  flattenNavItems,
  useThemeCommands,
  type CommandEntry,
  type SearchSource,
} from "@bcl32/command-palette";
```

Subpath entry points are also published and resolve to the same exports:

```ts
import { CommandPalette } from "@bcl32/command-palette/CommandPalette";
import { flattenNavItems } from "@bcl32/command-palette/flattenNavItems";
import { useThemeCommands } from "@bcl32/command-palette/useThemeCommands";
import { EntitySearchPage } from "@bcl32/command-palette/EntitySearchPage";
import type { CommandEntry, SearchSource } from "@bcl32/command-palette/types";
```

> The package is built as **pure ESM** (`tsup` `format: esm`) with `@bcl32/*`
> dependencies externalized. `cmdk` and `lucide-react` are regular
> **dependencies**, so consumers get them transitively — no `package.base.json`
> or app-level install of `cmdk` is required.

## Public Exports

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `CommandPalette` | component | `({ commands, searchSources?, hotkey?, placeholder? }: CommandPaletteProps) => JSX.Element` | The palette itself. Renders nothing visible until the hotkey opens it. Owns open/search/page state. |
| `flattenNavItems` | function | `(items: NavLike[], group?: string) => CommandEntry[]` | Flattens a sidebar nav tree (`{title, url?, icon?, items?}`) into command entries. Skips url-less section headers, dedupes by `url`, defaults `group` to `"Navigation"`. |
| `useThemeCommands` | hook | `() => CommandEntry[]` | One command per entry in `theme_options`, plus `"system"`. Labels read `Theme: dark`. Must be called inside a `ThemeProvider`. |
| `EntitySearchPage` | component | `({ source, search, onPick }: EntitySearchPageProps) => JSX.Element` | The nested search page body. Rendered by `CommandPalette`; exported for custom shells. |
| `CommandEntry` | type (interface) | see below | A single root-level command. |
| `SearchSource` | type (interface) | see below | Declarative description of one searchable entity type. |

### `CommandPaletteProps`

| Prop | Type | Required | Default | Behaviour |
| --- | --- | --- | --- | --- |
| `commands` | `CommandEntry[]` | yes | — | Root-level commands. Grouped by `group` in **insertion order**. |
| `searchSources` | `SearchSource[]` | no | `[]` | Each one produces a `Search {label}…` item in a trailing `Search` group. Selecting it pushes a nested page. |
| `hotkey` | `string` | no | `"k"` | Single key that, with ctrl/cmd (and no shift/alt), toggles the palette. Compared lowercase. |
| `placeholder` | `string` | no | `"Type a command or search…"` | Root-page input placeholder. On a search page the placeholder becomes `Search {label}…`. |

### `CommandEntry` fields

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `id` | `string` | yes | Stable unique id, used as the cmdk item `value`. Convention: `"nav:/Route"`, `"theme-dark"`. |
| `label` | `string` | yes | Visible text; also fed to cmdk as a search keyword. |
| `group` | `string` | yes | Group heading (`"Navigation"`, `"Theme"`, …). Groups render in first-seen order. |
| `icon` | `LucideIcon` | no | Rendered at `h-4 w-4` before the label. |
| `keywords` | `string[]` | no | Extra fuzzy-match terms (in addition to `label`). |
| `to` | `string` | no | Router path; navigated to on select (via `useNavigate`). |
| `perform` | `() => void` | no | Custom action. **Takes precedence over `to`.** The palette always closes first, then runs it. |

### `SearchSource` fields

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `key` | `string` | yes | Unique page key (`"parts"`). |
| `label` | `string` | yes | Human label; the root item reads `Search {label}…`. |
| `icon` | `LucideIcon` | no | Defaults to lucide `Search`. |
| `listUrl` | `string` | yes | Absolute API list URL **without** a query string (e.g. `apiUrl("parts")`). A pre-existing `?` is handled (`&` is used instead). |
| `mode` | `"server" \| "client"` | no | `"server"` (default) appends `?search=<term>` and re-queries per debounced term. `"client"` fetches the list once and lets cmdk filter it. |
| `minChars` | `number` | no | Server mode default `2`, client mode default `0`. Below the threshold the page shows a hint and issues no request. |
| `maxResults` | `number` | no | Default `50`. Always applied — the list endpoints are unbounded. |
| `getLabel` | `(item) => string` | yes | Row label. |
| `getDescription` | `(item) => string \| undefined` | no | Right-aligned muted secondary text. |
| `getRoute` | `(item) => string` | yes | Router path navigated to when the row is picked. |

> Rows are keyed and valued by `String(item.id)`, so every searched entity must
> expose an `id`.

## Dependencies

### Internal (`@bcl32/*`)

| Package | Why |
| --- | --- |
| `@bcl32/utils` | `cn` class-merge helper only (no context / no provider requirement). |
| `@bcl32/hooks` | `useGetRequest` — the entity-search fetch layer (TanStack Query under the hood). |
| `@bcl32/themes` | `useTheme` from `@bcl32/themes/ThemeProvider`, used by `useThemeCommands`. |

### Peer dependencies

| Package | Range |
| --- | --- |
| `@radix-ui/react-dialog` | `^1.1.1` |
| `@tanstack/react-query` | `^5.18.1` |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `react-router-dom` | `^6.22.0` |

### External dependencies

| Package | Range | Why |
| --- | --- | --- |
| `cmdk` | `^1.1.1` | The command-menu primitive (list, input, groups, fuzzy scoring). |
| `lucide-react` | `^0.447.0` | `Palette` (theme commands) and `Search` (default search-source icon). |

### UI libraries

- **Radix** — `@radix-ui/react-dialog` composed manually around an inline
  `<Command>` (see caveats: `Command.Dialog` is deliberately not used).
- **Tailwind CSS** — all styling is `className` strings using the shared theme
  tokens (`bg-popover`, `text-muted-foreground`, `bg-accent`, `border-border`).

## Two-tier UX

**Root page** — fuzzy-filtered static commands, grouped:

```
Navigation   Parts, Spools, Systems, …
Theme        Theme: light, Theme: dark, …  (from useThemeCommands)
Search       Search Parts…, Search Plates…  (from searchSources)
```

**Search page** — selecting a `Search X…` item pushes a nested page
(the cmdk nested-pages pattern). The page shows a badge with the source label
next to the input and lists results:

- `mode: "server"` — the typed term is debounced 300 ms, appended as
  `?search=<term>`, and fetched with `useGetRequest`. cmdk's own filtering is
  turned **off** (`shouldFilter={false}`) because the backend already filtered.
- `mode: "client"` — the list URL is fetched once (stable URL → cached) and
  cmdk filters the rows locally.

**Popping the page:** `Escape` pops back to the root page (it does *not* close
the dialog while a page is open); `Backspace` on an empty input pops as well.
`Escape` at the root closes the palette. `Ctrl/Cmd+K` toggles it from anywhere.

Responses are accepted in either shape: a bare array, or the standard
`{ items: [...], total: n }` envelope.

## Conventions & Patterns

Things a consumer must follow:

1. **Mount inside `ThemeProvider` *and* a Router *and* a `QueryClientProvider`.**
   `useThemeCommands` reads theme context, `CommandPalette` calls `useNavigate`,
   and entity search uses TanStack Query. In every app this means rendering it
   inside `Layout.jsx`'s provider stack. Render it **once** per app.
2. **Use `data-[selected=true]:` / `data-[disabled=true]:` Tailwind variants.**
   cmdk always emits the `data-selected` attribute (`"true"` *or* `"false"`), so
   the bare `data-[selected]:` variant matches unselected items too. Any custom
   item styling must use the explicit `=true` form.
3. **Do not control the cmdk `value`.** The palette leaves selection
   uncontrolled on purpose; adding `value`/`onValueChange` to the `Command` root
   reintroduces the known selection-freeze bug.
4. **Stable `commands` array.** Build it with `useMemo` — the palette re-groups
   on every identity change of the array.
5. **`id`s must be unique across all groups.** They are the cmdk item values;
   duplicates make keyboard selection ambiguous.
6. **Always cap search results.** `maxResults` defaults to 50 because the list
   endpoints are unbounded (no `limit` param).

## Minimal Usage Example

```jsx
import React from "react";
import { CommandPalette } from "@bcl32/command-palette/CommandPalette";
import { flattenNavItems } from "@bcl32/command-palette/flattenNavItems";
import { useThemeCommands } from "@bcl32/command-palette/useThemeCommands";
import { Boxes } from "lucide-react";
import { navItems } from "../MainSidebar";
import { apiUrl } from "../config";

const searchSources = [
  {
    key: "parts",
    label: "Parts",
    icon: Boxes,
    listUrl: apiUrl("parts"),
    getLabel: (i) => i.name,
    getRoute: (i) => `/Parts/${i.id}`,
  },
];

export default function AppCommandPalette() {
  const themeCommands = useThemeCommands();
  const commands = React.useMemo(
    () => [...flattenNavItems(navItems), ...themeCommands],
    [themeCommands],
  );
  return <CommandPalette commands={commands} searchSources={searchSources} />;
}
```

Then render `<AppCommandPalette />` once inside the app `Layout`.

## Smells & Caveats

Known rough edges and deliberate design constraints:

- **`Command.Dialog` is deliberately unused.** cmdk's built-in dialog renders no
  `Dialog.Title` (Radix ≥ 1.1 logs an a11y error) and does not forward
  `onEscapeKeyDown`, which the nested-page pop depends on. The package composes
  `@radix-ui/react-dialog` manually and supplies an `sr-only` title plus
  `aria-describedby={undefined}`.
- **`vimBindings={false}` is required, not cosmetic.** cmdk enables vim bindings
  by default, where `Ctrl+K` moves the selection up — which would collide with
  the open/close hotkey.
- **`Ctrl+B` is swallowed inside the dialog.** `@bcl32/utils` `Sidebar` installs
  a *window-level* `Ctrl+B` sidebar toggle with no input-focus guard, so typing
  that chord in the palette would collapse the sidebar behind it. The dialog
  content stops propagation for ctrl/cmd+`b`. The underlying fleet-wide quirk
  (no input guard in `Sidebar`) still exists outside the palette.
- **Loading and empty states are hand-rolled on search pages.** With
  `shouldFilter={false}`, cmdk can render `Command.Empty` and `Command.Loading`
  simultaneously, so the search page gates its own "No matches." message on
  `data !== undefined` instead of using `Command.Empty`.
- **No first-item auto-selection on async results.** A known cmdk behaviour with
  `shouldFilter={false}`: freshly arrived server results start with nothing
  highlighted, so `Enter` does nothing until an arrow key or hover selects a row.
  This is accepted rather than worked around.
- **Fetch errors render as "No matches."** `useGetRequest`'s error state is
  ignored; a failed search is visually indistinguishable from an empty one.
- **`getLabel`/`getRoute`/`getDescription` take `any`.** The package has no
  knowledge of app entity shapes; there is no compile-time check that the fields
  you read actually exist on the response rows.
- **Hotkey matching is single-key only.** `hotkey` is compared against
  `event.key.toLowerCase()`, so only ctrl/cmd + one key is expressible; there is
  no way to require or forbid shift/alt beyond the built-in "neither pressed"
  rule.

---

See also: [Packages Overview](../00-OVERVIEW.md).
