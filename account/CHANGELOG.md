# @bcl32/account

## 0.3.1

### Patch Changes

- 31ef177: Every package declares `sideEffects: false`

  A bundler's central question about an unused export is "may I delete the module
  it came from?", and without this field the answer has to be no: a module that
  _might_ do something at import time cannot be dropped just because nothing reads
  a symbol from it. Tree-shaking then works only as far as Rollup's own analysis
  can prove purity on its own, which is well but not reliably, and not at all
  under bundlers that lean on the field instead.

  The promise is safe here, and it was checked rather than assumed. Across all
  eleven packages there are **no bare side-effect imports** (`import "./x.css"`),
  **no top-level writes to `window`, `document` or `globalThis`**, and **no CSS
  files at all** — styling is Tailwind classes, so nothing depends on import order
  to paint. That last one is the usual reason a package cannot make this promise,
  and it does not apply: there is no stylesheet here to be stripped.

  Module-level state that some modules do hold (a `Map` built at module scope) is
  not a blocking side effect — such a module is still only retained when something
  imports from it, which is exactly the behaviour wanted.

  What it is worth today was measured rather than guessed, and it is small:
  Home Helper's whole bundle came out 2,562 bytes lighter with the field than
  without it (3,647,634 against 3,650,196, same container, same inputs, both
  green) — 0.07%. Rollup was already proving most of this on its own.

  So this is insurance, not an optimisation. It guarantees the behaviour instead
  of leaving it to a bundler's analysis, and it matters more for anything that
  leans on the field rather than deriving the answer, where the current absence
  means no tree-shaking across this boundary at all. The related measurement, for
  scale: importing `RowActions` alone costs 58 KB more through the barrel than
  through its subpath, while in a file that already imports `DataTable` the two
  are byte-identical.

- Updated dependencies [31ef177]
  - @bcl32/hooks@4.2.1
  - @bcl32/utils@2.10.3

## 0.3.0

### Minor Changes

- eeffb82: ActivityFeed: hide chosen verbs with `excludeVerbs`

  Some mutations are worth **recording** but not worth **reading**. Home Helper's
  thumbnail endpoints are the motivating case: they live on the polymorphic
  resource rail (`POST /rooms/{id}/resources/{rid}/thumbnail`), which is mounted
  per parent with `tags=["Resources"]`. `install_activity` excludes by a route's
  _first_ tag and `include_router`'s tags come first, so the package's default
  `exclude_tags` can never reach them — "Media" is never their first tag. The rows
  are written, correctly (someone really did attach that photo); they are just
  noise beside "created a room".

  `ActivityFeed` takes `excludeVerbs?: string[]` and `AccountPanel` forwards
  `activityExcludeVerbs` to its Activity tab. Both render as a **repeated** query
  parameter (`?exclude_verbs=a&exclude_verbs=b`), which is what FastAPI reads into
  a `list[str]`; comma-joining would arrive as one string matching no verb.

  The filtering is done by the API (bcl32-auth ≥ 0.2.0), deliberately not by
  dropping rows here: `total` has to count the same rows the reader can see, or
  "Show more" offers a page that renders as nothing.

  Two details worth knowing:

  - A trailing literal names the event and multiple literals join with `_`, so
    `/thumbnail/fetch` is `thumbnail_fetch` and excluding `thumbnail` does **not**
    cover it. Pass both.
  - The dependency is on the array's _contents_, not its identity. Callers pass a
    literal (`excludeVerbs={["thumbnail"]}`), which is a fresh array every render;
    depending on the array itself would reset the paging window on every render
    and snap "Show more" back as fast as it was clicked.

  Additive and opt-in — omitting the prop changes nothing.

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
