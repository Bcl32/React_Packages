import React from "react";
import type { Cell, Column, Row, Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@bcl32/utils/cn";
import { Card } from "@bcl32/utils/Card";
import { Button } from "@bcl32/utils/Button";
import { Select } from "@bcl32/utils/Select";
import { Checkbox } from "@bcl32/utils/Checkbox";
import { fieldLabel } from "@bcl32/forms/fieldLabel";
import type { ModelData, RowData } from "@bcl32/data-utils";

export type DataTableView = "table" | "cards";

/** Column ids injected by ColumnGenerator that get fixed card positions
 *  instead of rendering as labeled body fields. */
export const CONTROL_COLUMN_IDS: ReadonlySet<string> = new Set([
  "select",
  "expander",
  "EditEntry",
  "actions",
]);

export interface CardMeta {
  /** Card region for this column's cell. Default: "body". */
  slot?: "media" | "title" | "badge" | "body" | "footer";
  /** Field label override (body slot). Also used by the sort dropdown. */
  label?: string;
  /** Body slot only: suppress the label when the value is self-describing. */
  hideLabel?: boolean;
}

function getCardMeta(column: { columnDef: { meta?: unknown } }): CardMeta | undefined {
  return (column.columnDef.meta as { card?: CardMeta } | undefined)?.card;
}

function humanizeId(id: string): string {
  const spaced = id.replace(/_/g, " ");
  return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : id;
}

/**
 * Plain-string label for a column: meta.card.label → the matching ModelData
 * attribute's title (via fieldLabel) → humanized column id. Used by the sort
 * dropdown, where only text works.
 */
export function columnLabelText<TData extends RowData>(
  column: Column<TData, unknown>,
  ModelData: ModelData
): string {
  const meta = getCardMeta(column);
  if (meta?.label) return meta.label;
  const attr = ModelData.model_attributes?.find((a) => a.name === column.id);
  if (attr) return fieldLabel(attr);
  return humanizeId(column.id);
}

/**
 * ReactNode label for a card body field. Same precedence as columnLabelText,
 * but when neither meta.card.label nor a ModelData attribute exists, prefers
 * rendering the column's header (every header in the apps is a () => <span>
 * that ignores its context) before falling back to the humanized id.
 */
export function columnCardLabel<TData extends RowData>(
  column: Column<TData, unknown>,
  ModelData: ModelData
): React.ReactNode {
  const meta = getCardMeta(column);
  if (meta?.label) return meta.label;
  const attr = ModelData.model_attributes?.find((a) => a.name === column.id);
  if (attr) return fieldLabel(attr);
  const header = column.columnDef.header;
  if (typeof header === "string") return header;
  if (typeof header === "function") {
    return flexRender(header, { column } as never);
  }
  return humanizeId(column.id);
}

/** Toolbar sort control shown while the card view is active — cards have no
 *  column headers to click, so sorting needs an explicit field + direction. */
export function CardSortControl<TData extends RowData>(props: {
  table: TanstackTable<TData>;
  ModelData: ModelData;
}): JSX.Element {
  const sortableColumns = props.table
    .getAllColumns()
    .filter((c) => c.getCanSort() && !CONTROL_COLUMN_IDS.has(c.id));
  const current = props.table.getState().sorting[0];
  const desc = current?.desc ?? true;

  return (
    <div className="flex items-center gap-1">
      <Select
        aria-label="Sort by"
        className="h-8 w-[140px] px-2 py-0 text-xs"
        value={current?.id ?? ""}
        onChange={(e) => {
          if (e.target.value) props.table.setSorting([{ id: e.target.value, desc }]);
        }}
      >
        {current?.id && !sortableColumns.some((c) => c.id === current.id) && (
          <option value={current.id}>{humanizeId(current.id)}</option>
        )}
        {sortableColumns.map((c) => (
          <option key={c.id} value={c.id}>
            {columnLabelText(c, props.ModelData)}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        size="icon"
        title={desc ? "Descending" : "Ascending"}
        onClick={() => {
          if (current?.id) props.table.setSorting([{ id: current.id, desc: !desc }]);
        }}
      >
        {desc ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
      </Button>
    </div>
  );
}

/** Toolbar select-all shown while the card view is active. Cards have no
 *  header row, so without this the header checkbox — the only select-all in the
 *  table layout — has no card-mode equivalent and a filtered set can't be
 *  bulk-selected. */
export function CardSelectAllControl<TData extends RowData>(props: {
  table: TanstackTable<TData>;
}): JSX.Element | null {
  // Selection is opt-in per table: no visible select column, no select-all.
  const selectColumn = props.table.getColumn("select");
  if (!selectColumn?.getIsVisible()) return null;

  // Match what toggleAllRowsSelected actually acts on (pre-grouping, and so
  // pre-pagination) — the count has to name the rows the click will select.
  const count = props.table.getPreGroupedRowModel().rows.length;
  const allSelected = props.table.getIsAllRowsSelected();

  return (
    <label
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-accent px-2 text-xs hover:bg-accent/90"
      title={allSelected ? "Clear selection" : "Select every row"}
    >
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) => props.table.toggleAllRowsSelected(!!checked)}
        className="h-4 w-4"
      />
      {/* The wording stays put whatever the state — the checkbox already says
          which way it is, and swapping in a shorter "Clear" would resize the
          control and shuffle its neighbours on the click that toggled it. */}
      <span>Select all ({count})</span>
    </label>
  );
}

/** Card size presets, in px of minimum card width. The grid's column count is
 *  purely width-driven, so picking a size *is* picking how many columns fit. */
export const CARD_SIZE_WIDTHS = {
  compact: 260,
  comfortable: 320,
  large: 400,
} as const;

export type CardSize = keyof typeof CARD_SIZE_WIDTHS;

export const DEFAULT_CARD_SIZE: CardSize = "comfortable";

const CARD_SIZE_LABELS: Record<CardSize, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
  large: "Large",
};

/** Toolbar card-density control — feeds `cardMinWidth`, which the grid turns
 *  into a column count. */
export function CardSizeControl(props: {
  value: CardSize;
  onChange: (size: CardSize) => void;
}): JSX.Element {
  return (
    <Select
      aria-label="Card size"
      title="Card size"
      className="h-8 w-[124px] shrink-0 px-2 py-0 text-xs"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as CardSize)}
    >
      {(Object.keys(CARD_SIZE_WIDTHS) as CardSize[]).map((size) => (
        <option key={size} value={size}>
          {CARD_SIZE_LABELS[size]}
        </option>
      ))}
    </Select>
  );
}

