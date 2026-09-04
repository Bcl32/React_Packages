# @bcl32/datatable

> Package reference. See the [packages overview](../00-OVERVIEW.md) for how this package fits into the wider `@bcl32/*` ecosystem.

| | |
| --- | --- |
| **Package** | `@bcl32/datatable` |
| **Version** | `2.9.0` |
| **Tier** | `composite` |

## Purpose

A full-featured data table library built on [TanStack Table v8](https://tanstack.com/table) that provides a toolbar-integrated table with built-in CRUD dialogs (add / edit / bulk-edit / delete), column visibility toggling, row selection, optional virtualization, expandable rows, and pagination. Rows render in one of five switchable layouts over the same table instance — the classic `<table>` (`TableView`), a responsive card grid (`CardView`, see [Card view](#card-view)), a dense media-tile [gallery](#gallery-view), a master/[detail pane](#detail-pane-view), or a group-lane [board](#board-view). Which of them the toolbar offers is derived from what the table declares, and a consumer can go further and declare [views of its own](#view-catalogue) over those layouts. It also ships two simpler read-only table variants (`KeyValueTable`, `StatsTable`) and a set of unstyled HTML table primitives (`Table`, `TableHeader`, `TableBody`, etc.).

As a **composite** tier package it sits on top of several other `@bcl32/*` packages and is meant to be consumed directly by application code, not by other library packages.

## How it fits together

Four layers, and the boundary that matters is between the third and the fourth: **one TanStack instance, several renderers over it.** Switching view never re-fetches, re-sorts, or loses a tick.

```
┌─ PAGE ───────────────────────────────────────────────────────────────┐
│ data fetching · grouping into sections · view state + persistence    │
│ toolbarActions · row selection (when the page owns it)               │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
┌─ TABLE-DATA (app-side convention, not this package) ─────────────────┐
│ a hook returning { columns: ColumnGenerator({...}), columnVisibility, │
│ defaultSort, renderCard, estimatedCardHeight, … }                    │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
┌─ DataTable ──────────────────────────────────────────────────────────┐
│ ONE useReactTable: sorting · rowSelection · columnVisibility ·        │
│ expansion · pagination.  Resolves the active view, then merges that  │
│ view's overrides over its own props.                                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             ▼
   TableView │ CardView(cards) │ CardView(gallery) │ BoardView │ DetailPaneView
                      └────────┬────────┘              │
                            RowCard ◄──────────────────┘
                               ├── DefaultCard   (slot-driven)
                               └── renderCard    (bespoke, yours)
```

### The five renderers at a glance

| | **table** | **cards** | **gallery** | **board** | **detail** |
|---|---|---|---|---|---|
| Offered when | always | always | a visible column is `slot:"media"` | `board` supplied | `renderSubComponent` supplied |
| `renderCard` | — | **yes** | **ignored** by design | **yes** | — |
| Card quick actions | **no** | yes (footer) | **no** | yes | yes (pane header) |
| Virtualized | yes | yes (chunked) | yes | **no** | yes (list) |
| Size knob | column `size` | `cardMinWidth` | `GALLERY_SIZE_WIDTHS` | `cardMinWidth` = lane width | `detailListWidth` |
| Scrolls as | one block | one block | one block | sideways | **two panes** |

### Row actions: three separate mechanisms

They do not overlap, and knowing which one you are reaching for saves declaring the wrong one:

| | table | cards / board | gallery | detail |
|---|---|---|---|---|
| **Display column** (`columnHelper.display`) | ✔ your cell | ✘ | ✘ | ✘ |
| **`RowActions` ⋯ menu** (the `actions` column) | ✔ | ✔ top-right | ✔ overlay | ✔ pane header |
| **`ToolbarAction`** bulk button | ✔ toolbar | ✔ toolbar | ✔ | ✔ |
| **`ToolbarAction`** with `card` | ✘ | ✔ card footer | ✘ | ✔ pane header |

An action that must exist in *both* the table and the card layouts is declared twice — once as a column, once as a `card` toolbar action. That is the design, not an oversight: a column is a cell renderer with a width, a card action is a button bound to a row.

### Where each size comes from

```
TABLE      column.size          a RATIO, not pixels — width: size/totalSize %
           minSize / maxSize    the only absolute constraints
           maxCellHeight        per-cell scroll clamp (meta.noMaxHeight opts out)
CARDS      cardMinWidth  ── overrides ──►  CARD_SIZE_WIDTHS {260, 320, 400}
              └─ measured: cols = floor((width + 12) / (min + 12))
                 …which drives BOTH the CSS grid and the virtualizer chunking
GALLERY    GALLERY_SIZE_WIDTHS {104, 144, 208}   same preset NAMES, different px
BOARD      cardMinWidth = lane width             not virtualized
DETAIL     detailListWidth 300 · estimatedDetailRowHeight 68
```

Size every column you care about: an unsized one takes TanStack's 150 default and distorts every other column's share of the total.

### "Grouping" means two different things

1. **Board lanes** — `BoardConfig.lanes` + `laneOf`, fed from `@bcl32/filters`' `useEntityGroups`. See [Where the lanes come from](#where-the-lanes-come-from).
2. **A page's own grouping into several tables** — nothing to do with this package. That is a consumer rendering one `DataTable` per group (Print-Tracker's project sections do exactly this).

### Two things that are not what they look like

- **`TableView`'s sticky header does not stick.** The classes are kept for the opaque ground and stacking order only. The nearest scroll container to the `<thead>` is the wrapper the `Table` primitive puts around every table (`overflow-x-auto`, which makes the block axis a scroll container too) and it never scrolls vertically; the region that does is three levels up in `DataTable`. This is why `SortControl` sits in the toolbar at all.
- **Pagination is the exception.** `pageSize` defaults to 9999, so `getPageCount() > 1` is false unless a consumer opts in. Everything else loads whole and virtualizes.

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

Available subpaths: `./DataTable`, `./TableView`, `./CardView`, `./BoardView`, `./RowCard`, `./GalleryCard`, `./DetailPaneView`, `./Table`, `./KeyValueTable`, `./StatsTable`, `./ColumnGenerator`, `./RowActions`, `./TablePagination`.

