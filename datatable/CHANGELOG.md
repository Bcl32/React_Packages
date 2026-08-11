# Changelog

## 2.11.0

### Minor Changes

- aa925c8: Grouped sections layout and view-preset support.

  datatable: new "sections" base view — groups packed into a six-track grid sized
  by population, nested grouping via `BoardConfig.subGroups`, per-group collapse
  with `defaultCollapsed` (top level only), per-lane pinned `span` honored while
  expanded; `GroupSections` module (span tiers, tier→class maps,
  `GroupSectionHeader`) shared with the curated section pages; `GroupControl`
  rebuilt as a chip+menu with a "then by" nesting picker; `BoardConfig` gains
  `laneAggregate` roll-ups; DataTable gains controlled `sorting`/`onSortingChange`
  and `onColumnVisibilityChange` (columns become controlled when the callback is
  supplied; per-view re-seed skipped in controlled mode).

  filters: `GroupVisualResolver` now receives the group's rows as a fourth
  argument (additive) so visuals can summarise group contents — e.g. swatch
  clusters; `useEntityGroups` accumulates per-group row references.

## 2.10.3

### Patch Changes

- e806049: feat: controlled row selection and quiet/none toolbars in DataTable
- bb1226a: feat: views are declarations, not a closed enum, in DataTable

## 2.10.2

### Patch Changes

- 1c5b15d: feat: let a board pick its own grouping, and lane by discrete values

## 2.10.1

### Patch Changes

- 4e25144: feat(datatable): add gallery and detail-pane layouts, and derive the view toggle
- c36fa7d: feat(datatable,filters): add a board view that fuses the card grid with entity groups

## 2.10.0

### Minor Changes

- a849ecf: feat(datatable): split the toolbar into a filter zone and a table-operations row

  The toolbar was one wrapping flex row carrying up to thirteen elements — title,
  count, filter search, Filters pill, N active chips, bulk edit, N custom actions,
  delete, create, card select-all, card density, card sort, view toggle, columns —
  six of which appear, disappear, or change width with the row selection. It mixed
  _which rows am I looking at_ with _what do I do with them_, and had reached the
  point where the control order was dictated by layout-shift avoidance rather than
  by meaning.

  It is now two zones, extracted into a new `DataTableToolbar`:

  - **Zone 1 — which rows.** Title, `(filteredCount/totalCount)`, the filter
    search / pill / active chips, and the expandable filter panel. The count heads
    this zone because it is the filters' output. The chip strip still scrolls
    sideways rather than wrapping, so adding a chip can't push the table down.
  - **Zone 2 — what to do with them.** Bulk actions and view controls, on a
    divider directly above the rows they act on.

  The selection-dependent buttons keep their leading position in zone 2 for the
  original reason — measured across a selection change, the sort, view-toggle and
  column controls now hold position to the pixel while three buttons appear beside
  them. With no `filter` prop both zones collapse to a bare title above the
  controls, close to the previous single-row look.

  No consumer changes: `props.filter` was already an opaque
  `{ toolbar, panel, filteredCount, totalCount }` object, so DataTable was only
  ever choosing where to put those two nodes.

  **Sorting is now available in the table layout.** `CardSortControl` becomes
  `SortControl` (the old name stays as a deprecated alias) and renders in both
  layouts. Cards never had headers to click; the table's headers _do_ scroll out
  of view, because `TableHeader`'s `sticky top-0` is defeated by the scroll wrapper
  inside the `Table` primitive — so on a long table sorting was unreachable
  without scrolling back to the top. The control and the header click handler both
  drive TanStack's `sorting` state, so the dropdown, its direction button and the
  header's ↑/↓ arrow stay consistent with no extra state.

  Also extracted the column-label helpers (`columnLabelText`, `columnCardLabel`,
  `CardMeta`, `CONTROL_COLUMN_IDS`) out of `CardView` into `ColumnLabels`, since
  the sort control needs them and is no longer card-specific. `DataTable.tsx`
  drops from 487 to 266 lines.

