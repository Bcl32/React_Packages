# @bcl32/account

> Reference doc for the `@bcl32/account` package.
> Back to [Packages Overview](../00-OVERVIEW.md).

| | |
| --- | --- |
| **Package** | `@bcl32/account` |
| **Version** | `0.1.x` (changeset-managed; always `npm view` before pinning a consumer) |
| **Tier** | composite (depends on `utils`, `hooks`) |

## Purpose

The **frontend half of the identity plugin pair.** `bcl32-auth` (Python) verifies
who is calling and stamps attribution; this package is what that identity looks
like on screen:

1. **Who am I** — `UserProvider` fetches `/auth/me` once and hands the answer to
   the whole app, degrading to `user: null` when there is no identity.
2. **The sidebar footer** — `SidebarUserSection`: avatar, name, dropdown,
   sign-out.
3. **Account surfaces** — `AccountPanel` (Profile / Preferences / Activity) and
   `ActivityFeed` / `ActivityTimeline` over `GET /activity`.
4. **Attribution** — `Avatar` and `UserBadge` turn a `users.id` into a face and
   a name, which is what `@bcl32/datatable`'s `AttributionProvider` renders into
   `created_by` / `updated_by` cells.

An app wires it once (provider + sidebar section + one menu item) and every
`created_by` column in every table starts resolving.

## Install & Import

This is a workspace package; consumers in the monorepo depend on the published
version (apps are not workspace members and resolve `@bcl32/*` from the GitHub
Packages registry).

```jsonc
// package.json (consumer)
{
  "dependencies": {
    "@bcl32/account": "^0.1.0"
  }
}
```

```ts
// Barrel (recommended)
import {
  UserProvider,
  useCurrentUser,
  useUserDirectory,
  SidebarUserSection,
  AccountPanel,
  ActivityFeed,
  UserBadge,
  Avatar,
  useAccountCommands,
  type AccountUser,
  type AccountMenuItem,
  type ActivityEntry,
} from "@bcl32/account";
```

Subpath entry points are also published and resolve to the same exports:

```ts
import { UserProvider, useCurrentUser, useUserDirectory } from "@bcl32/account/UserProvider";
import { Avatar } from "@bcl32/account/Avatar";
import { UserBadge } from "@bcl32/account/UserBadge";
import { SidebarUserSection } from "@bcl32/account/SidebarUserSection";
import { AccountPanel } from "@bcl32/account/AccountPanel";
import { ActivityFeed } from "@bcl32/account/ActivityFeed";
import { ActivityTimeline } from "@bcl32/account/ActivityTimeline";
import { useAccountCommands } from "@bcl32/account/useAccountCommands";
import type { AccountUser, ActivityEntry, AccountMenuItem } from "@bcl32/account/types";
```

> Built as **pure ESM** (`tsup` `format: esm`) with `@bcl32/*` dependencies
> externalized. `lucide-react` is a regular **dependency**, so consumers get the
> icons transitively.

## Two rules this package is built around

### 1. The package never constructs a URL

Every endpoint arrives as a prop: `meUrl`, `usersUrl`, `activityUrl`,
`logoutUrl`. The app builds them with its own `apiUrl(...)` helper, which is the
only thing that knows the base path (`/home-helper/api`, the dev port, the
tunnel hostname). Nothing here appends a path segment to a base — only query
parameters to a URL it was handed.

This is why there is no `AccountRoutes` component and no "just give me the API
base" prop: the moment a package can build one URL it owns a deployment
contract, and four apps have four different ones.

### 2. Nothing datatable-shaped may be imported here

`SidebarUserSection` is mounted in the sidebar, which every route renders. Any
import in this package's graph is therefore in the app's **first-paint bundle**,
before code-splitting can help. So:

> **`@bcl32/account` must never import `@bcl32/datatable`, `@bcl32/charts`,
> `@bcl32/filters`, or any dnd library.**

