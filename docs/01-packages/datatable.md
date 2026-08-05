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
| `CardViewProps` / `TableViewProps` | type (interface) | Props of the two view components. |
| `CardSize` | type (union) | `"compact" \| "comfortable" \| "large"` — the card density presets. |
| `CONTROL_COLUMN_IDS` | const | The `ColumnGenerator`-injected column ids (`select`, `expander`, `EditEntry`, `actions`) that get fixed card positions. |
| `CARD_SIZE_WIDTHS` / `DEFAULT_CARD_SIZE` | const | Preset → minimum card width in px (`compact` 260, `comfortable` 320, `large` 400), and the default preset (`"comfortable"`). |
| `columnLabelText` / `columnCardLabel` | util | Label resolution for a column (used by card body fields and the sort dropdown): `meta.card.label` → ModelData attribute title via `fieldLabel` → rendered header → humanized column id. |

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
  toolbarActions?: (selectedIds: string[]) => ToolbarAction[];
  bulk_delete_enabled?: boolean;
  view?: DataTableView;                          // controlled layout mode
  defaultView?: DataTableView;                   // uncontrolled initial mode (default "table", "cards" under 768px)
  onViewChange?: (view: DataTableView) => void;
  viewStorageKey?: string;                       // opt-in localStorage persistence (uncontrolled only)
  renderCard?: (row: Row<TData>) => ReactNode;   // card view: replace the default card
  estimatedCardHeight?: number;                  // card view: virtualizer estimate per grid row (default 220)
  cardSize?: CardSize;                           // card view: controlled density preset
  defaultCardSize?: CardSize;                    // card view: uncontrolled initial preset (default "comfortable")
  onCardSizeChange?: (size: CardSize) => void;
  cardMinWidth?: number;                         // card view: explicit min card width; overrides cardSize
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
interface ToolbarAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (selectedIds: string[]) => void;
  visible?: boolean;
  variant?: string;
  disabled?: boolean;
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

## Card view

Added in 2.9.0. Every DataTable gets a toolbar toggle (table / cards icons) that switches the row layout between the classic `<table>` and a responsive card grid. Both layouts consume the **same TanStack table instance**, so sorting, upstream filtering, row selection (bulk edit / delete), expansion, and row-click behaviour carry over unchanged — no consumer changes are required to enable it.

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
- `renderCard={(row) => ...}` replaces the default card entirely (CardView still supplies the grid slot, click handling, selection `data-state`, and the expansion panel).

### Layout & virtualization

- The column count derives from the measured container width and the effective minimum card width — not Tailwind breakpoints — so the grid and the virtualizer chunking always agree.
- With `virtualized`, rows are chunked into grid rows of `cols` cards and one chunk is virtualized per item (same `measureElement` pattern as the table view, against the shared scroll region). `estimatedCardHeight` (default 220) seeds the estimates.
- Expanded rows render `renderSubComponent` full-width (`col-span-full`) below their card's grid row.

### Card-mode toolbar controls

Shown only while cards are active:

- `CardSelectAllControl` — the card-mode equivalent of the table's header checkbox, labelled with the row count it acts on (`Select all (413)` / `Clear (413)`). Renders nothing when the table has no visible `select` column. The count comes from the pre-grouped row model, i.e. exactly the rows `toggleAllRowsSelected` will select.
- `CardSizeControl` — card density (`compact` 260 px / `comfortable` 320 px / `large` 400 px, via the exported `CARD_SIZE_WIDTHS`). Since the grid is width-driven this is effectively a "how many columns" control. Controlled with `cardSize` + `onCardSizeChange`, or uncontrolled from `defaultCardSize` (default `"comfortable"`). Hidden below `sm` (one column fits regardless) and hidden entirely when the consumer pins an explicit `cardMinWidth`, which overrides the preset.
- `CardSortControl` — field + direction, since there are no column headers to click. Sortable options are all sortable non-control columns; display-only columns are excluded automatically.

The toolbar's button group wraps onto further lines rather than running off the card: it is `shrink-0` from `sm` up (so a narrow toolbar squeezes the scrollable filter bar, not the buttons) and shrinkable below that. Card mode adds two controls to a group that was already at the edge of fitting a phone, which is now also the default layout there.

Within that right-aligned group the **selection-dependent** buttons (bulk edit, `toolbarActions`, delete) come first, ahead of the create dialog and the view / column controls. They appear, disappear, and change width with the selection count; laid out last they would shove every stable control sideways on the very click that changed the selection — including the card-mode select-all. First, they grow leftward into the filter bar's slack instead. For the same reason `CardSelectAllControl` keeps its "Select all (N)" wording when everything is selected rather than swapping in a shorter label.

### Differences from the table layout

- No `<tfoot>` — column `footer` defs are not rendered (every footer in the apps duplicates its header).
- `cellClassName` is not applied (it is `<td>`-specific); `maxCellHeight` applies to body-slot values, with the same `meta.noMaxHeight` opt-out.
- Toggling views resets scroll position (the virtualizers remount).

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
