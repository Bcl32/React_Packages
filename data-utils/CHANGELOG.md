# @bcl32/data-utils

## 2.6.2

### Patch Changes

- 13daf3b: The barrel may no longer publish what the exports map does not

  Three surfaces answer "what is public" here: the exports map, the build's
  entry list, and `src/index.ts`. `tsup-entries.ts` derived the second FROM the
  first so those two cannot disagree; the barrel was left independent, and
  `RowEditButton` is what that cost — re-exported from `index.ts`, absent from
  the map, therefore never built, therefore unreachable at
  `@bcl32/datatable/RowEditButton`. It failed in a consumer's CI, one repo away,
  after release.

  `.github/scripts/check-barrel.mjs` closes it. Every module the barrel
  re-exports must either be named in the exports map or listed in
  `bcl32.barrelOnlyModules` — public both ways, or barrel-only on purpose. The
  check compares two files, so it runs ungated and before the build, and a stale
  list entry (a module that has since gained a subpath, or left the barrel) is an
  error in its own right. Nothing can infer this intent, which is why it is asked
  for rather than derived: a module re-exported from the barrel and nowhere else
  is indistinguishable from one deliberately kept off the subpath list.

  **Six modules gain the subpath they should always have had.** Each was chosen
  on evidence rather than taste — consumers already reaching for it, or a direct
  sibling that has one:

  - `datatable/SectionNesting` and `datatable/TreeBoard` — imported from the root
    barrel by Home Helper, House Hunter and Print-Tracker today, in fifteen
    statements, because there was no other way in
  - `filters/useEntityGroups` — the same, in Print-Tracker
  - `datatable/SectionsView` — the only one of five views without a subpath
    (`TableView`, `CardView`, `BoardView`, `DetailPaneView` all have one)
  - `datatable/CardActions` — the card-shaped half of `RowActions`, which has one
  - `filters/FilterSearchBar` — named in 3.10.0's own changelog beside
    `AddFilterPicker`, which has one

  **Ten are declared barrel-only**, which is a decision recorded rather than a
  gap: `datatable` `CardCells`, `ColumnLabels`, `GroupControl`, `GroupSections`,
  `SortControl`, `ViewDefs`, `ViewScroll`; `filters` `EntityGroupCards`,
  `FilterSearch`; `data-utils` `apiCapabilities`. None has a consumer, and the
  asymmetry is deliberate: adding a subpath later is additive, withdrawing one is
  breaking, so absent evidence the reversible answer wins. Flipping any of them is
  one exports entry and a rebuild.

  Nothing is removed and no existing import changes — the barrel exports stay, so
  both spellings work for the six.

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

## 2.6.1

### Patch Changes

- 84226fc: fix(data-utils): actually build the ./types entry point

## 2.6.0

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

## 2.5.0

### Minor Changes

- 1ee9939: Render a `date` attribute as a native date picker

  Pairs with bcl32-schema-utils, which now emits `type: "date"` for a
  `datetime.date` column instead of letting it fall through to `string`. Until
  now every calendar-day field — a due date, a purchase date, a budget window —
  got a free-text box: no picker, no validation, no calendar.

  **`@bcl32/forms`** — `FieldInput` gains a `date` case rendering
  `<input type="date">`, and `FormElement` routes `date` through the same
  single-line layout as `string`. It is deliberately NOT the existing `datetime`
  branch: that one is a dayjs-backed date-and-time control, and a due date has no
  time to ask for.

  The value format is the wire format. An `<input type="date">` reads and writes
  `"YYYY-MM-DD"`, which is exactly what a Pydantic `date` accepts and emits, so
  no parsing, formatting or timezone conversion sits between the picker and the
  column — verified round-tripping the 1st of a month, where a UTC/local slip
  would surface as the last day of the previous month.

  **`@bcl32/data-utils`** — `CalculateFeatureStats` counts `date` alongside
  `string` and `select`. This is what keeps the change behaviour-neutral: a date
  field filters as a string, so it needs the same grouped-count stat a string
  gets, or its stats entry would come back empty and its filter would behave
  differently from the free-text box it replaced.

  **Upgrading:** adopt this BEFORE regenerating metadata against schema-utils
  with the date type. `canRenderFormElement` returns `false` for a type it does
  not know, so metadata declaring `type: "date"` against an older `@bcl32/forms`
  makes those fields **vanish from the form** rather than fall back to a text
  box. Publish → deps-sync → regenerate, in that order.

  Filtering is unchanged: `date` still filters as a string (contains). A real
  date-range filter needs a date-only comparison first — the `datetime` filter
  parses a bare `"2026-06-15"` as UTC midnight and compares it against a
  local-time bound, which drops boundary days west of UTC.

## 2.4.0

### Minor Changes