Which is exactly why attribution display is inverted — the *datatable* takes a
render prop, rather than this package exporting a column. See
[Attribution](#attribution-the-datatable-seam).

## Public Exports

| Name | Kind | Signature / Props | Description |
| --- | --- | --- | --- |
| `UserProvider` | component | `({ meUrl, usersUrl?, staleTime?, children })` | Fetches `/auth/me` and `/auth/users`, owns `updateMe`. One per app, inside `QueryClientProvider`. |
| `useCurrentUser` | hook | `() => UserContextValue` | The signed-in user, loading flags, `updateMe`. Safe outside a provider (returns the null-user default). |
| `useUserDirectory` | hook | `() => { directory, isDirectoryLoading, resolveName, resolveUser }` | The id → user map used to resolve attribution. |
| `SidebarUserSection` | component | `({ logoutUrl, items?, signedOutLabel?, signOutLabel?, className? })` | The sidebar footer identity block. Needs `SidebarProvider`. |
| `AccountPanel` | component | `({ activityUrl?, activityPageSize?, activityOwnOnly?, children?, preferencesLabel?, panelClassName?, className? })` | Profile / Preferences / Activity tabs, every one of them the same height. |
| `ACCOUNT_DIALOG_BODY_HEIGHT` | const | `"h-[28rem]"` | The body height every account-surface dialog shares — `AccountPanel`'s `panelClassName` default, and what an app pins its sibling dialogs to. See [Dialog shape](#dialog-shape). |
| `ActivityFeed` | component | `({ activityUrl, pageSize?, userId?, entityType?, hideWhenEmpty?, hidePagination?, emptyMessage?, className?, showAvatars? })` | Fetching feed over `GET /activity`. |
| `ActivityTimeline` | component | `({ entries, className?, showAvatars? })` | The presentational row list. No fetching. |
| `Avatar` | component | `({ email?, displayName?, size?, className?, title? })` | Initials circle with a deterministic per-user hue. |
| `UserBadge` | component | `({ userId?, email?, displayName?, showAvatar?, size?, className? })` | Avatar + label; renders `—` when unresolvable. |
| `useAccountCommands` | hook | `(opts?: UseAccountCommandsOptions) => CommandEntry[]` | Palette commands for the account surface. |
| `initialsFor` / `hueFor` | function | `(displayName?, email?) => string` / `(seed?) => number` | The avatar's two pure helpers, exported for custom chrome. |
| `resolveUserLabel` | function | `({ email?, display_name? }) => string \| null` | display name → email → null. The label precedence, in one place. |
| `AccountUser`, `DirectoryUser`, `ActivityEntry`, `AccountMenuItem`, `UpdateMePayload`, `ListResponse<T>`, `AvatarSize` | types | see below | The API contracts this package reads. |
| `UNKNOWN_USER_LABEL` | const | `"—"` | What an unresolvable attribution renders as, everywhere. |

### `UserProviderProps`

| Prop | Type | Required | Default | Behaviour |
| --- | --- | --- | --- | --- |
| `meUrl` | `string` | yes | — | Absolute URL of `GET`/`PATCH` `/auth/me`, e.g. `apiUrl("auth/me")`. |
| `usersUrl` | `string` | no | — | Absolute URL of `GET /auth/users`. Omit and `resolveName` always returns `null` (only the signed-in user resolves). |
| `staleTime` | `number` | no | `300000` | Freshness window for both queries. |

### `UserContextValue`

| Field | Type | Behaviour |
| --- | --- | --- |
| `user` | `AccountUser \| null` | `null` whenever identity is unavailable — see [Graceful degrade](#graceful-degrade). |
| `isLoading` | `boolean` | True during the first `/auth/me` probe only. |
| `isUnauthenticated` | `boolean` | Settled with no user. A *degrade* signal, not an error. |
| `updateMe` | `(patch: UpdateMePayload) => Promise<AccountUser \| null>` | `PATCH /auth/me`. Resolves to `null` on failure — **never rejects**. |
| `isUpdating` | `boolean` | A PATCH is in flight. |
| `directory` | `Map<string, DirectoryUser>` | id → user. Always contains the signed-in user, even with no `usersUrl`. |
| `isDirectoryLoading` | `boolean` | The `/auth/users` fetch is in flight. |
| `resolveName` | `(userId?) => string \| null` | display name → email → `null` for an unknown id. |
| `resolveUser` | `(userId?) => DirectoryUser \| null` | The raw row, for callers that need the email separately. |

### `AccountUser`

`{ id, email, display_name?, prefs?, provider?, time_created?, time_updated? }` —
the `GET /auth/me` shape. `prefs` is the server-synced preference blob; a
`PATCH` **replaces it whole**, so a client that merges must read-modify-write.

### `ActivityEntry`

`{ id, user_id, user_email, verb, entity_type?, entity_id?, entity_label?, meta?, time_created }`
— one row of `GET /activity`, which answers with the standard
`{ items, total, limit, offset }` envelope. `user_email` is denormalized at
write time, so a row stays readable after the user row is gone (the audit
outlives its subject; `user_id` goes null, the email does not).

### `AccountMenuItem`

| Field | Type | Required | Behaviour |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique key within the menu. |
| `label` | `string` | yes | Row text. Truncates. |
| `icon` | `LucideIcon` | no | Rendered at `size-4` before the label. |
| `onSelect` | `() => void` | yes | What the row does. The package never navigates. |
| `separatorBefore` | `boolean` | no | Draw a separator above this row. |

## Graceful degrade

`UserProvider` **swallows** every `/auth/me` failure and reports `user: null`.
Not an error boundary, not a toast, not a retry: a 401 is the *normal* answer
for a LAN client (port 8447 is published on `0.0.0.0`, so it bypasses
Cloudflare) and for an expired Access session, and neither gets better by
asking again (`retry: false`).

Consequences a consumer should design for:

- The app shell renders identically signed-in or not. Only the sidebar block
  changes (`"Not signed in"`), and `AccountPanel`'s Profile tab explains how to
  sign in.
- `updateMe` resolves to `null` rather than rejecting, and carries both an
  `onError` handler **and** `meta.silenceErrorToast` so an app-wide
  `MutationCache.onError` default toast opts out. A failed preference sync must
  never interrupt what the user was doing.
- `/auth/users` is not even requested while `user` is null — the middleware that
  401'd `/auth/me` will 401 that too.
- `ActivityFeed` treats a failed read as an empty feed. It is ambient context,
  never the reason the page exists.

## Attribution: the datatable seam

`created_by` / `updated_by` are opaque UUIDs on the row. Resolving one needs the
directory, which lives *here* — in a package `@bcl32/datatable` must not depend
on (it would invert the tier graph and pull identity fetching into every table
in the fleet). So the dependency is inverted with a **render prop**:

```
@bcl32/datatable   AttributionProvider({ renderUser })  ← takes a function
        ↑ app composes
@bcl32/account     <UserBadge userId={id} />            ← supplies the function
```

```jsx
// Layout.jsx — the app is the only place that knows about both packages.
import { AttributionProvider } from "@bcl32/datatable/AttributionContext";
import { UserBadge } from "@bcl32/account/UserBadge";

const renderUser = React.useCallback((userId) => <UserBadge userId={userId} />, []);

<AttributionProvider renderUser={renderUser}>
  <Outlet />
</AttributionProvider>;
```

With that mounted, every `DataTable` beneath it grows two columns beside its
timestamp columns — `Created by` after `time_created`, `Updated by` after
`time_updated`, `meta.card.slot: "footer"` so the card view puts them in the
footer, and a muted `—` for rows written before the attribution migration.

**With no provider mounted, the renderer is `null` and no column is added** —
`withAttributionColumns` returns the very same array reference, so every
existing app is byte-identical.

> **Where the injection happens.** `DataTable` reads the context, not
> `ColumnGenerator`. `ColumnGenerator` is a plain factory, and most consumers
> call it from inside a `useMemo` callback — where reading context is illegal
> (React warns "Context can only be read while React is rendering") and, worse,
> a memoized column list would never see the renderer arrive. `DataTable` is a
> real component, so it is the only hook-legal callsite in the chain. A consumer
> that renders `ColumnGenerator`'s output somewhere other than `DataTable` can
> pass `renderUser` to it explicitly; the injection is idempotent, so the two
> paths cannot double the columns.

Pass a **stable** `renderUser` (module constant or `useCallback`) — it is a memo
dependency of the resolved column list.

## Preferences sync

`prefs` is a free-form JSONB blob on the user row, and `PATCH /auth/me` replaces
it whole. The pattern an app follows (Home Helper is the reference consumer):

1. Keep localStorage as the **instant-paint cache** and the unauthenticated
   fallback — behaviour must be byte-identical when `user === null`.
2. On `/auth/me` resolve, merge `defaults ⊕ local ⊕ server` one level deep
   (server wins) and write the result back to localStorage.
3. `updateSetting` writes locally **synchronously** and debounces the
   `updateMe({ prefs: { settings: blob } })` (~750 ms) when authenticated.
4. Namespace under `prefs.settings.*` so other consumers of `prefs` can coexist.

Last-write-wins is fine at this scale (two users, one household). The theme key
stays per-app and per-device in localStorage by documented design — it is a
property of the screen you are looking at, not of you.

## Dialog shape

`AccountPanel` is the reference implementation of the fleet's dialog rule — a
dialog's shape is part of its identity, so the box never resizes in response to
its own content. The canonical statement of the rule, and why `SimpleDialog`
alone does not give you it, is
[02-INTEROP §6 — Dialog design conventions](../02-INTEROP.md#6-dialog-design-conventions).

What this package does about it:

- Every tab panel gets one class string — `overflow-y-auto p-4` plus a fixed
  height — so Profile (short), Preferences (medium) and Activity (long) all
  render the same rectangle, and the dialog is still when you click a tab.
- The height defaults to `ACCOUNT_DIALOG_BODY_HEIGHT` (`h-[28rem]`) — tall
  enough for the long tabs, short enough that the whole dialog clears a short
  laptop viewport once `SimpleDialog`'s `p-8` and title row are added, and so
  never hits the modal's own `max-h` cap. `panelClassName` overrides it — `cn`
  resolves the conflicting height class in the caller's favour, and `"h-auto"`
  opts out entirely for a panel that is not in a dialog.
- The constant is exported so **sibling** dialogs match too. An app that opens a
  standalone activity feed or a theme editor from the same account menu pins
  those bodies to `ACCOUNT_DIALOG_BODY_HEIGHT` rather than a copied literal, and
  switching between dialogs is as still as switching between tabs.
- A body that pins its own height must stop doing so once it is nested in a tab
  panel — two fixed heights nest a taller scroller inside a shorter box and you
  get two scrollbars.

## Dependencies

### Internal (`@bcl32/*`)

| Package | Why |
| --- | --- |
| `@bcl32/utils` | `cn`, `Button`, `Input`, `Label`, `Skeleton`, `AnimatedTabs`, `Dropdown`, `Sidebar` (`SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` / `useSidebar`). |
| `@bcl32/hooks` | `apiFetch` (the `ApiError` envelope) and `useGetRequest` for the activity feed. |
| `@bcl32/command-palette` | **devDependency, type-only.** `CommandEntry` is imported with `import type` so nothing is bundled; an app calling `useAccountCommands` already has the palette. |

### Peer dependencies

| Package | Range |
| --- | --- |
| `@tanstack/react-query` | `^5.18.1` |
| `dayjs` | `^1.11.10` |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |

No Radix peers: every Radix primitive this package touches reaches it through
`@bcl32/utils` components, and `@bcl32/utils` already declares them (the same
posture as `@bcl32/forms`). No `react-router-dom` either — menu items carry
`onSelect` callbacks and sign-out is a plain `<a href>`, so the package never
touches the router.

### External dependencies

| Package | Range | Why |
| --- | --- | --- |
| `lucide-react` | `^0.447.0` | `ChevronsUpDown`, `LogOut`, `UserRound`, `History`. |

## Conventions & Patterns

Things a consumer must follow:

1. **Mount `UserProvider` inside `QueryClientProvider`** and outside anything
   that reads identity. Provider order in Home Helper is
   `QueryClientProvider > UserProvider > SettingsProvider > BrowserRouter`,
   because settings hydrate from `user.prefs`.
2. **`SidebarUserSection` needs a `SidebarProvider`.** It reads
   `useSidebar().state` to stay collapse-safe. Put it in `SidebarFooter`.
3. **Build every URL with the app's `apiUrl`.** `meUrl={apiUrl("auth/me")}`,
   `usersUrl={apiUrl("auth/users")}`, `activityUrl={apiUrl("activity")}`.
   `logoutUrl` is an *edge* path, not an API path — for Cloudflare Access it is
   `/cdn-cgi/access/logout`.
4. **Stable `items` and `renderUser` identities.** Both are memo dependencies
   downstream; a fresh array per render re-renders the menu, a fresh
   `renderUser` rebuilds every table's column list.
5. **Assign palette aliases yourself.** `useAccountCommands` returns alias-free
   entries on purpose — aliases share one per-app namespace with every other
   command *and* search source, so only the consumer can keep them unique and
   same-length. Post-map the entries to add them.
6. **Never render a raw user id.** `UserBadge` renders `—` for an unknown id
   rather than a UUID; keep that rule in any custom chrome.
7. **Give sibling account dialogs the same body height.** `AccountPanel` pins
   its own tabs; anything else the account menu opens is the app's own dialog
   body, so pin it to `ACCOUNT_DIALOG_BODY_HEIGHT` — see
   [Dialog shape](#dialog-shape).

## Minimal Usage Example

```jsx
// main.jsx
<QueryClientProvider client={queryClient}>
  <UserProvider meUrl={apiUrl("auth/me")} usersUrl={apiUrl("auth/users")}>
    <SettingsProvider>
      <BrowserRouter>…</BrowserRouter>
    </SettingsProvider>
  </UserProvider>
</QueryClientProvider>
```

```jsx
// MainSidebar.jsx — footer
import { SidebarUserSection } from "@bcl32/account/SidebarUserSection";
import { Settings, Palette, History } from "lucide-react";

const items = React.useMemo(
  () => [
    { id: "profile", label: "Profile & Settings", icon: Settings, onSelect: openAccount },
    { id: "theme", label: "Change Theme", icon: Palette, onSelect: openTheming },
    { id: "activity", label: "Activity", icon: History, onSelect: openActivity },
  ],
  [openAccount, openTheming, openActivity],
);

<SidebarFooter>
  <SidebarUserSection logoutUrl="/cdn-cgi/access/logout" items={items} />
</SidebarFooter>;
```

```jsx
// The account dialog body — app settings ride in the Preferences slot.
<AccountPanel activityUrl={apiUrl("activity")}>
  <SettingsPanel />
</AccountPanel>
```

```jsx
// Home.jsx — recent activity widget, invisible until there is activity.
<ActivityFeed activityUrl={apiUrl("activity")} pageSize={8} hidePagination hideWhenEmpty />
```

## Smells & Caveats

Known rough edges and deliberate design constraints:

- **A 401 is indistinguishable from a network failure.** Both produce
  `user: null`. The distinction exists server-side (401 vs 503
  `auth_unavailable`) but is deliberately flattened here — every consumer of
  this context does the same thing either way.
- **An expired Access session answers fetches with login HTML**, which
  `apiFetch` surfaces as a parse-ish failure rather than a redirect. The
  documented answer is "reload the page"; a response interceptor is future work.
- **`AnimatedTabs` puts its panels beside the tab strip** (its root is
  `flex space-x-1`). That is the existing component's layout, inherited as-is;
  `AccountPanel` does not fight it. A single-tab panel skips the strip
  entirely, because `AnimatedTabs` builds its `layoutId` from the first two
  titles. It manages no height either, which is why `AccountPanel` supplies one
  — see [Dialog shape](#dialog-shape).
- **A short tab is mostly empty space.** Fixing the height buys a still dialog
  at the cost of whitespace under the Profile tab. That is the deliberate
  trade: the panel is sized for its tallest state, not its current one.
- **The activity feed grows its window instead of paging it.** "Show more"
  raises `limit` with `offset` fixed at 0, so a new row arriving mid-session
  shifts nothing already on screen — at the cost of refetching the whole window.
  The API caps `limit` at 200.
- **Avatars are initials only.** There is no avatar upload anywhere in the
  fleet, and adding one would put a URL contract inside a package that is not
  allowed to build URLs. The hue is keyed on the **email**, so renaming yourself
  does not change your colour.
- **Hue collisions are not avoided.** `hueFor` is a djb2 hash mod 360 with no
  spacing pass, so two users *can* land on similar colours. With a household-
  sized directory this has not been worth solving.
- **`resolveName` returns `null` for anyone outside the directory**, including
  every user when `usersUrl` is omitted. `UserBadge` then falls back to the
  denormalized email on the row (activity rows carry one; table rows do not).
- **Attribution columns are not sortable.** The cell shows a name but the value
  is a UUID, so sorting would order by something nobody can see.

---

See also: [Packages Overview](../00-OVERVIEW.md) ·
[`@bcl32/datatable`](datatable.md) · [`@bcl32/command-palette`](command-palette.md).