export interface CardViewProps<TData extends RowData> {
  table: TanstackTable<TData>;
  ModelData: ModelData;
  scrollRef: React.RefObject<HTMLDivElement>;
  virtualized?: boolean;
  estimatedCardHeight?: number;
  cardMinWidth?: number;
  maxCellHeight?: number;
  rowClickFunction?: (data: TData) => void;
  expandOnRowClick?: boolean;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  /** Escape hatch: replaces the default card entirely. CardView still supplies
   *  the grid slot, click handling, and the expansion panel. */
  renderCard?: (row: Row<TData>) => React.ReactNode;
}

interface PartitionedCells<TData extends RowData> {
  select?: Cell<TData, unknown>;
  actions?: Cell<TData, unknown>;
  edit?: Cell<TData, unknown>;
  expander?: Cell<TData, unknown>;
  media: Cell<TData, unknown>[];
  title: Cell<TData, unknown>[];
  badge: Cell<TData, unknown>[];
  body: Cell<TData, unknown>[];
  footer: Cell<TData, unknown>[];
}

function partitionCells<TData extends RowData>(row: Row<TData>): PartitionedCells<TData> {
  const parts: PartitionedCells<TData> = {
    media: [],
    title: [],
    badge: [],
    body: [],
    footer: [],
  };
  for (const cell of row.getVisibleCells()) {
    const id = cell.column.id;
    if (id === "select") parts.select = cell;
    else if (id === "actions") parts.actions = cell;
    else if (id === "EditEntry") parts.edit = cell;
    else if (id === "expander") parts.expander = cell;
    else {
      const slot = getCardMeta(cell.column)?.slot ?? "body";
      parts[slot].push(cell);
    }
  }
  // Unannotated tables still need a readable card: promote the first field to
  // the title position when nothing claims it.
  if (parts.title.length === 0 && parts.body.length > 0) {
    parts.title.push(parts.body.shift() as Cell<TData, unknown>);
  }
  return parts;
}