- a849ecf: feat(datatable): card quick actions, keyboard navigation, scroll hand-off and motion

  Four follow-ups to the card view, all of which apply to every DataTable without
  consumer changes.

  **Quick actions.** A `ToolbarAction` that sets `card` now renders twice from one
  declaration: the toolbar's bulk button over the selection, and a per-card button
  in the card footer, invoked with just that row's id. `cardLabel`,
  `cardVisible(row)` and `cardDisabled(row)` tune the card affordance, and
  `onCardClick(row)` covers handlers that want the row rather than its id. The
  card button deliberately ignores `visible` / `disabled` — those are near-always
  derived from the selection, which says nothing about the single row a card
  stands for — which also makes `{ visible: false, card: "full" }` the way to
  declare an action that only ever made sense per row. `ToolbarAction` is now
  generic in the row type, and `toolbarActions` is resolved once per render
  instead of being called again for the card grid.

  **Keyboard navigation.** The grid is a roving-tabindex `role="grid"`: arrows
  move a focus ring in two dimensions using the measured column count, Home/End
  jump to the ends, Space toggles selection, Enter activates. Keys are handled
  only when the event target is a card root, so a keystroke inside a card's own
  controls still belongs to that control. Focus requests survive across commits,
  since under virtualization the card being moved to usually isn't rendered yet.
  The pre-focus tab stop tracks the first _rendered_ card rather than index 0,
  which would otherwise leave a scrolled grid with no tab stop at all.

  **Scroll position across a view toggle.** Both layouts now expose a
  `ViewScrollHandle`; `DataTable` reads the topmost visible row index off the
  outgoing layout and the incoming one restores it on mount, the card grid
  converting row index to chunk index via its column count. Both layouts stamp
  `data-row-index` per row and `data-row-scope` on the element that owns them, so
  a DataTable nested in an expansion panel can't be mistaken for the outer one's
  rows. This removes the one UX regression the card view had shipped with.

  **Motion** (framer-motion, already a `@bcl32/utils` dependency). A 120 ms
  cross-fade on the view toggle, and card enter/exit plus reflow as the row set
  changes. Both are off under `prefers-reduced-motion` or `animate={false}`, and
  card enter/exit is additionally off while `virtualized`, where cards mount and
  unmount on scroll and the transitions would fire on scrolling rather than on the
  data changing.

  **`renderCard` gains a context argument.** Building the first real bespoke card
  showed the escape hatch forced consumers to re-implement selection and the
  row-actions menu from scratch. `renderCard(row, ctx)` now hands back
  `ctx.quickActions`, `ctx.select` and `ctx.actions` ready-rendered, keeping it a
  layout override rather than a fork of the card feature. A card's media slot also
  collapses instead of reserving padding when the row has no thumbnail.

## 2.9.0

### Minor Changes