- e35673f: Close the bulk-update migration window — `resolveBulkUpdateUrl` no longer derives

  2.3.0 shipped `resolveBulkUpdateUrl` with a fallback to the old
  `update_api_url + "/bulk-update"` derivation, so an app could adopt the package
  before regenerating its metadata with a capability-aware generator. That window
  is now closed: absence of `bulk_update_api_url` means "no bulk route", not
  "unknown".

  The precondition is met. Print-Tracker, House-Hunter and Security-Benchmarks all
  run generated metadata from bcl32-schema-utils ≥ 0.13.0, and image-poc — the one
  registry still unmigrated, and frozen — does not depend on `@bcl32/data-utils`
  at all, so its freeze was never a blocker.

  What this switches off is exactly the four models with row editing but no bulk
  route: Print-Tracker's `PrintJob` and `UploadJob` (a dialog that 405s on submit
  today), and Security-Benchmarks' `Benchmark` and `Run`, whose pages already
  clear `update_api_url` by hand so nothing visibly changes there.

  **Upgrading:** a call site that hand-injects `update_api_url` for a model the
  generator gives no URLs at all — anything `surface: embedded`, scoped under a
  parent route — was getting its bulk URL out of the derivation for free, and that
  URL may well have been real. Those sites must now inject `bulk_update_api_url`
  explicitly. Print-Tracker's part-set members and project-items tables are both
  this shape; their bulk routes exist and are preserved by injection, not by
  derivation.

## 2.3.0

### Minor Changes

- 9e81236: Read the bulk-update endpoint as a capability instead of deriving it

  A generated ModelData file's URL keys are feature flags — `update_api_url` gates
  row editing, `delete_api_url` gates bulk delete. Bulk edit was the exception: it
  had no URL of its own and was built as `update_api_url + "/bulk-update"`, so it
  was always present wherever editing was, and the button shipped on tables whose
  API has no such route (Print-Tracker's `UploadJob`, Base-POC, which batches at
  `/batch`) — a dialog that 405s on submit.

  bcl32-schema-utils 0.13.0 emits `bulk_update_api_url` only when the route exists
  in the app's OpenAPI document. This release consumes it:

  - **data-utils** — new `resolveBulkUpdateUrl(ModelData)`, and `ModelData` gains
    the `bulk_update_api_url` field. It falls back to the old derivation while the
    key is absent, so a frontend that upgrades before regenerating its metadata
    keeps bulk edit; that fallback is a migration window and is marked for deletion
    once every app emits the key.
  - **forms** — `BulkEditModelForm` posts to the resolved URL, and its
    `ModelData` prop no longer requires `update_api_url`.
  - **datatable** — the bulk-edit button and its disabled placeholder gate on the
    resolved bulk URL rather than on row editability, and the Create button now
    requires `add_api_url` as well as `create_enabled` (the same "URL as well as
    the flag" rule bulk delete already followed) — with no create route, that
    button posted to `""`.

## 2.2.3

### Patch Changes

- 1ef7569: feat(filters): numeric-array range filter (any-axis min/max slider)

## 2.2.2

### Patch Changes

- 963cf6b: fix(data-utils,filters): kill phantom "Invalid Date" datetime filter chip on all-null columns

## 2.2.1

### Patch Changes

- 6670a0d: Republish: registry 2.2.0 is a stale 2026-02 artifact (predates getFormDefault and pivotTimeSeries); the real 2.2.0 publish was rejected as a duplicate and masked by CI. 2.2.1 carries the current dist.

## 2.2.0

### Minor Changes

- dd612fd: Add `pivotTimeSeries`, a pure helper that bridges the grouped time-series
  backend contract (`Array<{ group, points: Array<{ bucket, value }> }>`) to the
  wide row format the chart components consume, returning `{ data, seriesKeys }`.
  A `null` group collapses to the `"value"` key; rows are keyed and sorted by
  bucket string (no date math). Exposed at `@bcl32/data-utils/pivotTimeSeries`.

## 2.1.10

### Patch Changes

- aee527f: feat(forms,data-utils,datatable): id_list support for bulk-edit and stats

  FormElement now renders id_list as a label-space Combobox over `attr.options`
  ({value, label} pairs), BulkEditModelForm includes id_list fields in its
  list-style merge/replace toggle (defaulting to "Add to existing"), and
  StatsTable skips id_list rather than falling through to default rendering.
  Unlocks bulk-editing reference-array fields like Part.systems.

## 2.1.9

### Patch Changes

- 94e4ba1: feat(hooks,forms): multipart auto-detect in mutations + file type in FormElement

## 2.1.8

### Patch Changes

- acd0e2c: feat(filters): add colour filter type with shared ColourPickerPopover

## 2.1.7

### Patch Changes

- bf5f36e: FilterProvider and useEntityFilters hook, percentage-based column widths, and hardened numeric parsing

## 2.1.6

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