## Public Exports

### Components & utilities

| Name | Kind | Description |
| --- | --- | --- |
| `DataTable` | component | Primary full-featured table. Wraps TanStack Table with a sticky-header scrollable body, toolbar (title, filter slot, then a right-aligned button group: bulk-edit / custom toolbar actions / delete, create dialog, layout toggle, column-visibility dropdown), optional row virtualization via TanStack Virtual, expandable sub-rows, and a row-click handler. A pagination bar renders automatically when page count > 1. |
| `TableView` | component | The `<table>` layout of a DataTable's rows, extracted so it can sit beside the card-based layouts as one of several renderings of the same TanStack table instance. Rarely used directly — `DataTable` renders it when `view === "table"`. |
| `CardView` | component | Card-grid layout of a DataTable's rows over the same table instance (sorting / selection / expansion / filtering all carry over). Card content derives from the visible column cells via `meta.card` slot hints. Rarely used directly — `DataTable` renders it when `view === "cards"`, and again with `variant="gallery"` when `view === "gallery"`. |
| `GalleryTile` | component | The media-only tile `CardView` draws under `variant="gallery"`: the media cell at size, the title clamped to a two-line caption, select + row-actions overlaid on hover. See [Gallery view](#gallery-view). |
| `DetailPaneView` | component | Master/detail layout — a compact card list beside a permanently docked `renderSubComponent`. Rarely used directly — `DataTable` renders it when `view === "detail"`. See [Detail pane view](#detail-pane-view). |
| `partitionCells` / `renderCell` | util | Split a row's visible cells into card regions (`CardCells`); `partitionCells(row, slotOverrides?)` takes an optional per-view remap. Shared by the card, gallery and detail layouts so all three agree on which cells are controls rather than content. |
| `CardQuickActions` / `applicableCardActions` | component / util | Per-row rendering of the toolbar actions that opted in with `card` (`CardActions`). Used by the default card's footer and the detail pane's header. |
| `CardSortControl` | component | Toolbar sort control (field `<select>` + direction button) shown by `DataTable` while the card view is active, since cards have no column headers to click. |
| `CardSelectAllControl` | component | Toolbar select-all checkbox + row count, shown by `DataTable` in every non-table layout — the stand-in for the table's header checkbox. Renders `null` when the table has no visible `select` column. |
| `CardSizeControl` | component | Toolbar card-density `<select>` (compact / comfortable / large), shown by `DataTable` in the card, gallery and board layouts. Feeds `cardMinWidth`, which the width-driven grid turns into a column count and the board into a lane width; the gallery resolves the same preset names against `GALLERY_SIZE_WIDTHS`. |
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
| `DataTableView` | type (union) | `"table" \| "cards" \| "gallery" \| "detail" \| "board"` — the DataTable **layouts** (the renderers). Also exported as the `DATA_TABLE_VIEWS` const array plus an `isDataTableView` guard. |
| `DataTableViewDef` / `DataTableViewOption` | type (interface / union) | A consumer-declared **view** over one of those layouts, and what `views` accepts (a layout name or a declaration). See [View catalogue](#view-catalogue). |
| `resolveViewDefs` / `toViewDef` / `VIEW_TOGGLE_DEFAULTS` | util / const | Normalise `views` into complete defs, and the per-layout icon+label a declaration inherits (`ViewDefs`). Exported mainly so a consumer can reuse the built-in icons. |
| `CardSlot` / `CardSlotOverrides` | type | The five card regions, and a column-id → region map for per-view remapping (`ColumnLabels`). |
| `RenderCardSlots` | type (interface) | The shape of `ctx.slots` handed to a bespoke card. |
| `CardViewVariant` | type (union) | `"cards" \| "gallery"` — which card `RowCard` draws in a grid slot. |
| `CardMeta` | type (interface) | Shape of a column's `meta.card` slot hint (see [Card view](#card-view)). |
| `DataTableToolbar` | component | The two-zone toolbar (see [Toolbar anatomy](#toolbar-anatomy)). Rendered by `DataTable`; rarely used directly. |
| `SortControl` | component | Field + direction sort for **both** layouts. `CardSortControl` remains as a deprecated alias. |
| `RenderCardContext` | type (interface) | What a bespoke `renderCard` receives besides the row — the quick actions, select cell, edit button, and row-actions menu (see [Bespoke cards](#bespoke-cards-rendercard)). |
| `RowEditButton` | component | "Edit this one row", as a button owning its own dialog. Drawn by the `EditEntry` cell and by every card-shaped layout (see [Row editing](#row-editing)). |
| `rowEditNode` | util | Resolves a row's edit control — the visible `EditEntry` cell, else a synthesised `RowEditButton`, else null. |
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
  title?: string;   // omit when a PageFilterBar above the table draws it; the title row is then skipped
  columns: ColumnDef<TData, unknown>[];
  tableData: TData[];
  ModelData: ModelData;
  columnVisibility?: VisibilityState;
  defaultSort?: string;
  create_enabled?: boolean;
  add_api_url?: string;
  query_invalidation?: string[];
  filter?: DataTableFilter;
  toolbarStyle?: "standard" | "compact" | "quiet" | "none";  // see Toolbar styles
  hideViewToggle?: boolean;                      // the consumer draws the layout switch itself
  rowSelection?: RowSelectionState;                          // controlled selection, keyed by row id
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void;
  rowClickFunction?: (data: TData) => void;
  renderSubComponent?: ({ row }) => ReactNode;
  expandOnRowClick?: boolean;
  cellClassName?: string;
  maxCellHeight?: number;
  pageSize?: number;
  virtualized?: boolean;
  estimatedRowHeight?: number;
  onBulkEditSuccess?: (selectedIds: string[], enabledData: Record<string, unknown>) => void;
  onEditSuccess?: (formData, objData) => void;   // after a single-row save from the package's edit button
  rowEditEnabled?: boolean;                      // per-row edit button in the column-less layouts; see Row editing
  toolbarActions?: (selectedIds: string[]) => ToolbarAction<TData>[];
  bulk_delete_enabled?: boolean;
  view?: string;                                 // controlled view — a layout name or a declared view's key
  defaultView?: string;                          // uncontrolled initial view (default "table", "cards" under 768px)
  onViewChange?: (view: string) => void;
  viewStorageKey?: string;                       // opt-in localStorage persistence (uncontrolled only)
  views?: (DataTableView | DataTableViewDef<TData>)[];  // which views the toggle offers (default: derived)
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => ReactNode;  // card view: replace the default card
  renderCardWrapper?: (row, wrapperProps, children) => ReactNode;  // card-shaped views: take over the outer wrapper — the drag seam
  renderSectionWrapper?: (section, sectionProps, children) => ReactNode;  // sections view: take over each section's grid element — the section drag seam
  sectionHeaderActions?: (section) => ReactNode; // sections view: trailing header furniture (⋯ menu, edit affordances)
  sectionHeaderLeading?: (section) => ReactNode; // sections view: leading header furniture, before the chevron (drag grip)
  sectionTone?: SectionTone;                     // sections view: per-group backdrop from the theme card palette (default "none")
  sectionsPacking?: SectionsPacking;             // sections view: how sections fill the page (default "fit-narrow")
  estimatedCardHeight?: number;                  // card/gallery: virtualizer estimate per grid row (default 220 / tile width + 44)
  cardSize?: CardSize;                           // card view: controlled density preset
  defaultCardSize?: CardSize;                    // card view: uncontrolled initial preset (default "comfortable")
  onCardSizeChange?: (size: CardSize) => void;
  cardMinWidth?: number;                         // card view: explicit min card width; overrides cardSize
  detailListWidth?: number;                      // detail view: master-list width in px (default 300)
  estimatedDetailRowHeight?: number;             // detail view: virtualizer estimate per list item (default 68)
  board?: BoardConfig<TData>;                    // board view: the lanes and the row→lane mapping
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

### Toolbar styles

`toolbarStyle` chooses how much of the above is drawn:

| Value | What renders |
|---|---|
| `"standard"` (default) | Both zones, as drawn above. Edit / delete appear only once something is selected. |
| `"compact"` | As standard, but edit and delete stay visible as disabled ghost icon buttons at rest, so the actions advertise themselves. |
| `"quiet"` | **Nothing at rest.** Once rows are selected, one slim bar in the toolbar's place: `N selected` · `CardSelectAllControl` · `Edit (n)` · the `toolbarActions` as buttons · `Delete (n)` · `Clear`. No title, filters, sort, view toggle or card-size control. |
| `"none"` | No toolbar at all. |

Orthogonal to all four: **`hideViewToggle`** suppresses the layout toggle wherever the toolbar would have drawn it, for a consumer that renders the switch itself. The table still owns the shape through `view` / `onViewChange` — only the control moves. Print-Tracker's section headers do this, so a wall of section cards carries one folded-away trigger each instead of five permanent icon buttons.

`"quiet"` and `"none"` exist for tables that are a **section of a page rather
than the page** — a stack of them down one screen, where the title, filters,
sort and view toggle are either the page's job or meaningless per section, and
eight permanent 2-zone headers read as chrome. What is genuinely per-section is
what you do with the rows ticked *there*, which is all the quiet bar draws. Pick
`"none"` when even that belongs to the page (one bulk bar over the union of
every section's selection); pair it with controlled `rowSelection` so the page
can see what was ticked.

Note that neither style takes the *shape* away with the chrome: a consumer that
wants a switch draws its own and passes `hideViewToggle`, which is independent of
`toolbarStyle`. Putting the toggle inside the toolbar instead ties it to how much
toolbar there is, and `"none"` then removes it — which is a real trap, since
"the page owns bulk actions" says nothing about who owns the shape.

The quiet bar draws bulk **Edit** and **Delete** under the same gates the
standard toolbar uses (`resolveBulkUpdateUrl(ModelData)`, `bulk_delete_enabled`
plus `ModelData.delete_api_url`), and
through the same `BulkEditButton` / `BulkDeleteButton` components — as it does
the `toolbarActions`, so nothing has to be written twice. It carried neither
until 2.12, on the reasoning that they belonged to the table that owns the
entity rather than a section view of it; in practice the quiet bar is what
*every* layout below full width draws, so the effect was that ticking a
checkbox anywhere but the Table shape led nowhere, and the standard toolbar the
argument pointed at is exactly the one those shapes hide.

### Row editing

Two independent routes, resolved per row by `rowEditNode(row, view)`:

1. the table's own **`EditEntry` cell**, when `ColumnGenerator` was called with
   `add_edit: true` and the column is visible;
2. otherwise a synthesised **`RowEditButton`**, when `rowEditEnabled` is on and
   `ModelData.update_api_url` is set.

The column wins, so a table already drawing a pencil never grows a second one,
and a consumer's custom edit cell keeps beating the package's default.

`rowEditEnabled` defaults to `Boolean(ModelData.update_api_url)`. It is on by
default because the edit dialog only ever existed as a *column* or as an item
in the ⋯ menu — both table furniture — so cards, gallery tiles, board lanes,
grouped sections and the docked detail pane, none of which draw columns, had no
edit route at all. Pass `rowEditEnabled={false}` for a table whose rows are
edited somewhere else entirely.

Where each layout puts it:

| Layout | Placement |
|---|---|
| `table` | the `EditEntry` column, or the ⋯ menu's Edit item — unchanged |
| `cards` / `board` / `sections` | the card footer, right-aligned beside the expander |
| `gallery` | the top-right hover overlay, beside the ⋯ menu |
| `detail` | the pane header, beside the docked card actions |
| bespoke `renderCard` | wherever the card puts `ctx.edit` |

`onEditSuccess` is notified after a save from the package's own button. (The
`EditEntry` column and the ⋯ menu take their own callback through
`ColumnGenerator`, which is where those two are built.)

### Row selection

Selection is self-managed by default. Supply `rowSelection` to control it and
`onRowSelectionChange` to be told about writes — the same shape TanStack uses,
so a plain `setState` can be passed straight in, and a handler that merges into
a wider map gets the updater function rather than a flattened value:

```tsx
onRowSelectionChange={(updater) =>
  setSelections((prev) => {
    const current = prev[sectionId] ?? {};
    return {
      ...prev,
      [sectionId]: typeof updater === "function" ? updater(current) : updater,
    };
  })
}
```

Row ids come from `getRowId: (row) => String(row.id)`, so the keys of the map
are entity ids. Keep the object identity stable while the selection is
unchanged — a literal `rowSelection={map[id] ?? {}}` hands TanStack a fresh
object on every render and re-derives the selected-row model each time (cheap,
but pointless on a long table; hoist the empty default to a module constant). Supplying `onRowSelectionChange` *without* `rowSelection` keeps
the table self-managed and simply notifies — useful for a page that mirrors a
count. Every internal writer (the header and card checkboxes, select-all, the
bulk edit / delete forms, the quiet bar's Clear) goes through one resolved
setter, so all of them work identically in both modes.

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

## View catalogue

The five layouts are *renderers*. A page often wants more **shapes** than there are renderers — three card sizes over the same rows are three shapes drawn by one renderer, and a slim column preset and the full table are two more drawn by another. A `DataTableViewDef` is how a consumer declares one:

```ts
interface DataTableViewDef<TData extends RowData = RowData> {
  key: string;                 // persisted, and what onViewChange reports
  base: DataTableView;         // which of the five renderers draws it
  label: string;               // toolbar tooltip / aria-label
  icon?: React.ReactNode;      // defaults to the base layout's icon
  // each overrides the DataTable prop of the same name, for this view only
  renderCard?: (row, ctx) => React.ReactNode;
  renderCardWrapper?: (row, wrapperProps, children) => React.ReactNode; // drag seam — see below
  renderSectionWrapper?: (section, sectionProps, children) => React.ReactNode; // section drag seam (sections base) — see below
  sectionHeaderActions?: (section) => React.ReactNode; // trailing section header furniture (sections base)
  sectionHeaderLeading?: (section) => React.ReactNode; // leading section header furniture (sections base)
  sectionTone?: SectionTone;   // per-group backdrop palette (sections base) — see below
  sectionsPacking?: SectionsPacking; // section packing strategy (sections base) — see below
  variant?: CardViewVariant;   // pin the tile independent of base (2.13+) — see below
  cardMinWidth?: number;
  estimatedCardHeight?: number;
  columnVisibility?: VisibilityState;
  cellClassName?: string;
  maxCellHeight?: number;
  cardSlots?: CardSlotOverrides;   // see "Per-view slot remapping" below
}
```

Pass them to `views`, mixed freely with built-in layout names:

```jsx
const ITEM_VIEWS = [
  { key: "minimal", base: "cards", label: "Minimal", icon: <Grid2x2 size={16}/>,
    renderCard: minimalCard, cardMinWidth: 100 },
  { key: "compact", base: "cards", label: "Compact", icon: <LayoutGrid size={16}/>,
    renderCard: miniCard, cardMinWidth: 176 },
  { key: "list",    base: "table", label: "List", icon: <List size={16}/>,
    columnVisibility: SLIM, cellClassName: "py-0.5" },
  "table",
];

<DataTable views={ITEM_VIEWS} view={key} onViewChange={setKey} … />
```

What this buys beyond tidiness: **a view switch no longer remounts the table.** Before it existed a table held one `renderCard` and one column preset, so a page wanting four shapes mounted four tables and swapped between them — which threw away the sort, the scroll position and the row selection every time.

- **Resolution.** `views` is normalised to defs (a bare string becomes `{key: v, base: v, …default icon/label}`), then `view ?? uncontrolled ?? width-default` is looked up by `key`. An unknown key falls back to the **first entry**, not to `"table"` — a page that declares its shapes has said, by ordering them, which one it opens on, and may not offer a plain table at all.
- **Column presets re-seed on every switch into a view.** `columnVisibility` is table state seeded once, so without this a per-view preset would only apply on the mount that happened to start there. Adjusted during render, so the switch never paints a frame of the outgoing view's columns.
- **Backwards compatible.** Omit `views`, or pass plain layout names, and nothing changes. The built-in keys keep their names, so a stored `layout: "cards"` still resolves.
- **`showCardSizeControl`** is suppressed when the active view pins its own `cardMinWidth`, exactly as a table-level one always did.

### Per-view slot remapping (`cardSlots`)

A column's `meta.card.slot` is a property of the *column*, so a table gets one card shape out of it. A view supplying `cardSlots` gets its own — same columns, different arrangement — without either view needing a bespoke card:

```jsx
{ key: "compact", base: "cards", cardMinWidth: 176,
  cardSlots: { thumbnail_url: "media", name: "title",
               status: "badge", weight_g: "footer" } }
```

Merged over each column's own `meta.card` at partition time. Control columns (`select`, `actions`, `EditEntry`, `expander`) are matched by id first and cannot be remapped — a select checkbox pushed into the body would be a control the card no longer places.

**What slots can express:** which region, order within it, presence (via `columnVisibility`), and whether a body field shows its label. **What they cannot:** geometry. The regions are a fixed vertical stack — no thumbnail beside a column of fields, no value overlaid on the image, no full-bleed bar, no nesting. Cards whose point is geometry stay bespoke; `ctx.slots` (below) is how they stop re-deriving their content.

## Card view

Added in 2.9.0. Every DataTable gets a toolbar toggle (table / cards icons) that switches the row layout between the classic `<table>` and a responsive card grid. Both layouts consume the **same TanStack table instance**, so sorting, upstream filtering, row selection (bulk edit / delete), expansion, and row-click behaviour carry over unchanged — no consumer changes are required to enable it.

Three further icons appear when the table has what they need: [Gallery](#gallery-view), [Detail pane](#detail-pane-view), and [Board](#board-view).

### Which layouts a table offers

The toggle is built from a derived list, not a set of flags — each conditional layout needs something the table has already declared, so there is nothing extra to opt into:

| View | Appears when |
|---|---|
| `table`, `cards` | always |
| `gallery` | a **visible** column sets `meta.card.slot === "media"` |
| `detail` | the consumer passes `renderSubComponent` |
| `board` | the consumer passes `board` lanes |

Reading media off the *visible* columns means hiding the thumbnail column withdraws the gallery, rather than leaving a toggle that lands on a grid of empty squares.

Two consequences worth knowing:

- **A stored preference is validated on every render.** It outlives the conditions it was chosen under — the group-by attribute goes away, the thumbnail column gets hidden, the same storage key is reused by a page with no expansion panel, a page reorganises the shapes it declares — so a `view` naming something unavailable falls back to the **first available view** instead of rendering an empty one. (For the derived list that is `"table"`, as it always was.)
- **`views` overrides the derivation** when a page wants a fixed set (e.g. gallery only), and is also where a page declares [views of its own](#view-catalogue). The consumer is then responsible for the layout being buildable; nothing re-checks it.

With only one available view the toggle disappears entirely.

### View state

- Uncontrolled by default. Resolution order: `view` (controlled) → the user's toggle choice / `viewStorageKey` localStorage value → `defaultView` → `"cards"` below the 768 px mobile breakpoint, else `"table"`.
- The mobile default only applies when nothing else decided: a consumer that passes `defaultView` (or a controlled `view`) keeps that layout at every width. `useIsMobile` from `@bcl32/utils` reads the width synchronously, so this resolves on the first render rather than flashing a table and reflowing.
- Pass `viewStorageKey` to persist the user's choice in localStorage — opt-in only, since table titles repeat across pages.
- Controlled via `view` + `onViewChange` when the page owns the state (e.g. a `SettingsContext`). Leaving `view` `undefined` while still passing `onViewChange` is supported and is the useful shape for a settings store: the table stays uncontrolled (so the mobile default still applies) until the user actually picks a layout, and every pick is reported for persistence.

### How a card is assembled

Cards derive their content from the **visible** column cells (the column-visibility dropdown therefore controls which fields appear on cards):

- Control columns (by id — `CONTROL_COLUMN_IDS`) get fixed positions: `select` checkbox top-left, `actions` (RowActions) top-right, the edit control + `expander` in the card footer. Their existing cell renderers are reused verbatim via `flexRender`. The footer's edit control is `rowEditNode`, so it is the `EditEntry` cell on a table that has one and a synthesised button otherwise — see [Row editing](#row-editing).
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
  edit: ReactNode;          // the row's edit button, or null — see below
  slots: {                  // the content cells, rendered and bucketed by slot
    media: ReactNode[]; title: ReactNode[]; badge: ReactNode[];
    body: ReactNode[]; footer: ReactNode[];
  };
}
```

Everything else stays available on `row` itself (`row.original`, `row.getIsSelected()`, `row.toggleSelected()`). Reach for this when a card's shape is genuinely different from "one labelled row per field" — Print-Tracker's `ProjectItemCard` leads with a build-progress bar and gives print-job chips a full-width band, neither of which survives being flattened into body fields.

`ctx.slots` is what stops the two composition routes being either/or. A bespoke card keeps full control of the **geometry** — the only reason to write one — while its **content** stays declared once on the columns, formatted by the same cell renderers the table uses, and respecting any per-view `cardSlots`:

```jsx
renderCard: (row, ctx) => (
  <div className="flex gap-2">
    {ctx.slots.media}
    <div className="min-w-0 flex-1">{ctx.slots.title}{ctx.slots.badge}</div>
    <div className="-mx-2 mt-auto">{ctx.slots.footer}</div>
  </div>
)
```

Each array is empty rather than absent when nothing claims that slot, so a card can `.length` a region without guarding. Reading `row.original` directly still works and is still right for anything the columns don't carry.

### The card wrapper seam (`renderCardWrapper`)

Where `renderCard` replaces a card's *content*, `renderCardWrapper` (2.13+) takes over its **outer wrapper** — the element the layout's CSS grid actually positions. This is the drag-and-drop seam: `useSortable`/`useDraggable` need their ref, transform and listeners on the *positioned* element, and before this existed that element was closed, so a sortable ref could only reach a div inside the grid cell and transforms slid content around a stationary cell.

```tsx
function SortableWrapper({ row, wrapperProps, children }) {
  const { setNodeRef, transform, transition, listeners } = useSortable({ id: row.id });
  return (
    <div ref={setNodeRef} {...wrapperProps} {...listeners}
         style={{ transform: CSS.Translate.toString(transform), transition }}>
      {children}
    </div>
  );
}

<DataTable renderCardWrapper={(row, wrapperProps, children) => (
  <SortableWrapper key={row.id} row={row} wrapperProps={wrapperProps}>{children}</SortableWrapper>
)} … />
```

The contract, all of it load-bearing:

- **Render one outermost element and spread `wrapperProps` onto it.** It carries `role`/`tabIndex`/`onFocus`/`onClick` (roving focus + row click-through) and the `data-row-index` / `data-board-pos` attributes keyboard navigation and the cross-view scroll hand-off find cards by. Drop them and those features silently break.
- **You return a component, so hooks are legal inside it** — that is why the seam is shaped this way rather than handing you a ref.
- **Wrapped cards render without framer-motion.** `CARD_MOTION` sets `layout: true`, and framer's layout projection fights a drag library's transform for the same CSS property. Views with a wrapper trade the enter/exit animation for drags that track true — deliberate.
- Applies in every card-shaped view (cards, gallery, board, sections), is honoured under `variant="gallery"` (unlike `renderCard`), and is per-view overridable via the view def.

### Pinning the tile (`variant`)

A view def may set `variant: "gallery"` to draw the media-only `GalleryTile` under any card-shaped base (2.13+). Until this existed the tile was welded to the layout — `base: "gallery"` was the only route to the tile, so a *sections* view could never pack photo tiles into its groups. A photo wall grouped by category is `{ base: "sections", variant: "gallery" }`; the variant also selects the size-preset table (`GALLERY_SIZE_WIDTHS`), so such a view gets gallery densities without carrying its own `cardMinWidth`.

### Tree boards (`buildTreeBoard`)

`buildTreeBoard(nodes, options)` (2.13+) maps a **curated tree** — user-created sections with parent/child nesting and rows assigned by id — onto a `BoardConfig`, so hand-arranged hierarchies render through the same sections view that draws attribute grouping. The consumer maps its rows into `TreeBoardNode` (`{ id, label, children?, visual?, span? }`) and says how a data row names its node:

```ts
const board = {
  ...buildTreeBoard(nodes, { nodeIdOf: (r) => r.section_id, groupLabel: "Sections" }),
  laneAggregate, onLaneClick, // BoardConfig extras compose on top
};
```

Mechanics, ported from Print-Tracker's curated pages: depth beyond two rolls rows up into their level-1 ancestor; a parent holding direct rows *and* children gets a per-parent dashed "loose" lane so its count agrees with its visible cards; the ungrouped lane is synthesized last (`isNone`), and `laneOf` sends **unknown** ids there too — a row pointing at a deleted node lands in Ungrouped instead of vanishing. Drop handlers translate lane values back with `parseTreeLane(value)` → `{kind: "ungrouped" | "loose" | "node", …}` rather than string-matching the sentinels.

`keepEmptyChildren: true` renders a parent's empty child sections instead of dropping them — required for drag-and-drop, where an empty section that never renders can never be a drop target. It works through `BoardLane.parentValue`: inner levels normally drop empty lanes (that is what scopes each child lane to its own parent), so an empty lane is rescued only inside the parent that declared it.

The nesting *rules* for such trees — what a section drag may do, why a nest is refused — live beside it in `SectionNesting`: `resolveSectionDrop`, `nestingBlockedReason`, `moveTargets`, `mergeBlockedReason`/`mergeTargets`, the `acceptsItemDrag`/`acceptsSectionDrag` drop-target predicates, and the shared `DROP_RING` class. All pure functions over ids — the package still has no dnd-kit dependency; the predicates read the drag payload structurally.

### The section wrapper seam (`renderSectionWrapper`)

`renderCardWrapper`'s sibling one rung up (2.13+, sections base only): takes over each rendered section's **outermost grid element**, so a consumer can make sections droppable (destination ring) and the section tiles themselves draggable. The inner `<section>` chrome — border, header, body — stays package-rendered and arrives as `children`.

```tsx
renderSectionWrapper={(section, sectionProps, children) => (
  <SortableSection key={section.path} section={section} sectionProps={sectionProps}>
    {children}
  </SortableSection>
)}
```

`section` is a `SectionWrapperInfo`: `{ value, label, path, depth, rootIndex, parentValue, isNone, collapsed, count }` — `parentValue` is the enclosing section's lane value (`null` at top level), which is exactly what a section-drag payload needs, and `rootIndex` (2.14+) is the render position of the section's *top-level ancestor*, which is what `sectionTone` keys off. The contract mirrors the card seam's: render **one outermost element**, spread `sectionProps` onto it — its `className` is the span-tier grid geometry and its `style` (2.15+) is the measured row span and track width, so **both must be merged, never replaced**; a wrapper that forwards only `className` compiles fine and silently packs nothing — keep any drop ring `ring-inset` (a ring that grows the element invalidates the rects a drop is resolved against under `MeasuringStrategy.Always`), and return a component instance so it can own `useSortable`/`useDroppable`.

A lane can also pin its own **tile size** with `cardSize` (`"compact" | "comfortable" | "large"`), beside `span`. Sizes resolve against the active variant's preset table, so the same name means a gallery tile in a photo view and a card in a record view, and the pinned size feeds the auto span too — a section's width is an answer about how many of *its own* tiles fit. `buildTreeBoard` carries `cardSize` from a `TreeBoardNode`, validating it exactly as it validates `span`: both arrive from persisted per-section config, where a retired value outlives the code that wrote it, and an unknown size would index the preset table to `undefined` and emit a broken grid template.

`sectionHeaderActions(section)` and `sectionHeaderLeading(section)` are the companion slots — the two ends of the section header row. `actions` is trailing furniture, after the count: a per-section ⋯ menu, rename/delete affordances. `leading` renders **before the collapse chevron**, at the head of the row, and is where a drag grip (`data-drag-grip`) belongs: a handle for the whole section should sit at the head of the row it drags, and in the trailing cluster it shifts sideways whenever the count or aggregate changes width. Every prop here is per-view overridable via the view def, like every other shape prop.

### Section backdrops (`sectionTone`)

`sectionTone` (2.14+, sections base only) gives each group its own backdrop from the theme's **card palette** — `surface-1 … surface-8`, see [themes](./themes.md#card-backdrop-palette--surface-1--surface-8). It exists because a packer with a dozen groups is a wall of identical frames: the sections are all there, but nothing says where one ends and the next begins.

```tsx
<DataTable … sectionTone="index" />                               // by position
<DataTable … sectionTone={(s) => CATEGORY_TONE[s.value] ?? null} /> // by value
```

| value | behaviour |
|---|---|
| `"none"` (default) | the neutral `bg-card/50` / `bg-background/40` frame — an existing consumer sees no change until it opts in |
| `"index"` | by top-level position, **sub-sections inheriting their parent's hue** at 60% |
| `(section) => number \| null` | caller-owned mapping; any integer, cycled — return `null` for no backdrop |

Two rules are baked in rather than configurable:

- **A group is a top-level section and everything under it.** Nesting inherits `rootIndex`, so a sub-section is an inset of its parent's colour, never a ninth one. This is also why the palette is stored opaque — the nested rung applies `/60` over its parent's own hue, and two alpha tints would multiply.
- **The "no value" bucket is never tinted**, whatever the resolver returns. It already signals itself with muted text and a dashed frame; colouring it would make absence look like just another group.

Prefer the function form when reordering shouldn't reshuffle the page, or when a value should keep one colour across pages ("Kitchen" is always the same hue).

**This package never records how many backdrops exist.** `themeSurfaceCount()` counts the `--surface-N` custom properties on the running document, and a backdrop is applied as an inline `hsl(var(--surface-N))` rather than a `bg-surface-N` class. That choice is what removes the drift: a Tailwind class would have to be a scannable literal, and a literal map *is* a hard-coded palette size that would keep cycling through eight after @bcl32/themes shipped ten. Growing the palette needs no change here and no version bump.

It also degrades honestly. An app on an @bcl32/themes without the palette measures zero, `resolveSectionTone` returns `undefined`, and sections keep the neutral frame — rather than painting with a token that doesn't exist.

Cost is one `getComputedStyle` per sections render (never per section), memoized per `data-theme`, and skipped entirely while `sectionTone` is `"none"`. The memo is keyed rather than global because nothing guarantees two themes define the same number — themes.json is hand-editable, which is exactly why @bcl32/themes reports the minimum — and a stale count yields a `var()` with no definition, which is invalid at computed-value time and paints **transparent** (measured), so the section would silently lose its backdrop on a theme switch.

`themeSurfaceCount()` and `sectionToneStyle(tone, depth, count?)` are exported for consumers doing their own tinting — a board's lanes, a set of cards.

### Section packing (`sectionsPacking`)

`sectionsPacking` (2.15+, sections base only) decides how sections fill the page. CSS grid's dense auto-placement only back-fills **horizontally**, so a short section beside a tall one left a hole nothing could reach — a gallery of a dozen groups was mostly whitespace. Sections now measure their own height and take a `grid-row: span N` in coarse row modules, which gives the flow something to pack against on both axes.

```tsx
<DataTable … sectionsPacking="tight" />
```

| mode | what it trades |
|---|---|
| `rows` | no packing at all — the pre-2.15 layout, byte for byte |
| `packed` | fills gaps, sub-sections stay equal-width |
| `fit-wide` | content-sized sub-sections, single-row bias |
| `fit-narrow` (default) | content-sized sub-sections, stacks vertically |
| `uniform` | every tile the same size (shrink tolerance 0), pins still win |
| `tight` | 8px row module — masonry-close |

Tile sizes become **targets rather than auto-fill minimums**. A section computes an integer column count from its measured content width and admits one extra column when the resulting shrink is within 12% — the measured gap between "still the size you picked" and "visibly smaller" (largest accepted 9.9%, smallest rejected 14.8%). Rows then fill exactly instead of stranding a chrome-induced empty track. Width comes from `getBoundingClientRect()`, never `clientWidth`: the latter's rounding flips column counts at the boundary.

Sub-sections are content-sized — a nested grid mirrors its parent's track count, pinned children map proportionally through `spanTierTracks`, and an auto child takes `clamp(ceil(sqrt(n)), 1, cap)` tracks. That is a deliberate **narrow bias**: trading a row for width reads better in a gallery than one long line.

Three things are load-bearing and easy to undo by accident:

- **The 48px row module.** A collapsed header measures 46px; a 44px module would ceil it to 2 and leave a dead sliver under every collapsed section.
- **The observer stores raw pixels**, and `sectionRowSpan(h, modulePx)` derives the span at render. Quantizing at measurement time freezes the geometry on the old module across a mode switch, because a `ResizeObserver` does not re-fire when nothing resized — the bug surfaces on the *second* interaction, not the first.
- **Track counts ride CSS custom properties** (`--sec-tracks`, `--sec-col-span`) consumed through `md:[…:var(…)]` classes. An inline style would beat the below-`md` single-column media query and break small screens.

Measuring every section on every render deadlocks against framer-motion's commit-phase reflows (Maximum update depth). The layout effect measures only span-less sections; the `ResizeObserver` owns every update after that, and fires on `observe()` so nothing is missed.

### Layout & virtualization

- The column count derives from the measured container width and the effective minimum card width — not Tailwind breakpoints — so the grid and the virtualizer chunking always agree.
- With `virtualized`, rows are chunked into grid rows of `cols` cards and one chunk is virtualized per item (same `measureElement` pattern as the table view, against the shared scroll region). `estimatedCardHeight` seeds the estimates — default 220 for cards, or the tile width + 44 in the gallery, whose height tracks its square rather than sitting at a fixed guess.
- Expanded rows render `renderSubComponent` full-width (`col-span-full`) below their card's grid row.

### Card-mode toolbar controls

Shown while any non-table layout is active (see [Toolbar anatomy](#toolbar-anatomy)
for where they sit):

- `CardSelectAllControl` — shown in **every** non-table layout, since none of them has a header row. The equivalent of the table's header checkbox, labelled with the row count it acts on (`Select all (413)`). Renders nothing when the table has no visible `select` column. The count comes from the pre-grouped row model, i.e. exactly the rows `toggleAllRowsSelected` will select. It keeps its "Select all (N)" wording when everything is selected rather than swapping in a shorter label, which would resize the control on the click that toggled it.
- `CardSizeControl` — card density (`compact` 260 px / `comfortable` 320 px / `large` 400 px, via the exported `CARD_SIZE_WIDTHS`, or 104 / 144 / 208 px against `GALLERY_SIZE_WIDTHS` in the gallery — see `sizeWidthsForVariant`). Since both grids are width-driven this is effectively a "how many columns" control; on the board the same number is the lane width. Controlled with `cardSize` + `onCardSizeChange`, or uncontrolled from `defaultCardSize` (default `"comfortable"`). Hidden below `sm` **in the grids** (one column fits regardless) but kept on the board, where lane width always matters; not shown in the detail view, whose list is a fixed single column; and hidden entirely when the consumer pins an explicit `cardMinWidth`, which overrides the preset.

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

Toggling layouts preserves the reading position. Before swapping, `DataTable` reads the topmost visible row index off the outgoing layout's `ViewScrollHandle`; the incoming layout consumes it on mount and scrolls there (the card grid converting row index → chunk index via its measured column count). Accurate to about one row, since the layouts have different row heights.

Every layout stamps `data-row-index` on its rendered rows/cards/list items and marks its owning element with `data-row-scope`, which is what makes the index readable from the DOM without any layout knowing about the others. The detail view measures against its own master-list scroller rather than the shared scroll region, since that region is not the thing that scrolls in that layout. The scope attribute exists because a `DataTable` nested inside an expansion panel stamps its own rows the same way.

Note the index is always the **row-model** index, even on the board where a row can appear in several lanes. That is what keeps the hand-off meaningful across all five; the board carries a second, board-local coordinate (`data-board-pos`) for its own keyboard cursor.

### Animation

Framer Motion, on by default, disabled entirely under `prefers-reduced-motion` or `animate={false}`:

- **View toggle** — a 120 ms cross-fade (`AnimatePresence mode="wait"`, so the two layouts never overlap in the scroll region).
- **Card enter/exit + reflow** — cards fade and scale in and out as the row set changes, which is what makes filtering feel responsive. **Off while `virtualized`**: cards mount and unmount as the scroll position moves, so enter/exit would fire on scrolling rather than on the data changing.

### Differences from the table layout

- No `<tfoot>` — column `footer` defs are not rendered (every footer in the apps duplicates its header).
- `cellClassName` is not applied (it is `<td>`-specific); `maxCellHeight` applies to body-slot values, with the same `meta.noMaxHeight` opt-out.

## Gallery view

Media-only tiles in a dense auto-fill grid, for rows whose **thumbnail is the information** — Parts and Plates, where you recognise the thing you want by its shape long before you read its name.

It is `CardView` with `variant="gallery"`, so it inherits the chunking, virtualization, keyboard navigation, selection and scroll hand-off wholesale; only the card in the grid slot changes (`GalleryTile` instead of `RowCard`'s default). What that tile keeps:

- The **media** cell, filling a square. The bleed that media renderers carry for table cells is neutralized, and the image fills the tile rather than being pinned to the card view's fixed `h-32 w-32` — here the tile itself is what sets the size.
- The **title** cell as a caption, clamped to two lines. A caption allowed to run makes its tile taller than its neighbours, which in a grid means one long name adds a band of white space across the whole row. The clamp is repeated on descendant links (`[&_a]:line-clamp-2`) because a title cell is often a flex row rather than plain text (Plates renders name + kind badge), and a flex row is exactly one line box however tall its contents wrap.
- **Select** and **row-actions**, overlaid on the image and revealed on hover/focus, so a grid you are only browsing reads as pictures rather than a checklist. A ticked checkbox stays visible regardless — hiding the evidence of a selection is how you bulk-edit rows you forgot you had picked.

Everything else the card places (badges, labelled body fields, footer, quick actions) is dropped; that is what lets the grid run four to five times denser. `renderCard` is **ignored** here for the same reason — honouring a bespoke card would just render the card layout at tile widths.

Sizes come from `GALLERY_SIZE_WIDTHS` (compact 104 px / comfortable 144 px / large 208 px) rather than `CARD_SIZE_WIDTHS`. The preset *names* are shared so the toolbar control and the stored preference carry across a view switch, but a "comfortable" tile is less than half a "comfortable" card. The virtualizer estimate tracks tile width (`cardMinWidth + 44`) instead of the card view's fixed 220.

## Detail pane view

A compact master list on the left, the row's `renderSubComponent` **permanently docked** on the right.

This is the layout for entities whose expansion content is the real page — Spools and Filaments already render a full detail grid there. In the table and card views that content costs a click to open, pushes every row below it down the page, and can only be compared against another row by opening both and scrolling between them. Docked, it is always on screen and moving between rows is an arrow key.

- **The active row is local state, not TanStack expansion.** Expansion is a set (any number open at once); this pane shows exactly one. On a wide screen "nothing picked" resolves to the first row rather than leaving the pane empty; the same fallback catches the active row leaving the row model on a filter keystroke, sort, or delete.
- **List clicks dock; they do not navigate.** A title cell is usually a `<Link>` covering most of the item, so honouring it would mean nearly every click navigated away from the layout you just switched into. The pane header renders the same title cell, so the link is still one click away once you are there. Implemented in the **capture** phase with `stopPropagation` — a react-router `<Link>` cancels the event itself and navigates programmatically from its own `onClick`, so a bubbled `preventDefault` is too late.
- **The pane header is an identity strip, not a heading.** The panels that get docked open with their own title, so a second full-weight one directly above reads as a repeat. What the row is for is staying put while the panel scrolls, and giving the row's actions (quick actions, edit, `⋯`) a home — the list items are too narrow to carry them.
- **Keyboard**: ↑/↓/Home/End move the docked row, Space ticks it, Enter docks *and* runs `rowClickFunction` — the one thing a plain click deliberately no longer does.
- **Panel remounts per row** (keyed on row id) rather than carrying the previous row's open accordions, scroll position, or half-typed inline edit across.
- **Below the mobile breakpoint** the two panes become one column that takes turns: the list until a row is picked, then the panel with a "Back to list" button. Nothing is auto-picked there — it would hide the list behind a row the user never asked for.

Unlike the other layouts this one does **not** scroll as a block: it owns two independently scrolling panes, so `DataTable` switches its scroll region to `overflow-hidden` for this view. It therefore wants a height-bounded parent (the usual `flex flex-col` + fixed-height container). Without one the panes degrade to growing with their content — untidy, not broken. `detailListWidth` (default 300) and `estimatedDetailRowHeight` (default 68) tune it.

## Board view

A fifth layout: one vertical lane per group value, each lane holding the **same `RowCard`** the card grid draws. It runs on the same TanStack table instance as the others, so sorting, filtering, selection and expansion carry over, and cards within a lane follow the table's current sort.

Pass `board` to enable it. Supplying it is also what puts the Board button in the toolbar — a table with nothing to group by would otherwise get a toggle that leads nowhere, and a stored `"board"` preference falls back to the table when `board` goes away (see [Which layouts a table offers](#which-layouts-a-table-offers)).

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
- **`toolbarStyle="compact"`.** Renders ghost icon buttons for edit / delete when nothing is selected (instead of hiding them), giving users a visual affordance that the actions exist. See [Toolbar styles](#toolbar-styles) for `"quiet"` and `"none"`, which drop most of the toolbar for section-of-a-page tables.
- **Controlled selection is all-or-nothing per table.** Passing `rowSelection` without `onRowSelectionChange` freezes the selection: writes are routed to a handler that isn't there, exactly as with any controlled React input. Pass both, or neither.
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