- 599ccc3: feat(datatable): card view — every DataTable can render its rows as a responsive card grid

  DataTable's toolbar gains a table↔cards ToggleGroup. Both layouts consume the **same
  TanStack table instance**, so sorting, upstream filtering (`filter` prop /
  useEntityFilters), row selection with bulk edit/delete, expansion
  (`renderSubComponent`), row click, and every existing cell renderer carry over with
  zero consumer changes — all ~43 DataTable sites across the apps get card mode for
  free the moment they pick up this version.

  **New exports**

  - `CardView` / `CardViewProps` — card-grid layout. Cards derive content from the
    _visible_ column cells: control columns (`select`, `actions`, `EditEntry`,
    `expander` — ids in the new `CONTROL_COLUMN_IDS`) are flexRendered into fixed
    positions (checkbox top-left, RowActions top-right, edit + expander in the card
    footer), everything else places itself via `meta: { card: CardMeta }`.
  - `CardMeta` — `{ slot?: "media" | "title" | "badge" | "body" | "footer",
label?: string, hideLabel?: boolean }`. Unannotated columns become labeled body
    fields; with no title slot the first field is promoted so unannotated tables stay
    readable. Label precedence: `meta.card.label` → ModelData attribute title (via
    `fieldLabel` from @bcl32/forms) → rendered header → humanized column id.
  - `CardSortControl` — toolbar field+direction sort control, shown only while cards
    are active (cards have no clickable column headers). Options are the sortable
    non-control columns; display-only columns are excluded automatically.
  - `CardSelectAllControl` — toolbar select-all checkbox labelled with the row count
    it acts on (`Select all (413)` / `Clear (413)`), the card-mode stand-in for the
    table's header checkbox. Renders `null` when the table has no visible `select`
    column. The count comes from the pre-grouped row model — exactly the rows
    `toggleAllRowsSelected` selects.
  - `CardSizeControl`, `CardSize`, `CARD_SIZE_WIDTHS`, `DEFAULT_CARD_SIZE` — card
    density control (compact 260px / comfortable 320px / large 400px). The grid is
    width-driven, so this is a "how many columns do I want" control for free.
  - `TableView` / `TableViewProps` — the classic `<table>` markup, extracted verbatim
    from DataTable (including its row virtualizer) so both layouts are siblings over
    the shared instance.
  - `DataTableView` (`"table" | "cards"`), `columnLabelText`, `columnCardLabel`.

  **New DataTable props**

  `view` / `defaultView` / `onViewChange` (controlled or uncontrolled layout mode),
  `viewStorageKey` (opt-in localStorage persistence — deliberately no derived default
  key, titles repeat across pages), `renderCard` (full custom card escape hatch),
  `estimatedCardHeight` (default 220), `cardSize` / `defaultCardSize` /
  `onCardSizeChange` (density preset, default `"comfortable"`), `cardMinWidth`
  (explicit px override that also hides the density control).

  **View resolution** — `view` (controlled) → the user's toggle choice /
  `viewStorageKey` → `defaultView` → **`"cards"` under the 768px mobile breakpoint**,
  else `"table"`. The mobile default only fires when nothing else decided, so a
  consumer that sets `defaultView` keeps it at every width; `useIsMobile` now reads
  the width synchronously, so there is no table-then-cards flash on first paint.
  Leaving `view` undefined while passing `onViewChange` is the useful shape for a
  settings store: uncontrolled (mobile default still applies) until the user picks.

  **Toolbar** — the button group now wraps instead of running off the card on
  narrow screens (`shrink-0` only from `sm` up, so a squeezed toolbar shrinks the
  scrollable filter bar rather than the buttons). Card mode adds two controls to a
  group that already barely fit a phone, which is now also its default layout.

  The selection-dependent buttons (bulk edit, `toolbarActions`, delete) also move
  to the **front** of that right-aligned group, ahead of Create New and the view /
  column controls. Rendered last they shoved every stable control sideways as they
  appeared and as the count's width changed — including the select-all that
  triggered it. First, they grow leftward into the filter bar's slack and nothing
  else moves. (Consumers relying on the old left-to-right button order will see it
  change; behaviour is identical.)

  **Virtualization** — card mode chunks the rows into grid rows of N cards and
  virtualizes one chunk per item with the existing measureElement pattern against the
  shared scroll region. N derives from the measured container width and
  `cardMinWidth` via ResizeObserver (inline `gridTemplateColumns`, since runtime
  `grid-cols-${n}` classes can't be generated by Tailwind); a width change triggers
  re-measure. Expanded rows render `col-span-full` below their card's grid row.

  **Documented card-mode differences**: no `<tfoot>` (audited: every `footer:` def in
  the apps duplicates its header), `cellClassName` not applied (td-specific),
  `maxCellHeight` applies to body fields with the same `meta.noMaxHeight` opt-out,
  scroll position resets on view toggle.

### Patch Changes

- Updated dependencies [599ccc3]
  - @bcl32/utils@2.8.2

## 2.8.3

### Patch Changes

- e7ca810: Fix the row-actions Edit dialog leaving the whole page unclickable.

  `RowActions` rendered its "Edit Entry" dialog as a child of the row's
  `DropdownMenuContent`, keeping the menu mounted-but-`hidden` underneath while
  the dialog was open, then closing both together. Both are modal Radix layers,
  and each records `document.body`'s `pointer-events` on mount to restore on
  unmount. Unmounting in the same commit, the dialog restored the `none` the menu
  had set, so `body { pointer-events: none }` survived with no layer left to clear
  it — every click on the page was dead until a reload, which reads as the page
  having frozen. Closing the dialog by any route (Update, ✕, Escape) triggered it.

  The dialog now renders as a sibling of the menu rather than inside it, and the
  menu is non-modal, so it never writes that style and the dialog is the only
  layer managing it. Focus still returns to the row's "…" trigger on close.

## 2.8.2

### Patch Changes

- cbb943b: fix(datatable): stop column widths oscillating while scrolling virtualized tables
- Updated dependencies [5972690]
  - @bcl32/utils@2.6.2

## 2.8.1

### Patch Changes

- Updated dependencies [1c61ce6]
  - @bcl32/hooks@4.0.0
  - @bcl32/forms@3.0.1

## 2.8.0

### Minor Changes

- 449d4de: Remove MUI entirely; unify theming on themes.json tokens.

  BREAKING: forms drops ButtonDatePicker (datetime fields use the new
  @bcl32/utils DateTimePicker); charts drops BokehLineChart (with the
  @bokeh/bokehjs dependency). utils adds DateTimePicker; themes adds the
  shared tailwind-preset, themeMeta.isLightTheme(), and warning tokens;
  filters/datatable swap MUI icons for lucide-react.

### Patch Changes

- Updated dependencies [449d4de]
  - @bcl32/forms@3.0.0
  - @bcl32/utils@2.5.0

## 2.7.2

### Patch Changes

- 4e1a98a: chore(deps): make react-router-dom a peer dependency of navigation
- Updated dependencies [59253e3]
- Updated dependencies [f8a2014]
  - @bcl32/forms@2.6.0

## 2.7.1

### Patch Changes

- aee527f: feat(forms,data-utils,datatable): id_list support for bulk-edit and stats

  FormElement now renders id_list as a label-space Combobox over `attr.options`
  ({value, label} pairs), BulkEditModelForm includes id_list fields in its
  list-style merge/replace toggle (defaulting to "Add to existing"), and
  StatsTable skips id_list rather than falling through to default rendering.
  Unlocks bulk-editing reference-array fields like Part.systems.

- Updated dependencies [2c5779f]
- Updated dependencies [dd1cf42]
- Updated dependencies [451ef87]
- Updated dependencies [aee527f]
  - @bcl32/utils@2.4.4
  - @bcl32/forms@2.5.10
  - @bcl32/data-utils@2.1.10

## 2.7.0

### Minor Changes

- 69b5484: feat(datatable): adaptive layout with optional row virtualization

  DataTable now renders as a flex-column container with an internal scroll region. When a consumer wraps it in a flex+height parent (e.g. `<div className="h-[calc(100vh-8rem)] flex flex-col">`), DataTable owns its own scroll so the toolbar and filter panel stay visible while rows scroll beneath them. When the parent is unbounded, the layout gracefully falls back to page-scroll — no consumer changes required.

  Adds two new props:

  - `virtualized?: boolean` — opt in to row virtualization via `@tanstack/react-virtual`. Uses padding-row rendering so standard `<table>` markup, sticky headers, and expandable sub-rows keep working. The virtualizer attaches to DataTable's internal scroll region.
  - `estimatedRowHeight?: number` — tune the virtualizer's row-size estimate (default 56px).

  Existing call sites that don't use these props are unaffected. To get the sticky-toolbar UX on existing list pages, swap the wrapper's `overflow-auto` for `flex flex-col`.

## 2.6.4

### Patch Changes

- 4b98b89: feat(hooks,forms,datatable): structured ApiError system + cascade-delete conflict UX
- Updated dependencies [4b98b89]
- Updated dependencies [45dcfbc]
  - @bcl32/hooks@2.2.8
  - @bcl32/forms@2.5.9
  - @bcl32/utils@2.4.2

## 2.6.3

### Patch Changes

- bcafd31: chore(datatable,filters): move Radix UI deps to peerDependencies

## 2.6.1

### Patch Changes

- c1d7749: chore: bump workspace dependency floors to latest versions

## 2.6.0

### Minor Changes

- d1091d4: Add DataTable filter toolbar integration and compact toolbar style

  DataTable: refactor toolbar to compact flex layout with filter slot, toolbar actions, selection-aware bulk edit/delete buttons, and count display.
  Filters: add DataTableFilterBar component with tabbed filter panel, active filter chips, and primary filter support.

## 2.5.2

### Patch Changes

- bf5f36e: FilterProvider and useEntityFilters hook, percentage-based column widths, and hardened numeric parsing
- Updated dependencies [881c819]
- Updated dependencies [7b18930]
- Updated dependencies [bf5f36e]
- Updated dependencies [19d9b2a]
  - @bcl32/forms@2.5.2
  - @bcl32/data-utils@2.1.7
  - @bcl32/utils@2.3.6

## 2.5.1

### Patch Changes

- 62396de: Fix version bump that was missed by the previous auto-bump system
- Updated dependencies [62396de]
  - @bcl32/forms@2.5.1
  - @bcl32/utils@2.3.5
  - @bcl32/data-utils@2.1.6
  - @bcl32/hooks@2.2.6

## 2.5.0 (2026-03-16)

### Features

- add ColourArrayField and edit success callbacks

## 2.4.0 (2026-03-15)

### Features

- add ColourField component and bulk edit merge mode

## 2.3.1 (2026-03-15)

### Refactors

- change default pageSize from 10 to 9999

## 2.3.0 (2026-03-12)

### Features

- add bulk edit dialog button
