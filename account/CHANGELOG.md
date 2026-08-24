# @bcl32/account

## 0.2.0

### Minor Changes

- 5094b6c: Add `@bcl32/account` and the attribution seam it plugs into.

  **`@bcl32/account` (new, 0.1.0)** — the user-identity surface for apps behind
  `bcl32-auth`: `UserProvider` (`/auth/me` + `/auth/users`, degrading to
  `user: null` with no throw and no toast when identity is unavailable), `Avatar`,
  `UserBadge`, `SidebarUserSection`, `AccountPanel`, `ActivityFeed` /
  `ActivityTimeline`, and `useAccountCommands` for the command palette. The
  package never constructs URLs — every endpoint arrives as a prop — and imports
  nothing from `datatable`, `charts` or any dnd library, because it is mounted
  from the sidebar and would otherwise be bundled eagerly on first paint.

  **`@bcl32/datatable`** — new `AttributionContext` export: `AttributionProvider`
  takes a `renderUser(userId)` render prop, and `DataTable` reads it from context
  to append `created_by` / `updated_by` columns beside `time_created` /
  `time_updated` (card slot `footer`, muted `—` for null). With no provider
  mounted the renderer is `null` and the columns are never added, so existing
  consumers are unchanged. `ColumnGenerator` also accepts an optional `renderUser`
  prop for consumers that render its output outside `DataTable`.

  **`@bcl32/data-utils`** — `RowData` gains `created_by?: string | null` and
  `updated_by?: string | null`.
