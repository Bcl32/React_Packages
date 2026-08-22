# Changelog

## 2.17.0

### Minor Changes

- 70eb2fc: `CompletionCell` — the tick-a-row-off checkbox, with the optimism built in

  The one affordance the package didn't ship. Any table of things that get _done_
  — a checklist, a punch list, a set of steps — wants a checkbox on the row, and
  until now every consumer hand-rolled it along with the three details that are
  easy to get wrong:

  - **Optimism.** A checkbox that waits for its round trip reads as a click that
    missed, so the user clicks again and un-does it. The cell shows the value it
    is writing while the write is in flight, and hands the row back the moment it
    settles — including when it fails. Holding the pending value until `checked`
    catches up, which is the obvious rule, sticks forever on a failed write whose
    consumer reverts the row: that value never equals the pending one.
  - **Not starting a drag.** In any card layout with whole-card drag, the
    pointer-down that ticks the box also arms the drag sensor, so the tick becomes
    a four-pixel drag and never fires. `data-no-drag` — the opt-out those sensors
    look for — is applied by the cell rather than remembered by each caller.
  - **Not triggering the row.** With `expandOnRowClick`, ticking would also expand.

  Ships as `CompletionCell` (the interaction) and `completionColumn()` (the same
  thing as a `ColumnDef`, for tables that draw columns rather than cards), from
  `@bcl32/datatable` and `@bcl32/datatable/CompletionCell`.

  **What it deliberately does not own: the write.** `onToggle` is the seam, and it
  stays the seam. A consumer whose rows live in the react-query cache and one that
  keeps a local mirror — because it also drag-reorders, and a drag has to move rows
  before its own round trip — need different write paths. A cell that reached into
  the query cache would be correct for the first and actively wrong for the second:
  it would heal the cache while the mirror the page actually renders stayed stale.
  That is exactly Home Helper's Checklist, which is where this cell was built and
  lived app-local until the interaction settled.

  Purely additive: no existing export changes.

## 2.16.0

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

### Patch Changes

- Updated dependencies [9e81236]
  - @bcl32/data-utils@2.3.0
  - @bcl32/forms@3.2.0

## 2.15.0

### Minor Changes

- a0fab15: Sections view: `sectionsPacking` — 2D dense packing, so a page of
  variable-height sections stops stranding vertical gaps.

  CSS grid's dense auto-placement only back-fills _horizontally_, so a short
  section beside a tall one left a hole nothing could reach. Sections now measure
  their own height and take a `grid-row: span N` in coarse 48px modules, which
  gives the flow something to pack against on both axes. 48 is load-bearing: a
  collapsed header measures 46px, and a 44px module would ceil it to 2 and leave
  a dead sliver under every collapsed section.

  Tile sizes become **targets rather than auto-fill minimums**. Each section
  computes an integer column count from its measured content width and admits one
  extra column when the resulting tile shrink is within 12% — the measured gap
  between "still looks like the size you picked" and "visibly smaller" (largest
  accepted 9.9%, smallest rejected 14.8%). Rows then fill exactly instead of
  leaving a chrome-induced empty track. Width is read from
  `getBoundingClientRect()`, not `clientWidth`, because the rounding in the
  latter flips column counts at the boundary.

  Sub-sections are content-sized: a nested grid mirrors its parent's track count,
  pinned children map proportionally through `spanTierTracks`, and an auto child
  takes `clamp(ceil(sqrt(n)), 1, cap)` tracks — a narrow bias, since trading a
  row for width reads better in a gallery than one long line.

  `sectionsPacking` picks the strategy, on `DataTable` or per view def like the
  other section props:

  | mode         | what it trades                                              |
  | ------------ | ----------------------------------------------------------- |
  | `rows`       | no packing at all — the pre-2.15 layout, exactly            |
  | `packed`     | fills gaps, sub-sections stay equal-width                   |
  | `fit-wide`   | content-sized sub-sections, single-row bias                 |
  | `fit-narrow` | content-sized sub-sections, stacks vertically (**default**) |
  | `uniform`    | every tile the same size (tolerance 0), pins still win      |
  | `tight`      | 8px row module — masonry-close                              |

  `fit-narrow` is the default because it is what the measurements favoured; a
  consumer that wants the old behaviour byte-for-byte passes `rows`.

  - The height observer stores **raw pixels** and `sectionRowSpan(h, modulePx)`
    derives the span at render. Quantizing at measurement time would freeze the
    geometry on the old module across a mode switch, because a ResizeObserver
    does not re-fire when nothing resized.
  - Track counts ride CSS custom properties (`--sec-tracks`, `--sec-col-span`)
    consumed through `md:[…:var(…)]` classes, not inline styles — an inline style
    would beat the below-`md` single-column media query and break small screens.
  - `SectionWrapperProps` gains `style`. A consumer's `renderSectionWrapper` must
    merge **both** `className` and `style` onto its element or sections will not
    pack; the wrapper is where the span lives, since the package's own
    `<section>` is one level inside the grid item.
  - Measuring every section on every render deadlocks against framer-motion's
    commit-phase reflows (Maximum update depth). The layout effect measures only
    span-less sections; the ResizeObserver owns every update after that, and
    fires on `observe()` so nothing is missed.

