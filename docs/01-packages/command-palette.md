# @bcl32/command-palette

> Reference doc for the `@bcl32/command-palette` package.
> Back to [Packages Overview](../00-OVERVIEW.md).

| | |
| --- | --- |
| **Package** | `@bcl32/command-palette` |
| **Version** | `1.0.x` (changeset-managed; always `npm view` before pinning a consumer) |
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
import { SequenceHUD } from "@bcl32/command-palette/SequenceHUD";
import { LeaderGrid } from "@bcl32/command-palette/LeaderGrid";
import { buildShortcutTrie } from "@bcl32/command-palette/shortcutTrie";
import { useShortcutSequencer } from "@bcl32/command-palette/useShortcutSequencer";
import type { CommandEntry, SearchSource, ShortcutNode } from "@bcl32/command-palette/types";
```

> The package is built as **pure ESM** (`tsup` `format: esm`) with `@bcl32/*`
> dependencies externalized. `cmdk` and `lucide-react` are regular
> **dependencies**, so consumers get them transitively — no `package.base.json`
> or app-level install of `cmdk` is required.

## Public Exports

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `CommandPalette` | component | `({ commands, searchSources?, hotkey?, placeholder?, enableGlobalAliases?, enableNumberedResults?, shortcutTrees?, sequenceHints?, hintDelayMs?, leaderKey?, prefixLabels? }: CommandPaletteProps) => JSX.Element` | The palette itself. Renders nothing visible until the hotkey opens it. Owns open/search/page state, the shortcut trie, and both hint surfaces. |
| `flattenNavItems` | function | `(items: NavLike[], group?: string) => CommandEntry[]` | Flattens a sidebar nav tree (`{title, url?, icon?, items?}`) into command entries. Skips url-less section headers, dedupes by `url`, defaults `group` to `"Navigation"`. |
| `useThemeCommands` | hook | `() => CommandEntry[]` | One command per entry in `theme_options`, plus `"system"`. Labels read `Theme: dark`. Must be called inside a `ThemeProvider`. |
| `EntitySearchPage` | component | `({ source, search, onPick }: EntitySearchPageProps) => JSX.Element` | The nested search page body. Rendered by `CommandPalette`; exported for custom shells. |
| `SequenceHUD` | component | `({ path, node, activation, delayMs?, enterKey }: SequenceHUDProps) => JSX.Element \| null` | The which-key bottom panel, portalled to `document.body`. Rendered by `CommandPalette` when `sequenceHints === "hud"`. |
| `LeaderGrid` | component | `({ open, path, node, rootLabel, enterKey, onClose }: LeaderGridProps) => JSX.Element` | The leader-key modal menu. Rendered by `CommandPalette` when `leaderKey` is set. |
| `buildShortcutTrie` | function | `(opts: BuildShortcutTrieOptions) => TrieNode` | Expands aliases + `shortcutTrees` into the key-sequence trie. Dev alias validation is a side effect of building. |
| `useShortcutSequencer` | hook | `(opts: UseShortcutSequencerOptions) => SequencerState & SequencerControls` | The global key-sequence engine (one window listener, refs for mutable state). Exported for custom shells. |
| `CommandEntry` | type (interface) | see below | A single root-level command. |
| `SearchSource` | type (interface) | see below | Declarative description of one searchable entity type. |
| `ShortcutNode` | type (interface) | see below | One node of an explicit `shortcutTrees` branch. |
| `TrieNode` / `TrieAction` | type (interface / union) | see [Sequence hints & leader grid](#sequence-hints--leader-grid) | The built trie and what a leaf fires. |

### `CommandPaletteProps`

| Prop | Type | Required | Default | Behaviour |
| --- | --- | --- | --- | --- |
| `commands` | `CommandEntry[]` | yes | — | Root-level commands. Grouped by `group` in **insertion order**. |
| `searchSources` | `SearchSource[]` | no | `[]` | Each one produces a `Search {label}…` item in a trailing `Search` group. Selecting it pushes a nested page. |
| `hotkey` | `string` | no | `"k"` | Single key that, with ctrl/cmd (and no shift/alt), toggles the palette. Compared lowercase. |
| `placeholder` | `string` | no | `"Type a command or search…"` | Root-page input placeholder. On a search page the placeholder becomes `Search {label}…`. |
| `enableGlobalAliases` | `boolean` | no | `true` | Installs the window-level listener that fires `alias` key sequences while the palette is **closed**. Set `false` to keep aliases as a Tab-only, in-palette feature. |
| `enableNumberedResults` | `boolean` | no | `true` | Numbers the first 9 visible results (badges `1`–`9` in visual order) and runs the Nth one on `Shift+1..9` while the palette is **open**. See [Numbered results](#numbered-results). |
| `shortcutTrees` | `ShortcutNode[]` | no | `[]` | Explicit branches merged into the trie root **after** the alias-derived ones. Arbitrary depth (`f` → entity → field). See [Sequence hints & leader grid](#sequence-hints--leader-grid). |
| `sequenceHints` | `"off" \| "hud"` | no | `"hud"` | `"hud"` shows the which-key panel for an unresolved prefix (and disables the 1000 ms buffer expiry). `"off"` restores the fully invisible buffer. |
| `hintDelayMs` | `number` | no | `200` | How long a prefix must sit unresolved before the HUD appears. `0` shows it immediately. |
| `leaderKey` | `string` | no | — | Single **non-alphanumeric** key (e.g. `"."`) that opens the trie root as a modal grid. Compared case-sensitively against `event.key`. Unset = disabled. |
| `prefixLabels` | `Record<string, string>` | no | `{}` | Labels for the derived interior levels, keyed by the prefix leading to them (`{ g: "Go to page" }`). The `""` key names the leader grid's root. Must be a **stable identity** — a new object per render rebuilds (and re-validates) the trie. |

### `CommandEntry` fields

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `id` | `string` | yes | Stable unique id, used as the cmdk item `value`. Convention: `"nav:/Route"`, `"theme-dark"`. |
| `label` | `string` | yes | Visible text; also fed to cmdk as a search keyword. |
| `group` | `string` | yes | Group heading (`"Navigation"`, `"Theme"`, …). Groups render in first-seen order. |
| `icon` | `LucideIcon` | no | Rendered at `h-4 w-4` before the label. |
| `keywords` | `string[]` | no | Extra fuzzy-match terms (in addition to `label`). |
| `alias` | `string` | no | Short lowercase hotkey token (`[a-z0-9]{1,4}`), e.g. `"gd"`. See [Alias hotkeys](#alias-hotkeys). Appended to the item's cmdk keywords and rendered as a `<kbd>` badge. |
| `to` | `string` | no | Router path; navigated to on select (via `useNavigate`). |
| `perform` | `() => void` | no | Custom action. **Takes precedence over `to`.** The palette always closes first, then runs it. |

### `SearchSource` fields

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `key` | `string` | yes | Unique page key (`"parts"`). |
| `label` | `string` | yes | Human label; the root item reads `Search {label}…`. |
| `icon` | `LucideIcon` | no | Defaults to lucide `Search`. |
| `alias` | `string` | no | Short lowercase hotkey token (`[a-z0-9]{1,4}`), e.g. `"sp"`. See [Alias hotkeys](#alias-hotkeys). Appended to the item's cmdk keywords and rendered as a `<kbd>` badge. |
| `listUrl` | `string` | yes | Absolute API list URL **without** a query string (e.g. `apiUrl("parts")`). A pre-existing `?` is handled (`&` is used instead). |
| `mode` | `"server" \| "client"` | no | `"server"` (default) appends `?search=<term>` and re-queries per debounced term. `"client"` fetches the list once and lets cmdk filter it. |
| `minChars` | `number` | no | Server mode default `2`, client mode default `0`. Below the threshold the page shows a hint and issues no request. |
| `maxResults` | `number` | no | Default `50`. Always applied — the list endpoints are unbounded. |
| `getLabel` | `(item) => string` | yes | Row label. |
| `getDescription` | `(item) => string \| undefined` | no | Right-aligned muted secondary text. |
| `getRoute` | `(item) => string` | yes | Router path navigated to when the row is picked. |
| `getThumbnail` | `(item) => string \| undefined` | no | Image URL shown as a thumbnail before the row label; return `undefined` for no thumbnail. |

> Rows are keyed and valued by `String(item.id)`, so every searched entity must
> expose an `id`.

Thumbnails render in a fixed `h-8 w-8` rounded box (`object-cover`, muted
background) so rows keep a consistent height whether or not an image is present,
they are `loading="lazy"`, and an image that fails to load hides itself via
`onError` — a broken or missing URL leaves a clean row with no broken-image
glyph and no layout shift. The `alt` is empty because the thumbnail is purely
decorative next to the label.

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

## Alias hotkeys

Both `CommandEntry` and `SearchSource` accept an optional **`alias`** — a short
lowercase token (`[a-z0-9]{1,4}`) declared as plain data on the registry the app
already passes in. One declaration drives three behaviours.

### 1. Tab tokens (palette open, root page)

At the **root** page `Tab` is *always* swallowed (`preventDefault`) so focus can
never leave the input. The input's first whitespace-separated token is then
matched against the alias registry:

| Input + `Tab` | Result |
| --- | --- |
| `sp` (a `SearchSource` alias) | Pushes that search page, search seeded `""`. |
| `sp benchy` | Pushes that search page **seeded with the remainder** (`"benchy"`) — one keystroke from root to filtered results. |
| `gd` (a `CommandEntry` alias, no remainder) | Runs the entry (navigate / `perform`) and closes the palette. |
| `gd something` | No-op — command aliases only fire with an empty remainder. |
| anything unmatched | No-op (but still swallowed). |

Search sources are matched before commands. On a search page `Tab` is left
alone.

### 2. Global key sequences (palette closed)

When `enableGlobalAliases` is `true` (the default), the palette installs a
window-level `keydown` listener that turns bare keystrokes into alias
sequences — `g` `d` navigates to the dashboard, `s` `p` opens the Parts search
page. Firing a `SearchSource` does `setPage(key)` + `setSearch("")` + opens the
palette; firing a `CommandEntry` runs it **without** opening the palette.

Guards — the listener bails out entirely when any of these hold:

- the palette is already open;
- `metaKey`, `ctrlKey` or `altKey` is held (never steals real shortcuts);
- `event.repeat` (held-down keys);
- the event target is inside
  `input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]`
  — so typing in any form field or other dialog never fires an alias.

`Escape` clears the buffer. Only `/^[a-z0-9]$/i` keys accumulate (lowercased),
and the buffer expires **1000 ms** after the last accepted key — unless hints
are on, which replaces the silent expiry with a visible panel (see
[Sequence hints & leader grid](#sequence-hints--leader-grid)).

The engine itself is `useShortcutSequencer`: one window listener registered
once, all mutable state in refs, walking the trie built by `buildShortcutTrie`.
The listener is bypassed for `ALIAS_IGNORE_SELECTOR` targets *except* while the
leader grid is open — that grid is itself a `[role="dialog"]`, and its keys have
to reach the sequencer.

Matching rule, applied after every accepted key:

| Buffer state | Behaviour |
| --- | --- |
| exact alias match **and** no longer alias starts with the buffer | fire immediately, clear the buffer |
| exact match **but** a longer alias shares the prefix | arm the 1000 ms timer and fire the exact match **on timeout** (waits for disambiguation) |
| no exact match but some alias starts with the buffer | keep accumulating (timer re-armed) |
| no alias starts with the buffer | reset the buffer to just the key that was typed and re-test it once |

The keydown that *fires* an alias is `preventDefault()`ed (since 1.0.3) — a
source alias focuses the palette input during that same event, so without it the
firing character leaked into the freshly focused input. Keys that merely
accumulate into the buffer are left alone, and the timeout path fires
asynchronously with no event to swallow.

The prefix-conflict row is why a registry of same-length aliases (`gd`, `gs`,
`sp`, …) feels instant while a `g` + `gd` pair would make `g` laggy. Keep all
aliases the same length unless a delay is acceptable.

### 3. Badges + fuzzy keywords

Root-list items with an `alias` render it right-aligned as

```html
<kbd class="ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">sp</kbd>
```

for both command items and `Search X…` items, so the palette documents its own
hotkeys. The alias is also appended to the item's cmdk `keywords`, so typing it
ranks the item first even without pressing `Tab`.

### Dev-mode validation

Outside `process.env.NODE_ENV === "production"` the palette `console.warn`s on
mount (and whenever the registry changes) about **duplicate aliases** (only the
first is reachable; search sources win over commands) and **prefix conflicts**
(naming the slower alias and the timeout it now waits for). Both are side
effects of `buildShortcutTrie`, which the palette memoizes on
`commands` / `searchSources` / `shortcutTrees` / `prefixLabels` — pass stable
identities or the warnings repeat every render. A `leaderKey` that is
alphanumeric or collides with a root key is warned about separately.

### Where aliases come from

`flattenNavItems` is deliberately alias-free — nav trees carry no hotkey data.
Apps attach nav aliases by post-mapping the flattened entries against a
route-keyed table:

```jsx
const NAV_ALIASES = { "/": "gd", "/Parts": "ga", "/Spools": "gs" };

const commands = React.useMemo(
  () =>
    [...flattenNavItems(navItems), ...extraCommands].map((c) => ({
      ...c,
      alias: NAV_ALIASES[c.to],
    })),
  [],
);
```

Theme commands intentionally have no aliases.

## Sequence hints & leader grid

A typed sequence is invisible while it is in flight, and nothing advertises that
`g` is a menu at all. Two optional surfaces fix that. Both read the same
**shortcut trie** and the same sequencer state as the keyboard does, so a hint
can never describe a binding the keys don't have.

### The trie

`buildShortcutTrie` expands every alias character by character into a tree of
`TrieNode`s — one node per key, `children` in insertion order (which is display
order). Sources are inserted first, so **precedence is**:

1. **search sources** (`sp`, `sl`, …) — first, matching the Tab handler's
   source-before-command rule;
2. **commands** (`gd`, `gt`, …);
3. **`shortcutTrees`** — explicit branches merged into the root last.

**First insertion wins.** A later declaration for an occupied path is dropped
and `console.warn`ed in dev (the same duplicate/prefix-conflict warnings
described under [Dev-mode validation](#dev-mode-validation), now emitted while
the trie is built). Only `[a-z0-9]+` aliases enter the trie at all: PT's `/`
alias for "Focus filter search" stays **palette-only** — badge, cmdk keyword and
Tab token — and is never a bare-key binding, so it can coexist with the `/`
filter-search hotkey.

Interior nodes are derived from the alias text, so they have no label of their
own and render as `prefixLabels[prefix] ?? key`. A `prefixLabels` entry also
outranks a leaf label on a node that is both a target *and* a menu (alias `gd`
declared alongside `gdx`).

`TrieNode.action` is a `TrieAction` — `{ kind: "source" }`, `{ kind: "command" }`
or `{ kind: "node" }` — and `CommandPalette` dispatches it exactly as the
palette itself would (open the search page / run the entry / `perform()` or
navigate).

#### `ShortcutNode` fields

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `key` | `string` | yes | Single `[a-z0-9]` key at this level. |
| `label` | `string` | yes | Menu text for this node. |
| `icon` | `LucideIcon` | no | Rendered at `h-4 w-4` before the label. |
| `children` | `ShortcutNode[]` | no | Makes this a **branch** — the next menu level. Arbitrary depth. |
| `to` | `string` | no | Leaf: router path to navigate to. |
| `perform` | `() => void` | no | Leaf: custom action. **Takes precedence over `to`.** |

### Sequence HUD (`sequenceHints`, `hintDelayMs`)

Default `"hud"`. Type an unresolved prefix, pause `hintDelayMs` (default 200 ms)
and a which-key panel slides up across the bottom of the screen listing every
continuation: `<kbd>` key + icon + label, with a muted `›` on entries that open
a further level. Entries are real `<button>`s — clicking one walks the same step
the key would (`enterKey`). `Escape` cancels; a click anywhere else abandons the
sequence so the panel can never get stuck.

Finishing inside the delay never paints the panel, so `g` `d` at typing speed
stays a silent hotkey. The delay is spent once per sequence: drilling a level
deeper re-renders the panel in place instead of blinking it away.

While hints are enabled the 1000 ms buffer expiry is switched **off** — a
visible prefix waits for `Escape`, a dead key, or resolution rather than
vanishing on a timer. (It is disabled for the whole hinted mode, including the
200 ms before the panel paints; that window is short enough that the difference
is not observable.) `sequenceHints="off"` restores the invisible buffer and its
expiry exactly as they were. An **ambiguous exact** node (`gd` declared
alongside `gdx`) keeps its legacy 1000 ms auto-fire even with the panel up —
only the leader grid suppresses it.

The panel is portalled to `document.body` at `z-40`, so no transformed ancestor
can capture its `fixed` positioning, and it renders under the palette dialog
(`z-50`) rather than over it.

### Leader grid (`leaderKey`)

`leaderKey` is a single **non-alphanumeric** key — PT uses `.` — that opens the
trie **root** as a centred modal menu: the same levels, from a cold start, with
no prefix to remember. Letters drill in, cards are clickable, `Backspace` pops a
level, `Escape` (or an overlay click) closes. The header breadcrumbs the pressed
keys after a root label (`prefixLabels[""]`, default `"Shortcuts"`).

Levels resolve exactly as typed sequences do with one deliberate exception: an
ambiguous exact match (`gd` with `gdx` also declared) never auto-fires on the
1000 ms timer while the grid is open, because its continuations are on screen.
Every handled key is `preventDefault()`ed so nothing leaks to the page behind
the modal.

An alphanumeric `leaderKey`, or one that collides with a root shortcut key, is
`console.warn`ed in dev — it would shadow the first key of every sequence
starting with it.

### Wiring it up

```jsx
// Module-level: a new object per render would rebuild the trie every render.
const PREFIX_LABELS = { g: "Go to page", s: "Search" };

<CommandPalette
  commands={commands}
  searchSources={searchSources}
  prefixLabels={PREFIX_LABELS}
  leaderKey="."
/>;
```

That is the whole opt-in for an app that already declares aliases —
`sequenceHints` defaults to `"hud"`, and `shortcutTrees` is only needed for
branches that are not aliases (a filter tree, say).

## Numbered results

While the palette is open, the first **9 visible enabled results** carry a small
number badge (`1`–`9`) on the left of the row, and **`Shift+1..9`** runs the Nth
one — at the root page *and* on entity-search pages. Clicking the badge is just
clicking the row. Numbering always reflects **visual order**: as cmdk re-ranks
results while you type, the numbers restamp to follow. Disabled items are
skipped (numbering stays contiguous over enabled rows). Plain digit keys are
untouched — they type into the input as normal. (`Ctrl+digit` was never an
option — browsers reserve it for tab switching; `Alt` was rejected as
hard to reach.)

Mechanism (why it looks the way it does in the source):

- cmdk's sort **physically re-appends item DOM nodes** in score order and
  unmounts filtered-out items, so document order *is* visual order. A
  `MutationObserver` on the `Command.List` node restamps
  `data-palette-index="1..9"` after every reorder, before paint. The observer is
  installed from a **callback ref** — Radix's Portal mounts the dialog content a
  render pass after `open` flips, so an effect keyed on `open` runs before the
  list node exists.
- The badge itself is a CSS `::before` pseudo-element
  (`data-[palette-index]:before:content-[attr(data-palette-index)]` …) — the
  first flex child of the row, so it lands left of the icon/thumbnail/label and
  the alias `<kbd>` keeps its right-aligned slot. Without the attribute the
  rules are inert, which is also how `enableNumberedResults={false}` needs no
  CSS change.
- `Shift+1..9` is matched on **`event.code`** (`Digit1`…`Digit9`), not
  `event.key`, because shift mutates the produced character (`Digit3` types
  `#`). The keydown is `preventDefault()`ed even when fewer than N results
  exist, so shifted digit **symbols** (`!@#…`) can never be typed into the
  palette search input — the one trade-off of this binding.
- The global alias listener only fires on bare `[a-z0-9]` keys while the
  palette is closed, so the two hotkey systems cannot collide.

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
7. **Pass `prefixLabels` / `shortcutTrees` as module-level constants.** They are
   memo dependencies of the shortcut trie; a fresh `{}` or `[]` per render
   rebuilds it — and re-runs its dev warnings — on every render.
8. **Aliases must be unique and same-length across the whole registry** —
   commands *and* search sources share one namespace. Duplicates make the later
   one unreachable; a strict prefix makes the shorter one wait 1000 ms. Both are
   `console.warn`ed in dev.

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
- **Global aliases listen on `window`, not on a focus-scoped root.** The guard is
  a `closest()` selector check on the event target, so a custom focusable widget
  that swallows typing without being an `input`/`textarea`/`select`/
  `contenteditable`/`[role="dialog"]` can still trigger an alias. Pass
  `enableGlobalAliases={false}` on pages where that matters.
- **Dev alias validation depends on `process.env.NODE_ENV` being replaced by the
  consumer's bundler** (Vite does this by default). The built ESM keeps the
  literal expression.
- **The leader grid never takes focus.** Its `Dialog.Content` prevents both
  `onOpenAutoFocus` and `onCloseAutoFocus`: the sequencer owns every key while
  the grid is open, so focusing a card would put a ring on an arbitrary entry
  and make `Space`/`Enter` run it, and restoring focus on close would land
  *after* a search alias has already focused the palette input. The trade-off is
  that a modal dialog opens without moving focus into it, and a `Space` press
  can still reach whatever was focused behind the grid.
- **The HUD sits at `z-40`, portalled to `document.body`.** A consumer overlay
  above `z-40` covers it; the palette dialog (`z-50`) deliberately does.
- **Hint surfaces cannot show non-alphanumeric aliases.** Only `[a-z0-9]+`
  aliases enter the trie, so a `/`-style alias is discoverable through the
  palette list and its badge only.
- **Hotkey matching is single-key only.** `hotkey` is compared against
  `event.key.toLowerCase()`, so only ctrl/cmd + one key is expressible; there is
  no way to require or forbid shift/alt beyond the built-in "neither pressed"
  rule.

---

See also: [Packages Overview](../00-OVERVIEW.md).
