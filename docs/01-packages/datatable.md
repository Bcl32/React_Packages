# @bcl32/datatable

> Package reference. See the [packages overview](../00-OVERVIEW.md) for how this package fits into the wider `@bcl32/*` ecosystem.

| | |
| --- | --- |
| **Package** | `@bcl32/datatable` |
| **Version** | `2.9.0` |
| **Tier** | `composite` |

## Purpose

A full-featured data table library built on [TanStack Table v8](https://tanstack.com/table) that provides a toolbar-integrated table with built-in CRUD dialogs (add / edit / bulk-edit / delete), column visibility toggling, row selection, optional virtualization, expandable rows, and pagination. Rows render in one of two switchable layouts over the same table instance — the classic `<table>` (`TableView`) or a responsive card grid (`CardView`, see [Card view](#card-view)). It also ships two simpler read-only table variants (`KeyValueTable`, `StatsTable`) and a set of unstyled HTML table primitives (`Table`, `TableHeader`, `TableBody`, etc.).

As a **composite** tier package it sits on top of several other `@bcl32/*` packages and is meant to be consumed directly by application code, not by other library packages.

## Installation & Import

This package is consumed through the pnpm workspace. Application `package.json` files declare it with the workspace protocol:

```jsonc
{
  "dependencies": {
    "@bcl32/datatable": "workspace:^2.9.0"
  }
}
```

All exports are available from the package root **and** from per-export subpaths (defined via `package.json` `exports`). Importing from the narrower subpath keeps bundles lean:

```ts
// Root barrel
import { DataTable, ColumnGenerator } from "@bcl32/datatable";

// Equivalent subpath imports (preferred for tree-shaking)
import { DataTable } from "@bcl32/datatable/DataTable";
import { ColumnGenerator } from "@bcl32/datatable/ColumnGenerator";
import { KeyValueTable } from "@bcl32/datatable/KeyValueTable";
import { StatsTable } from "@bcl32/datatable/StatsTable";
import { RowActions } from "@bcl32/datatable/RowActions";
import { DataTablePagination } from "@bcl32/datatable/TablePagination";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@bcl32/datatable/Table";
```

> **Note:** Subpath exports require the consumer's TypeScript config to use `moduleResolution: "bundler"` (or `"node16"`). Under `"node"` resolution the subpaths will not resolve.

Available subpaths: `./DataTable`, `./TableView`, `./CardView`, `./Table`, `./KeyValueTable`, `./StatsTable`, `./ColumnGenerator`, `./RowActions`, `./TablePagination`.

## Public Exports

### Components & utilities

| Name | Kind | Description |
| --- | --- | --- |
| `DataTable` | component | Primary full-featured table. Wraps TanStack Table with a sticky-header scrollable body, toolbar (title, filter slot, then a right-aligned button group: bulk-edit / custom toolbar actions / delete, create dialog, table↔cards view toggle, column-visibility dropdown), optional row virtualization via TanStack Virtual, expandable sub-rows, and a row-click handler. A pagination bar renders automatically when page count > 1. |
| `TableView` | component | The `<table>` layout of a DataTable's rows, extracted so it can sit beside `CardView` as one of two renderings of the same TanStack table instance. Rarely used directly — `DataTable` renders it when `view === "table"`. |
| `CardView` | component | Card-grid layout of a DataTable's rows over the same table instance (sorting / selection / expansion / filtering all carry over). Card content derives from the visible column cells via `meta.card` slot hints. Rarely used directly — `DataTable` renders it when `view === "cards"`. |
| `CardSortControl` | component | Toolbar sort control (field `<select>` + direction button) shown by `DataTable` while the card view is active, since cards have no column headers to click. |
| `CardSelectAllControl` | component | Toolbar select-all checkbox + row count, shown by `DataTable` in card view — the card-mode stand-in for the table's header checkbox. Renders `null` when the table has no visible `select` column. |
| `CardSizeControl` | component | Toolbar card-density `<select>` (compact / comfortable / large), shown by `DataTable` in card view. Feeds `cardMinWidth`, which the width-driven grid turns into a column count. |
| `ColumnGenerator` | util | Factory that prepends standard control columns (select checkbox, expand toggle, optional edit button) and appends standard timestamp columns (`time_created`, `time_updated`) plus a `RowActions` dropdown to a caller-supplied `custom_columns` array. Returns a complete `ColumnDef<RowData, unknown>[]` ready to pass to `DataTable`. |
| `RowActions` | component | Per-row dropdown menu (three-dot icon) containing an Edit dialog (opens `EditModelForm`) plus Copy ID and Copy Row clipboard actions. Handles focus restoration after dialog close. |
| `DataTablePagination` | component | Pagination control bar: selected-row count, a page-number input, and first / prev / next / last navigation buttons. Accepts a TanStack Table instance directly. *(Exported from the `./TablePagination` subpath.)* |
| `KeyValueTable` | component | Simple two-column (Key / Value) read-only table for flat key-value pairs. Values are coerced to string. |
| `StatsTable` | component | Nested stats display table. Outer table maps group keys to a `StatsCell`; the inner cell renders per-stat rows with type-aware formatting. |

### HTML table primitives (`./Table`)

Unstyled / lightly-styled `forwardRef` wrappers around native table elements, styled with Tailwind. Use these to build a bespoke table when `DataTable` is too opinionated.

| Name | Kind | Description |
| --- | --- | --- |
| `Table` | component | Base `<table>` primitive. Wraps the table in a relative, `overflow-x-auto` div with caption-bottom sizing. |
| `TableHeader` | component | Styled `<thead>` with `border-b` on rows. |
| `TableBody` | component | Styled `<tbody>` that removes the bottom border from the last row. |
| `TableFooter` | component | Styled `<tfoot>` with muted background and top border. |
| `TableRow` | component | Styled `<tr>` with hover / selected state classes driven by `data-[state=selected]`. |
| `TableHead` | component | Styled `<th>` with muted foreground colour, 12-unit height, and checkbox alignment support. |
| `TableCell` | component | Styled `<td>` with `p-4` padding and checkbox alignment support. |
| `TableCaption` | component | Styled `<caption>` with muted foreground colour. |

All primitives have the signature `React.ForwardRefExoticComponent<React.HTMLAttributes<...>>` for their respective element type.

### Exported types

| Name | Kind | Description |
| --- | --- | --- |
| `ToolbarAction` | type (interface) | Describes a custom toolbar button injected via `DataTable`'s `toolbarActions` prop. |
| `DataTableFilter` | type (interface) | Shape of the `filter` prop on `DataTable`. |
| `DataTableView` | type (union) | `"table" \| "cards"` — the two DataTable layouts. |
| `CardMeta` | type (interface) | Shape of a column's `meta.card` slot hint (see [Card view](#card-view)). |
| `DataTableToolbar` | component | The two-zone toolbar (see [Toolbar anatomy](#toolbar-anatomy)). Rendered by `DataTable`; rarely used directly. |
| `SortControl` | component | Field + direction sort for **both** layouts. `CardSortControl` remains as a deprecated alias. |
| `RenderCardContext` | type (interface) | What a bespoke `renderCard` receives besides the row — the quick actions, select cell, and row-actions menu (see [Bespoke cards](#bespoke-cards-rendercard)). |
| `ViewScrollHandle` | type (interface) | The scroll hand-off contract both layouts implement so a view toggle can keep its position. |
| `ROW_INDEX_ATTR` / `ROW_SCOPE_ATTR` | const | DOM attribute names both layouts stamp for that hand-off. |
| `CardViewProps` / `TableViewProps` | type (interface) | Props of the two view components. |
| `CardSize` | type (union) | `"compact" \| "comfortable" \| "large"` — the card density presets. |
| `CONTROL_COLUMN_IDS` | const | The `ColumnGenerator`-injected column ids (`select`, `expander`, `EditEntry`, `actions`) that get fixed card positions. |
| `CARD_SIZE_WIDTHS` / `DEFAULT_CARD_SIZE` | const | Preset → minimum card width in px (`compact` 260, `comfortable` 320, `large` 400), and the default preset (`"comfortable"`). |
| `columnLabelText` / `columnCardLabel` | util | Label resolution for a column (`ColumnLabels.tsx`, shared by the card body fields and the sort dropdown): `meta.card.label` → ModelData attribute title via `fieldLabel` → rendered header → humanized column id. |

## Signatures & Props

### `DataTable`

```ts
DataTable<TData extends RowData>(props: {
  title: string;
  columns: ColumnDef<TData, unknown>[];
  tableData: TData[];
  ModelData: ModelData;
  columnVisibility?: VisibilityState;
  defaultSort?: string;
  create_enabled?: boolean;
  add_api_url?: string;
  query_invalidation?: string[];
  filter?: DataTableFilter;
  toolbarStyle?: "standard" | "compact";
  rowClickFunction?: (data: TData) => void;
  renderSubComponent?: ({ row }) => ReactNode;
  expandOnRowClick?: boolean;
  cellClassName?: string;
  maxCellHeight?: number;
  pageSize?: number;
  virtualized?: boolean;
  estimatedRowHeight?: number;
  onBulkEditSuccess?: (selectedIds: string[], enabledData: Record<string, unknown>) => void;
  toolbarActions?: (selectedIds: string[]) => ToolbarAction<TData>[];
  bulk_delete_enabled?: boolean;
  view?: DataTableView;                          // controlled layout mode
  defaultView?: DataTableView;                   // uncontrolled initial mode (default "table", "cards" under 768px)
  onViewChange?: (view: DataTableView) => void;
  viewStorageKey?: string;                       // opt-in localStorage persistence (uncontrolled only)
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => ReactNode;  // card view: replace the default card
  estimatedCardHeight?: number;                  // card view: virtualizer estimate per grid row (default 220)
  cardSize?: CardSize;                           // card view: controlled density preset
  defaultCardSize?: CardSize;                    // card view: uncontrolled initial preset (default "comfortable")
  onCardSizeChange?: (size: CardSize) => void;
  cardMinWidth?: number;                         // card view: explicit min card width; overrides cardSize
  animate?: boolean;                             // view-toggle cross-fade + card enter/exit (default true)
}) => JSX.Element
```

### `ColumnGenerator`

```ts
ColumnGenerator({
  custom_columns: ColumnDef<RowData, unknown>[];
  query_invalidation: string[];
  ModelData: ModelData & { update_api_url: string };
  add_edit?: boolean;
  onEditSuccess?: (formData, objData) => void;
}) => ColumnDef<RowData, unknown>[]
```

### `RowActions`

```ts
RowActions<TData extends { id: string | number }>({
  row: Row<TData>;
  ModelData: ModelData & { update_api_url: string };
  query_invalidation: string[];
  onEditSuccess?;
}) => JSX.Element
```

### `DataTablePagination`

```ts
DataTablePagination<TData>({ table: Table<TData> }) => JSX.Element
```

### `KeyValueTable`

```ts
KeyValueTable({
  table_data: Array<{ key: string; value: string | number | boolean }>;
}) => JSX.Element
```

### `StatsTable`

```ts
StatsTable({
  table_data: Record<string, Array<{ name: string; value: unknown; type: string }>>;
}) => JSX.Element
```

`StatsCell` renders per-stat rows with type-aware formatting:

| `type` | Rendering |
| --- | --- |
| `number` | numeric value |
| `datetime` | formatted via dayjs |
| `boolean` | green / red coloured text |
| `list` | inline list |
| `object` / `bins` | JSON `<pre>` block |
| `count` | inline paragraphs |
| `children`, `id_list` | **silently skipped** (no output, no warning) |

### `ToolbarAction`

```ts
interface ToolbarAction<TData = unknown> {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (selectedIds: string[]) => void;
  visible?: boolean;
  variant?: string;
  disabled?: boolean;

  // Card view: also render this action per card (see Card quick actions).
  card?: "icon" | "full";
  cardLabel?: string;                      // when the bulk label carries a count
  cardVisible?: (row: TData) => boolean;
  cardDisabled?: (row: TData) => boolean;
  onCardClick?: (row: TData) => void;      // when the handler needs the row, not its id
}
```

### `DataTableFilter`

```ts
interface DataTableFilter {
  toolbar: ReactNode;      // renders inline in the header bar
  panel: ReactNode;        // renders as a collapsible sibling above the table body
  filteredCount: number;
  totalCount: number;
}
```

## Toolbar anatomy

Everything above the rows lives in `DataTableToolbar`, in **two zones**. They
used to be one wrapping flex row holding up to thirteen elements, six of which
appear, disappear, or change width with the row selection — mixing *which rows
am I looking at* with *what do I do with them*, and forcing the control order to
be chosen for layout-shift avoidance rather than meaning.

```
┌──────────────────────────────────────────────────┐
│ Parts (128/540)                                  │  zone 1 — which rows
│ 🔍 search…   ⚙ Filters (3)   [Colour: Red ×]     │
│ ┌ filter panel (expandable) ───────────────────┐ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤  divider
│        [Edit 2][Delete 2][+ New][☑All][Sort][▦][⋮]│ zone 2 — what to do
├──────────────────────────────────────────────────┤
│ … rows / cards …                                 │
└──────────────────────────────────────────────────┘
```

**Zone 1 — which rows.** Title, the `(filteredCount/totalCount)` pair, the
filter search box / Filters pill / active chips (`filter.toolbar`), and the
expandable `filter.panel`. The count heads this zone because it is the filters'
output. The chip strip scrolls sideways rather than wrapping: chips are
unbounded in number, and letting them grow the zone taller would push the table
down every time one was added.

**Zone 2 — what to do with them.** Bulk actions and view controls, sitting
directly on the table they act on. Order: bulk edit → `toolbarActions` → delete
→ create → `CardSelectAllControl` → `CardSizeControl` → `SortControl` → view
toggle → columns dropdown.

The **selection-dependent** buttons come first in this right-anchored group.
They appear, disappear, and change width with the selection count; laid out last
they would shove every stable control sideways on the very click that changed
the selection. First, they grow leftward into the row's slack and the sort,
view-toggle and column controls hold position to the pixel.

With no `filter` prop the zones collapse to a bare title above the controls —
no count, no divider, no panel node.

`props.filter` is an opaque `{ toolbar, panel, filteredCount, totalCount }`
object from `@bcl32/filters`' `useDataTableFilterBar`; DataTable only decides
where to place those two nodes, so the zone split needs nothing from consumers.

### Sorting

`SortControl` (field dropdown + direction button) renders in the toolbar for
**both** layouts:

- Cards have no column headers to click.
- The table's headers *do* scroll out of view — `TableHeader`'s `sticky top-0`
  is defeated by the scroll wrapper inside the `Table` primitive (see
  [Known Smells & Caveats](#known-smells--caveats)) — so on a long table sorting
  was otherwise unreachable without scrolling back to the top.

There is no state and nothing to keep in sync: the control and the header click
handler both read and write TanStack's `sorting`, so the dropdown, its direction
button and the header's ↑/↓ arrow always agree. Sortable options are all
sortable non-control columns (`CONTROL_COLUMN_IDS` excluded). When the active
sort has no visible column — DataTable defaults to `time_created`, which many
tables don't show — it is still listed, rather than leaving a blank control that
misreports the order the rows are in.

## Card view

Added in 2.9.0. Every DataTable gets a toolbar toggle (table / cards icons) that switches the row layout between the classic `<table>` and a responsive card grid. Both layouts consume the **same TanStack table instance**, so sorting, upstream filtering, row selection (bulk edit / delete), expansion, and row-click behaviour carry over unchanged — no consumer changes are required to enable it.

A third icon appears when the consumer supplies `board` — see [Board view](#board-view), which draws the same cards in group lanes.

### View state

- Uncontrolled by default. Resolution order: `view` (controlled) → the user's toggle choice / `viewStorageKey` localStorage value → `defaultView` → `"cards"` below the 768 px mobile breakpoint, else `"table"`.
- The mobile default only applies when nothing else decided: a consumer that passes `defaultView` (or a controlled `view`) keeps that layout at every width. `useIsMobile` from `@bcl32/utils` reads the width synchronously, so this resolves on the first render rather than flashing a table and reflowing.
- Pass `viewStorageKey` to persist the user's choice in localStorage — opt-in only, since table titles repeat across pages.
- Controlled via `view` + `onViewChange` when the page owns the state (e.g. a `SettingsContext`). Leaving `view` `undefined` while still passing `onViewChange` is supported and is the useful shape for a settings store: the table stays uncontrolled (so the mobile default still applies) until the user actually picks a layout, and every pick is reported for persistence.

### How a card is assembled

Cards derive their content from the **visible** column cells (the column-visibility dropdown therefore controls which fields appear on cards):

- Control columns (by id — `CONTROL_COLUMN_IDS`) get fixed positions: `select` checkbox top-left, `actions` (RowActions) top-right, `EditEntry` + `expander` in the card footer. Their existing cell renderers are reused verbatim via `flexRender`.
- Every other cell places itself via `meta: { card: CardMeta }` on its `ColumnDef`:

```ts
interface CardMeta {
  slot?: "media" | "title" | "badge" | "body" | "footer"; // default "body"
  label?: string;      // body-field label override; also used by the sort dropdown
  hideLabel?: boolean; // body slot: omit the label when the value is self-describing
}
```

- Body cells render as `label: value` rows. Labels resolve as `meta.card.label` → the matching `ModelData.model_attributes` title (via `fieldLabel` from `@bcl32/forms`) → the rendered column header → the humanized column id.
- Unannotated tables degrade gracefully: the first non-control visible cell is promoted to the title slot and the rest become labeled body fields.
- `renderCard={(row, ctx) => ...}` replaces the default card entirely (CardView still supplies the grid slot, click handling, keyboard navigation, selection `data-state`, and the expansion panel). See [Bespoke cards](#bespoke-cards-rendercard).

### Card quick actions

A `ToolbarAction` that sets `card` renders **twice from one declaration**: as the toolbar's bulk button over the selection, and as a per-card button in the card footer. The card button calls the same `onClick` with just that row's id (`[row.id]`), so an action written for the toolbar needs no second implementation — provided its handler uses the ids it is *passed* rather than closing over the selection.

- `card: "icon"` renders icon-only (label becomes the tooltip / `aria-label`); `card: "full"` renders icon + label.
- `cardLabel` overrides the label on cards. Bulk labels usually carry a selection count (`Move (3)`), which reads wrong on a single card.
- `cardVisible(row)` / `cardDisabled(row)` gate the card button per row.
- The card affordance **deliberately ignores `visible` / `disabled`**. Those are near-always derived from the selection ("enabled once something is ticked"), which says nothing about whether the action applies to the one row a card stands for.
- That independence makes `{ visible: false, card: "full" }` the way to declare a **card-only action** — one that never made sense in bulk. Print-Tracker's per-item "Claim from bin" is declared this way: it opens a quantity dialog for one row, so it has no toolbar button at all.

```ts
toolbarActions={(selectedIds) => [
  {
    key: "move-items",
    label: `Move (${selectedIds.length})`,
    onClick: (ids) => openMoveDialog(ids),   // ids, not selectedIds
    visible: selectedIds.length > 0,
    card: "full",
    cardLabel: "Move",
  },
]}
```

### Bespoke cards (`renderCard`)

`renderCard(row, ctx)` hands back the controls the default card would otherwise have placed, so overriding the *layout* doesn't mean re-implementing the *features*:

```ts
interface RenderCardContext {
  quickActions: ReactNode;  // the row's `card` toolbar actions, rendered
  select: ReactNode;        // the select checkbox cell, or null
  actions: ReactNode;       // the RowActions (⋯) menu cell, or null
}
```

Everything else stays available on `row` itself (`row.original`, `row.getIsSelected()`, `row.toggleSelected()`). Reach for this when a card's shape is genuinely different from "one labelled row per field" — Print-Tracker's `ProjectItemCard` leads with a build-progress bar and gives print-job chips a full-width band, neither of which survives being flattened into body fields.

### Layout & virtualization

- The column count derives from the measured container width and the effective minimum card width — not Tailwind breakpoints — so the grid and the virtualizer chunking always agree.
- With `virtualized`, rows are chunked into grid rows of `cols` cards and one chunk is virtualized per item (same `measureElement` pattern as the table view, against the shared scroll region). `estimatedCardHeight` (default 220) seeds the estimates.
- Expanded rows render `renderSubComponent` full-width (`col-span-full`) below their card's grid row.

### Card-mode toolbar controls

Shown while either card-based layout is active — the grid or the board (see
[Toolbar anatomy](#toolbar-anatomy) for where they sit):

- `CardSelectAllControl` — the card-mode equivalent of the table's header checkbox, labelled with the row count it acts on (`Select all (413)`). Renders nothing when the table has no visible `select` column. The count comes from the pre-grouped row model, i.e. exactly the rows `toggleAllRowsSelected` will select. It keeps its "Select all (N)" wording when everything is selected rather than swapping in a shorter label, which would resize the control on the click that toggled it.
- `CardSizeControl` — card density (`compact` 260 px / `comfortable` 320 px / `large` 400 px, via the exported `CARD_SIZE_WIDTHS`). Since the grid is width-driven this is effectively a "how many columns" control; on the board the same number is the lane width. Controlled with `cardSize` + `onCardSizeChange`, or uncontrolled from `defaultCardSize` (default `"comfortable"`). Hidden below `sm` **in the grid** (one column fits regardless) but kept on the board, where lane width always matters, and hidden entirely when the consumer pins an explicit `cardMinWidth`, which overrides the preset.

`SortControl` is **not** in this list — it serves both layouts. See below.

### Keyboard navigation

The card grid is a roving-tabindex `role="grid"`: exactly one card is in the tab order, so Tab moves *past* the grid rather than through every card in it. With a card focused:

| Key | Action |
| --- | --- |
| `←` / `→` | previous / next card |
| `↑` / `↓` | up / down one grid row (± the measured column count) |
| `Home` / `End` | first / last row |
| `Space` | toggle selection (only when the row is selectable) |
| `Enter` | activate — same as clicking (row click and/or expand) |

Keys are only handled when the event target *is* a card root, so a keystroke inside a card — typing in an inline editor, Space on its checkbox — belongs to that control. Under virtualization the target card often doesn't exist yet when focus moves; the request stays pending across commits until the virtualizer renders it.

The keyboard cursor is a **dashed `outline` drawn inside the card** (`outline-offset: -3px`), and each of those three properties is load-bearing:

- **`outline`, not `ring`.** A Tailwind ring is a `box-shadow`, which paints *under* the element's children — the opaque `<Card>` inside the focus wrapper would cover it completely. Outlines paint above descendants. Being a separate CSS property from the selection ring also means a card that is both focused and selected shows both indicators rather than one winning.
- **Inside, not outside.** The card grid sits flush against its scroll region (zero gap at the top and left edges), so anything drawn outside a card is clipped away on the first row and either edge column. This is the same trap the inset selection ring already documents.
- **Dashed.** `--ring` and `--primary` are the same colour in these themes, so shape rather than hue is what separates "the cursor is here" from "this row is selected".

### Scroll position across a view toggle

Toggling layouts preserves the reading position. Before swapping, `DataTable` reads the topmost visible row index off the outgoing layout's `ViewScrollHandle`; the incoming layout consumes it on mount and scrolls there (the card grid converting row index → chunk index via its measured column count). Accurate to about one row, since the two layouts have different row heights.

All three layouts stamp `data-row-index` on every rendered row/card and mark their owning element with `data-row-scope`, which is also what makes the index readable from the DOM without any layout knowing about the others. The scope attribute exists because a `DataTable` nested inside an expansion panel stamps its own rows the same way.

Note the index is always the **row-model** index, even on the board where a row can appear in several lanes. That is what keeps the hand-off meaningful across all three; the board carries a second, board-local coordinate (`data-board-pos`) for its own keyboard cursor.

### Animation

Framer Motion, on by default, disabled entirely under `prefers-reduced-motion` or `animate={false}`:

- **View toggle** — a 120 ms cross-fade (`AnimatePresence mode="wait"`, so the two layouts never overlap in the scroll region).
- **Card enter/exit + reflow** — cards fade and scale in and out as the row set changes, which is what makes filtering feel responsive. **Off while `virtualized`**: cards mount and unmount as the scroll position moves, so enter/exit would fire on scrolling rather than on the data changing.

### Differences from the table layout

- No `<tfoot>` — column `footer` defs are not rendered (every footer in the apps duplicates its header).
- `cellClassName` is not applied (it is `<td>`-specific); `maxCellHeight` applies to body-slot values, with the same `meta.noMaxHeight` opt-out.

## Board view

A third layout: one vertical lane per group value, each lane holding the **same `RowCard`** the card grid draws. It runs on the same TanStack table instance as the others, so sorting, filtering, selection and expansion carry over, and cards within a lane follow the table's current sort.

Pass `board` to enable it. Supplying it is also what puts the Board button in the toolbar — a table with nothing to group by would otherwise get a toggle that leads nowhere, and a stored `"board"` preference falls back to the table when `board` goes away.

```ts
interface BoardLane {
  value: string;
  label: string;
  visual?: ReactNode;   // the group's swatch/icon, shown in the lane header
  isNone?: boolean;     // the "no value" bucket: dashed, and hidden when empty
}

interface BoardConfig<TData> {
  lanes: BoardLane[];
  laneOf: (row: TData) => string[];   // array — a row can sit in several lanes
  onLaneClick?: (value: string, isNone: boolean) => void;
  groupLabel?: string;                // e.g. "Status", for the empty state
}
```

### Where the lanes come from

The board deliberately does **not** compute its own grouping — `@bcl32/filters` already does, for the group-cards landing view (`EntityGroupCards`). Feed it from there and a lane header *is* a group tile: same label, same visual, same `Untagged` bucket, same drill-in on click.

- `getGroupableAttrs(modelData)` → the attributes worth grouping by (`filter: true` + `filter_type: "options"`).
- `useEntityGroups(rows, modelData, groupBy, { resolveVisual })` → the lanes.
- `rowGroupValues(row, attr)` → `laneOf`. Both the group counts and the lane membership go through this one function, so a header can't end up saying "(12)" above nine cards.

Two contracts worth stating outright:

- **`lanes` must cover every value `laneOf` can return.** A row whose value has no lane is not rendered anywhere. Deriving both from the same rows satisfies this automatically.
- **Feed it the rows the table is showing** (post-filter), not the raw dataset. Lane counts are computed from `table.getRowModel().rows`, so passing filtered rows is what keeps the counts agreeing with the filter bar. (The landing view counts against everything on purpose — its tiles are a way *in*, before anything is filtered.)

Empty lanes still render, with an `Empty` placeholder: `useEntityGroups` seeds enum buckets from `attr.options` up front, and a status with nothing in it is a fact worth showing. The `isNone` lane is the exception — an empty "Untagged" is noise, so it is dropped.

### Read-only by design

There is no drag. Grouping attributes are frequently multi-valued (a part in two systems is genuinely in both, so a drop has no single meaning) or derived (Print-Tracker's `Project.status` is computed from item progress and the API rejects a write to it outright). Adding drag is a per-entity opt-in for entities with a writable scalar enum and a rank column — not a rewrite of this layout.

### Layout & keyboard

- Lanes are a horizontal flex row, each `cardMinWidth` wide and non-shrinking; the shared scroll region scrolls sideways. Lane headers are `sticky top-0` with an opaque background so cards don't scroll through them.
- **Not virtualized.** Consumers load whole collections client-side and a lane holds a fraction of that; the grid's chunk virtualizer is shaped around one flat row list and doesn't transfer to per-lane scrolling. Revisit if a lane ever holds thousands.
- Same roving-tabindex `role="grid"` as the card grid, with lane-shaped keys:

| Key | Action |
| --- | --- |
| `↑` / `↓` | previous / next card **within the lane** |
| `←` / `→` | nearest lane with cards in it, keeping the position (empty lanes are skipped, not entered) |
| `Home` / `End` | first / last card in the lane |
| `Space` | toggle selection |
| `Enter` | activate — same as clicking |

Because a row can appear in more than one lane, `data-row-index` is no longer unique on screen; cards additionally carry `data-board-pos="<lane>:<position>"`, which is what the keyboard cursor addresses.

## Dependencies

### Internal (`@bcl32/*`)

| Package | Role |
| --- | --- |
| `@bcl32/utils` | UI primitives — `DialogButton`, `Dropdown`, `Button`, etc. |
| `@bcl32/data-utils` | Source of the `ModelData` contract used by CRUD forms. |
| `@bcl32/forms` | `AddModelForm`, `EditModelForm`, `BulkEditModelForm`, `DeleteModelForm` rendered inside the toolbar/row dialogs. |
| `@bcl32/hooks` | Declared in `package.json` but **not imported anywhere in `src/`** — effectively an unused declared dependency. |

### Peer dependencies

| Package | Range |
| --- | --- |
| `react` | `^18.2.0` |
| `react-dom` | `^18.2.0` |
| `dayjs` | `^1.11.10` |
| `@radix-ui/react-dialog` | `^1.1.1` |

### External (bundled) dependencies

| Package | Range |
| --- | --- |
| `@tanstack/react-table` | `^8.11.8` |
| `@tanstack/react-virtual` | `^3.10.8` |
| `@radix-ui/react-icons` | `^1.3.0` |
| `lucide-react` | `^0.447.0` (new in 2.8.0) |
| `framer-motion` | `^11.0.0` (new in 2.10.0 — card view animation; already a `@bcl32/utils` dependency, so no new weight for consumers of both) |

_(`@mui/material` and `@mui/icons-material` were removed in 2.8.0.)_

### UI libraries used

- **lucide-react** — icons: `Plus`, `Pencil`, `Columns3`, `Trash2` (`DataTable.tsx`), `ChevronDown`/`ChevronUp`/`Pencil` (`ColumnGenerator.tsx`). Replaces the old MUI icon set (`Add`, `Edit`, `Delete`, `ViewColumn`, `ExpandMore`, `ExpandLess`).
- **Radix UI** — Dialog (via `@bcl32/utils/DialogButton`), Dropdown (via `@bcl32/utils/Dropdown`), `DotsHorizontalIcon` from `@radix-ui/react-icons` (`RowActions`'s row menu trigger — unaffected by the MUI removal).
- **Tailwind CSS** — all layout and typography classes.

## Conventions a Consumer Must Follow

- **The `ModelData` contract.** `DataTable` and `ColumnGenerator` both require a `ModelData` object (from `@bcl32/data-utils`) whose `model_attributes` array drives the Add / Edit / BulkEdit / Delete form fields. `update_api_url` must be present for edit features to activate; `add_api_url` and `delete_api_url` are read from `ModelData` or supplied as separate props.
- **`RowData` constraint.** The `TData` generic on `DataTable` must extend `RowData` (`id: string | number`, optional `time_created` / `time_updated`, plus `[key]: unknown`).
- **`query_invalidation` keys.** This `string[]` is passed through to every CRUD form for TanStack Query cache invalidation after mutations. Coordinate these keys with your own query hooks so the table refreshes after add / edit / delete.
- **Proportional column sizing.** Header and cell widths are computed as `(column.getSize() / totalSize) * 100%`. The `size`, `minSize`, and `maxSize` values in a `ColumnDef` therefore set **relative proportions**, not fixed pixel widths.
- **`maxCellHeight` opt-out via column meta.** Setting `meta: { noMaxHeight: true }` on a `ColumnDef` exempts that column's cells from the table-level `maxCellHeight` scroll wrapper. `ColumnGenerator` already applies this to the select and expander columns.
- **Card placement via column meta.** Setting `meta: { card: { slot, label, hideLabel } }` on a `ColumnDef` controls where that column's cell lands in the card view (see [Card view](#card-view)). Unannotated columns become labeled body fields.
- **Toolbar action handlers must use the ids they are passed.** `onClick(selectedIds)` receives the ids to act on. Closing over the outer `selectedIds` instead works for the toolbar but silently breaks the card affordance, which passes a single row's id — the card button would act on the selection rather than on its own card.
- **Virtualization needs a bounded container.** `virtualized` is opt-in and requires the parent to give `DataTable` a bounded flex container so the internal `scrollRef` div can actually scroll. Without a bounded height context the virtualizer simply renders all rows (harmless, but no virtualization benefit).
- **`toolbarStyle="compact"`.** Renders ghost icon buttons for edit / delete when nothing is selected (instead of hiding them), giving users a visual affordance that the actions exist.
- **Subpath imports + `moduleResolution`.** All `@bcl32/*` imports resolve via `package.json` `exports` subpaths, so consumers must use `moduleResolution: "bundler"` or `"node16"`.

## Known Smells & Caveats

- **`ColumnGenerator` is not generic.** It is typed against `RowData` directly (not `<TData extends RowData>`), so its returned `ColumnDef<RowData, unknown>[]` requires an `as unknown` cast / type assertion when passed to `DataTable<TData>` with a more specific row type. *(`src/ColumnGenerator.tsx:65`)*
- **`RowActions` duplicates `EditCell` logic.** Both `RowActions` (`src/RowActions.tsx`) and the private `EditCell` inside `ColumnGenerator` (`src/ColumnGenerator.tsx:25-53`) open the same `EditModelForm` inside a `DialogButton`; the only difference is that `RowActions` wraps the trigger in a dropdown menu item. Copy-paste duplication with no shared abstraction.
- **`action_column` always appended but needs `update_api_url`.** `ColumnGenerator` always appends the `RowActions` dropdown column, which requires `update_api_url` (typed as required on its `ModelData` prop), yet `ColumnGenerator` only checks for `update_api_url` on the `EditCell` column, not the action column. Passing a `ModelData` without `update_api_url` satisfies `ColumnGenerator`'s type but causes a mismatch inside `RowActions` at runtime. *(`src/ColumnGenerator.tsx:88-99, 179-184`)*
- **Dead emoji fallback.** The `expand_column` cell renders the literal `🔵` when `row.getCanExpand()` is false (`src/ColumnGenerator.tsx:147`). Since `DataTable` sets `getRowCanExpand: () => true` unconditionally (`src/DataTable.tsx:122`), this branch is dead code when used through `DataTable` — but would appear if `Table` were used standalone.
- **Hardcoded default sort.** `DataTable`'s default sort is `time_created` desc (`src/DataTable.tsx:106-109`). If you pass columns without a `time_created` column the table starts with an invalid sort id; TanStack Table ignores it, but it can confuse consumers.
- **`StatsTable` silently drops `children` / `id_list`.** Those `type` values hit empty `case` blocks (`src/StatsTable.tsx:165-166`) with no placeholder or warning, making unsupported types invisible.
- **Array-index React keys.** `KeyValueTable` (`src/KeyValueTable.tsx:31`) and `StatsTable` (`src/StatsTable.tsx:51, 76`) use array index as the React key, which is fragile if rows are reordered or removed.
- **Unused declared dependency.** `@bcl32/hooks` is listed in `package.json` but never imported in `src/`.
- **Sticky table headers do not stick.** `TableHeader` carries `sticky top-0`, but the `Table` primitive wraps the `<table>` in a `div.overflow-x-auto` (`src/Table.tsx:9`). Per CSS, one non-`visible` overflow axis makes the other compute to `auto`, so that div becomes the nearest scrollport — and it never scrolls vertically, so the header has nowhere to stick. Long-standing, and not caused by the toolbar. Fixing it means collapsing to a single scroll container, which changes a primitive used by every table in three apps; note also that on a wide table (Print-Tracker's Parts Bin) *that wrapper* is currently the element providing horizontal scrolling, so it cannot simply be deleted. The cost is now mostly cosmetic: [`SortControl`](#sorting) put sorting in the toolbar, which was the main thing a pinned header was needed for.

## Minimal Usage Example

```tsx
import { DataTable } from "@bcl32/datatable/DataTable";
import { ColumnGenerator } from "@bcl32/datatable/ColumnGenerator";
import type { ColumnDef } from "@tanstack/react-table";
import type { RowData } from "@bcl32/data-utils";

// Your domain ModelData (from @bcl32/data-utils) drives the CRUD form fields.
import { WidgetModelData } from "./WidgetModelData";

interface Widget extends RowData {
  id: number;
  name: string;
  qty: number;
}

const customColumns: ColumnDef<RowData, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "qty", header: "Quantity" },
];

const columns = ColumnGenerator({
  custom_columns: customColumns,
  query_invalidation: ["widgets"],
  ModelData: WidgetModelData, // must include update_api_url for edit/actions
});

export function WidgetsTable({ data }: { data: Widget[] }) {
  return (
    <DataTable<Widget>
      title="Widgets"
      // ColumnGenerator returns ColumnDef<RowData, unknown>[]; cast for the
      // more specific row type (see "ColumnGenerator is not generic" caveat).
      columns={columns as unknown as ColumnDef<Widget, unknown>[]}
      tableData={data}
      ModelData={WidgetModelData}
      query_invalidation={["widgets"]}
      create_enabled
      add_api_url="/api/widgets"
      bulk_delete_enabled
      pageSize={25}
      rowClickFunction={(row) => console.log("clicked", row.id)}
    />
  );
}
```

---

See also: [packages overview](../00-OVERVIEW.md).