## 2.14.0

### Minor Changes

- 98970f9: Sections view: `sectionTone` — give each group its own backdrop from the
  theme's card palette (`surface-1 … surface-8`, new in @bcl32/themes).

  Defaults to `"none"`, which is exactly today's neutral `card`/`background`
  frame, so no existing consumer changes until it opts in. `"index"` colours by
  top-level position with sub-sections inheriting their parent's hue — a group is
  a top-level section _and everything under it_, not one colour per rendered box.
  A function form maps the section's own value instead, for when "Kitchen" should
  be the same hue on every page and reordering must not reshuffle the colours.

  Settable on `DataTable` or per view def, like the other section props.

  - `SectionWrapperInfo` gains `rootIndex` — the position of a section's
    top-level ancestor.
  - `GroupSections` exports `themeSurfaceCount()`, `sectionToneStyle()`,
    `resolveSectionTone()` and the `SectionTone` type.

  **The palette size is never written down here.** `themeSurfaceCount()` reads
  the `--surface-N` custom properties off the running document and counts what is
  actually there; backdrops are applied as `hsl(var(--surface-N))` inline styles
  rather than `bg-surface-N` classes. So growing the palette in @bcl32/themes
  needs no change in this package and no version bump — and an app on an older
  @bcl32/themes measures zero and degrades to the neutral frame instead of
  painting with a token that doesn't exist.

  The probe is one `getComputedStyle` per sections render (not per section),
  memoized per `data-theme`, and skipped entirely when `sectionTone` is `"none"`.
  The memo is keyed rather than global because nothing guarantees two themes
  define the same number, and a stale count resolves to a `var()` with no
  definition — measured as transparent, i.e. a section that loses its backdrop on
  a theme switch.

  - The "no value" bucket is never tinted, whatever the resolver returns: it
    already signals itself with muted text and a dashed frame, and colouring it
    would make absence look like another group.

## 2.13.0

### Minor Changes

- 0dc11fe: The drag seam and the packed-photo prerequisites: `renderCardWrapper` hands a consumer the card's outer wrapper in every card-shaped view (cards, gallery, board, sections) so dnd-kit can own the positioned element; a view def's new `variant` pins the gallery tile under any base (`{ base: "sections", variant: "gallery" }` packs photo tiles into group sections, with gallery size presets); SectionsView's grids flow dense so later sections back-fill holes instead of stranding tracks.
- 9a6e699: Per-section layout control for the sections view.

  `BoardLane.cardSize` (and `TreeBoardNode.cardSize`, validated on the way through like `span`) pins one section's tile size, resolved against the active variant's preset table — so "large" is a large gallery tile in a photo view and a large card in a record view. It feeds the auto span as well as the card grid, because how wide a section gets is a question about how many of _its_ tiles fit; resolving them separately is how a section ends up sized for a tile it is not drawing.

  `sectionHeaderLeading` — the sections view's leading header slot, rendering before the collapse chevron. Its companion `sectionHeaderActions` is trailing furniture (a ⋯ menu, rename/delete), which is the wrong place for a reorder grip: a handle for the whole section belongs at the head of the row it drags, and in the trailing cluster it shifts sideways every time the count or aggregate changes width. Matches where the hand-curated section cards have always put theirs.

### Patch Changes

- ad544fc: feat(datatable): tree boards, section nesting rules, and the section wrapper seam
- Updated dependencies [c5b1d68]
  - @bcl32/forms@3.1.0

## 2.12.0

### Minor Changes

- e66a4d7: Editing from every layout, not just the table.

  New `RowEditButton` — the edit dialog `ColumnGenerator`'s `EditEntry` cell used
  to own privately, now a component in its own right (`EditCell` is a caller of
  it, so there is one implementation). `rowEditNode(row, view)` resolves a row's
  edit control: the table's own `EditEntry` cell when it has one, otherwise a
  synthesised `RowEditButton`, otherwise null — so a table that already draws a
  pencil column never grows a second one.

  `RenderCardContext` gains `edit`, so a bespoke `renderCard` can place the edit
  button the way it already places `select` and `quickActions`. The stock layouts
  place it themselves: the default card's footer, the gallery tile's hover
  overlay beside the ⋯ menu, and the detail pane's header. The board and sections
  layouts draw the same `RowCard` and inherit it.

  DataTable gains `rowEditEnabled` (defaults to on wherever
  `ModelData.update_api_url` is set) and `onEditSuccess`. The four card-shaped
  layouts and `DetailPaneView` take the same three props
  (`rowEditEnabled` / `query_invalidation` / `onEditSuccess`).

  `toolbarStyle="quiet"` now draws bulk Edit and bulk Delete. Both toolbars share
  one `BulkEditButton` / `BulkDeleteButton` pair rather than the standard
  toolbar's inline copies. The quiet bar is what every layout below full width
  draws, so leaving them out meant ticking checkboxes anywhere but the Table
  shape gave you nothing to do with the selection.

  `GalleryTile` takes an optional pre-partitioned `cells` (and the new `edit`
  node) so the densest layout doesn't walk each row's cells twice per tile.

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