function renderCell<TData extends RowData>(cell: Cell<TData, unknown>): React.ReactNode {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
}

function RowCard<TData extends RowData>(props: {
  row: Row<TData>;
  view: CardViewProps<TData>;
}): JSX.Element {
  const { row, view } = props;
  const clickable = Boolean(view.rowClickFunction || view.expandOnRowClick);
  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, input, button, label")) return;
    if (view.expandOnRowClick) row.toggleExpanded();
    view.rowClickFunction?.(row.original);
  };

  if (view.renderCard) {
    return (
      <div
        data-state={row.getIsSelected() ? "selected" : undefined}
        className={clickable ? "cursor-pointer" : undefined}
        onClick={onClick}
      >
        {view.renderCard(row)}
      </div>
    );
  }

  const cells = partitionCells(row);

  return (
    <Card
      data-state={row.getIsSelected() ? "selected" : undefined}
      className={cn(
        "relative flex h-full flex-col",
        // ring-inset, not an outside ring: the grid sits flush against the
        // scroll region's edges, so an outside ring is clipped away on the
        // first row (and either side column) and the selection reads as a
        // card with its top cut off.
        "data-[state=selected]:bg-muted data-[state=selected]:ring-2 data-[state=selected]:ring-inset data-[state=selected]:ring-primary",
        clickable && "cursor-pointer hover:bg-accent/30 transition-colors"
      )}
      onClick={onClick}
    >
      {cells.media.length > 0 && (
        // Media renderers are sized for table cells (fixed column width, and
        // ThumbnailCell-style negative-margin bleed) — neutralize the bleed and
        // pin images to a uniform square so media can't swallow the card.
        <div className="flex justify-center gap-2 px-3 pt-3 [&>*]:!m-0 [&_img]:h-32 [&_img]:w-32 [&_img]:rounded [&_img]:object-cover">
          {cells.media.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
        </div>
      )}

      <div className="flex flex-col space-y-1 p-3 pb-1">
        <div className="flex items-start gap-2">
          {/* The select cell carries a -m-4/p-4 hit-area bleed tuned for table
              cells; flattened here so the checkbox occupies real flex width. */}
          {cells.select && (
            <div className="shrink-0 [&_label]:!m-0 [&_label]:!p-0">
              {renderCell(cells.select)}
            </div>
          )}
          <div className="min-w-0 flex-1 font-medium">
            {cells.title.map((cell) => (
              <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
            ))}
          </div>
          {cells.actions && (
            <div className="-mr-1 -mt-1 shrink-0">{renderCell(cells.actions)}</div>
          )}
        </div>
        {cells.badge.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {cells.badge.map((cell) => (
              <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
            ))}
          </div>
        )}
      </div>

      {cells.body.length > 0 && (
        <div className="flex-1 space-y-1.5 p-3 pt-1 text-sm">
          {cells.body.map((cell) => {
            const meta = getCardMeta(cell.column);
            const noMaxHeight = (cell.column.columnDef.meta as Record<string, unknown> | undefined)
              ?.noMaxHeight;
            const value =
              view.maxCellHeight && !noMaxHeight ? (
                <div style={{ maxHeight: view.maxCellHeight, overflowY: "auto" }}>
                  {renderCell(cell)}
                </div>
              ) : (
                renderCell(cell)
              );
            return (
              <div key={cell.id} className="flex items-baseline gap-2">
                {!meta?.hideLabel && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {columnCardLabel(cell.column, view.ModelData)}
                  </span>
                )}
                <div className="min-w-0 flex-1">{value}</div>
              </div>
            );
          })}
        </div>
      )}

      {(cells.footer.length > 0 || cells.edit || cells.expander) && (
        <div className="flex flex-wrap items-center gap-2 p-3 pt-0">
          {cells.footer.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
          {(cells.edit || cells.expander) && (
            <div className="ml-auto flex items-center gap-1">
              {cells.edit && renderCell(cells.edit)}
              {cells.expander && renderCell(cells.expander)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const GRID_GAP_PX = 12; // Tailwind gap-3, shared by the column-count math below.

function Chunk<TData extends RowData>(props: {
  rows: Row<TData>[];
  cols: number;
  view: CardViewProps<TData>;
}): JSX.Element {
  return (
    <div
      className="grid gap-3 pb-3"
      style={{ gridTemplateColumns: `repeat(${props.cols}, minmax(0, 1fr))` }}
    >
      {props.rows.map((row) => (
        <RowCard key={row.id} row={row} view={props.view} />
      ))}
      {/* Expansion panels come after the cards so CSS grid auto-placement
          can't split the card row; col-span-full puts each below it. */}
      {props.rows
        .filter((row) => row.getIsExpanded())
        .map((row) => (
          <div key={`${row.id}-expanded`} className="col-span-full">
            {props.view.renderSubComponent({ row })}
          </div>
        ))}
    </div>
  );
}

/**
 * Card-grid rendering of a DataTable's rows over the same TanStack table
 * instance as TableView — sorting, selection, expansion, and filtering state
 * all carry over. Cards derive their content from the visible column cells:
 * control columns get fixed positions and the rest place themselves via
 * `meta.card` slot hints (default: labeled body fields).
 *
 * Virtualization chunks the sorted rows into grid rows of `cols` cards and
 * virtualizes one chunk per item, reusing the measureElement pattern from
 * TableView against the same external scroll region.
 */
export function CardView<TData extends RowData>(props: CardViewProps<TData>): JSX.Element {
  const rows = props.table.getRowModel().rows;
  const cardMinWidth = props.cardMinWidth ?? CARD_SIZE_WIDTHS[DEFAULT_CARD_SIZE];

  // Column count derives from measured width, not Tailwind breakpoints —
  // the grid must agree exactly with the chunking math, and runtime
  // `grid-cols-${n}` classes would never be generated anyway.
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [cols, setCols] = React.useState(1);
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = (width: number) =>
      Math.max(1, Math.floor((width + GRID_GAP_PX) / (cardMinWidth + GRID_GAP_PX)));
    setCols(compute(el.clientWidth));
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setCols(compute(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardMinWidth]);

  const chunks = React.useMemo(() => {
    const out: Row<TData>[][] = [];
    for (let i = 0; i < rows.length; i += cols) {
      out.push(rows.slice(i, i + cols));
    }
    return out;
  }, [rows, cols]);

  const virtualizer = useVirtualizer({
    count: props.virtualized ? chunks.length : 0,
    getScrollElement: () => props.scrollRef.current,
    estimateSize: () => props.estimatedCardHeight ?? 220,
    overscan: 4,
    measureElement: (el) => el.getBoundingClientRect().height,
  });
  // A width change reflows every chunk; cached measurements are stale.
  React.useEffect(() => {
    if (props.virtualized) virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols]);

  return (
    <div ref={containerRef}>
      {rows.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-center">No results.</div>
      ) : props.virtualized ? (
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => (
            <div
              key={vi.key}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <Chunk rows={chunks[vi.index]} cols={cols} view={props} />
            </div>
          ))}
        </div>
      ) : (
        chunks.map((chunk, i) => (
          <Chunk key={chunk[0]?.id ?? i} rows={chunk} cols={cols} view={props} />
        ))
      )}
    </div>
  );
}
