import React from "react";
import type { Cell, Row } from "@tanstack/react-table";
import { motion } from "framer-motion";

import { cn } from "@bcl32/utils/cn";
import { Card } from "@bcl32/utils/Card";
import type { ModelData, RowData } from "@bcl32/data-utils";

import { columnCardLabel, getCardMeta } from "./ColumnLabels";
import type { CardSlotOverrides } from "./ColumnLabels";
import { partitionCells, renderCell } from "./CardCells";
import { applicableCardActions, CardQuickActions } from "./CardActions";
import { GalleryTile } from "./GalleryCard";
import { ROW_INDEX_ATTR } from "./ViewScroll";
import type { ToolbarAction } from "./ToolbarAction";

/**
 * One row, drawn as a card.
 *
 * Extracted from CardView so the board layout draws the *same* card rather than
 * a lookalike: same `meta.card` slots, same `renderCard` escape hatch, same
 * quick actions, same selection ring. A second implementation would drift from
 * this one the first time a slot was added.
 *
 * The layout owns everything outside the card — placement, virtualization,
 * which coordinate `index` counts in — and passes the rest through here.
 *
 * The cell partitioner and the quick-action renderer live one level down again
 * (`CardCells`, `CardActions`) because the gallery tile and the detail pane's
 * list items need them without needing a card at all.
 */

/** Board-local card coordinate, `"<laneIndex>:<positionInLane>"`. See
 *  `RowCard`'s `posAttr`. */
export const BOARD_POS_ATTR = "data-board-pos";

/** Which card a layout wants in its slot. `cards` is the full card the board
 *  and the grid both draw; `gallery` is the media-only tile. */
export type CardViewVariant = "cards" | "gallery";

// Re-exported here because the card *contract* is this module's surface: every
// layout that draws a card takes its options from `CardRenderOptions` beside
// it, and a consumer typing a `cardSlots` map should not have to know the slot
// vocabulary lives one module further down in ColumnLabels.
export type { CardSlot, CardSlotOverrides } from "./ColumnLabels";

/**
 * What a card needs to know that isn't the row itself. Both CardView and
 * BoardView satisfy this, which is what lets them share `RowCard`.
 */
export interface CardRenderOptions<TData extends RowData> {
  ModelData: ModelData;
  maxCellHeight?: number;
  rowClickFunction?: (data: TData) => void;
  expandOnRowClick?: boolean;
  /** Which card to draw. Default "cards". */
  variant?: CardViewVariant;
  /**
   * Escape hatch: replaces the default card entirely. The layout still supplies
   * the slot, click handling, keyboard navigation, and the expansion panel.
   *
   * A bespoke card has replaced the footer the quick actions would have gone
   * in, so they are handed over ready-rendered in `ctx.quickActions` — place
   * them wherever the card's design wants them, or drop them.
   *
   * Ignored under `variant="gallery"`: the gallery exists to strip a row back
   * to its picture, and honouring a bespoke card there would just render the
   * card layout at tile widths.
   */
  renderCard?: (row: Row<TData>, ctx: RenderCardContext) => React.ReactNode;
  /** Toolbar actions that opted in with `card`, rendered per card in the
   *  default card's footer. */
  cardActions?: ToolbarAction<TData>[];
  /** Per-view slot remapping, applied before the card is partitioned. Reaches
   *  the bespoke card too, through `ctx.slots`. */
  cardSlots?: CardSlotOverrides;
}

/**
 * What a bespoke card gets besides the row. Everything here is a control the
 * default card would otherwise have placed for it: without them a `renderCard`
 * consumer has to re-implement selection and the row-actions menu from scratch,
 * which is how an escape hatch turns into a fork.
 */
export interface RenderCardContext {
  /** The row's quick actions, already rendered. Empty when no toolbar action
   *  opted in with `card`. */
  quickActions: React.ReactNode;
  /** The select checkbox cell, or null when the table has no select column. */
  select: React.ReactNode;
  /** The row-actions (⋯) menu cell, or null when the table has none. */
  actions: React.ReactNode;
  /**
   * The row's content cells, already rendered and bucketed by card slot — the
   * same partition the default card draws, in column order, after any per-view
   * `cardSlots` remapping.
   *
   * The point is that a bespoke card no longer has to choose between the two
   * ways of composing a card. It keeps full control of the *geometry* — which
   * is the only reason to write one, since slots are a fixed vertical stack and
   * cannot express a thumbnail beside a column of fields or a full-bleed bar —
   * while the *content* stays declared once on the columns, formatted by the
   * same cell renderers the table uses. Reading `row.original` directly still
   * works and is still right for anything the columns don't carry.
   *
   * Each array is empty rather than absent when nothing claims that slot, so a
   * card can `.length` a region without guarding.
   */
  slots: RenderCardSlots;
}

/** The rendered content of each card region. See `RenderCardContext.slots`. */
export interface RenderCardSlots {
  media: React.ReactNode[];
  title: React.ReactNode[];
  badge: React.ReactNode[];
  body: React.ReactNode[];
  footer: React.ReactNode[];
}

/** The stock card: control columns in fixed positions, everything else placed
 *  by its `meta.card` slot hint. */
function DefaultCard<TData extends RowData>(props: {
  row: Row<TData>;
  view: CardRenderOptions<TData>;
  clickable: boolean;
}): JSX.Element {
  const { row, view } = props;
  const cells = partitionCells(row, view.cardSlots);
  const quickActions = applicableCardActions(row, view.cardActions);

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
        props.clickable && "cursor-pointer hover:bg-accent/30 transition-colors"
      )}
    >
      {cells.media.length > 0 && (
        // Media renderers are sized for table cells (fixed column width, and
        // ThumbnailCell-style negative-margin bleed) — neutralize the bleed and
        // pin images to a uniform square so media can't swallow the card.
        // empty:hidden so a row with no thumbnail doesn't reserve the padding
        // for one.
        <div className="flex justify-center gap-2 px-3 pt-3 empty:hidden [&>*]:!m-0 [&_img]:h-32 [&_img]:w-32 [&_img]:rounded [&_img]:object-cover">
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

      {(cells.footer.length > 0 ||
        quickActions.length > 0 ||
        cells.edit ||
        cells.expander) && (
        <div className="flex flex-wrap items-center gap-2 p-3 pt-0">
          {cells.footer.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
          <CardQuickActions row={row} actions={quickActions} />
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

export function buildRenderCardContext<TData extends RowData>(
  row: Row<TData>,
  view: CardRenderOptions<TData>
): RenderCardContext {
  const cells = partitionCells(row, view.cardSlots);
  const slotNodes = (region: Cell<TData, unknown>[]): React.ReactNode[] =>
    region.map((cell) => <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>);
  return {
    quickActions: (
      <CardQuickActions row={row} actions={applicableCardActions(row, view.cardActions)} />
    ),
    slots: {
      media: slotNodes(cells.media),
      title: slotNodes(cells.title),
      badge: slotNodes(cells.badge),
      body: slotNodes(cells.body),
      footer: slotNodes(cells.footer),
    },
    // Flattened the same way the default card flattens them: both renderers
    // carry a hit-area bleed sized for a table cell.
    select: cells.select ? (
      <span className="[&_label]:!m-0 [&_label]:!p-0">{renderCell(cells.select)}</span>
    ) : null,
    actions: cells.actions ? renderCell(cells.actions) : null,
  };
}

/** Enter/exit + reflow motion. Deliberately short: this fires on every filter
 *  keystroke, so anything slower reads as lag rather than polish. */
export const CARD_MOTION = {
  layout: true,
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.94 },
  transition: { duration: 0.18, ease: "easeOut" },
} as const;

export function RowCard<TData extends RowData>(props: {
  row: Row<TData>;
  /** Index into the sorted row model — the coordinate the scroll hand-off
   *  restores to, and what `ROW_INDEX_ATTR` carries. Every layout stamps the
   *  same coordinate so a view toggle lands on the same row. */
  index: number;
  tabIndex: number;
  animated: boolean;
  onFocus: () => void;
  view: CardRenderOptions<TData>;
  /**
   * Layout-local coordinate, when the model index isn't unique on screen. The
   * board can show one row in several lanes (a part in two systems), so
   * `ROW_INDEX_ATTR` alone no longer identifies a card and keyboard focus needs
   * its own key. Omitted by the grid, where model index is already unique.
   */
  posAttr?: string;
}): JSX.Element {
  const { row, view } = props;
  const clickable = Boolean(view.rowClickFunction || view.expandOnRowClick);
  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, input, button, label")) return;
    if (view.expandOnRowClick) row.toggleExpanded();
    view.rowClickFunction?.(row.original);
  };

  const inner =
    view.variant === "gallery" ? (
      <GalleryTile row={row} clickable={clickable} />
    ) : view.renderCard ? (
      view.renderCard(row, buildRenderCardContext(row, view))
    ) : (
      <DefaultCard row={row} view={view} clickable={clickable} />
    );

  const common = {
    role: "gridcell",
    tabIndex: props.tabIndex,
    onFocus: props.onFocus,
    onClick,
    "data-state": row.getIsSelected() ? "selected" : undefined,
    [ROW_INDEX_ATTR]: props.index,
    ...(props.posAttr ? { [BOARD_POS_ATTR]: props.posAttr } : {}),
    className: cn(
      "h-full rounded-lg",
      // The keyboard cursor is an `outline` drawn *inside* the card, and it has
      // to be all three of those things:
      //   - outline, not ring: a ring is a box-shadow, which paints under the
      //     element's children — the opaque <Card> would cover it. Outlines
      //     paint above descendants. It is also a separate property from the
      //     selection ring, so a focused *and* selected card shows both.
      //   - inside (negative offset), not outside: the grid sits flush against
      //     the scroll region, so anything drawn outside the card is clipped
      //     away on the first row and either edge column — the same trap the
      //     selection ring documents just below.
      //   - dashed: --ring and --primary are the same colour in these themes,
      //     so shape, not hue, is what separates "cursor is here" from
      //     "this row is selected".
      "outline-none focus-visible:outline-dashed focus-visible:outline-2",
      "focus-visible:outline-primary focus-visible:[outline-offset:-3px]",
      clickable && "cursor-pointer"
    ),
  };

  if (props.animated) {
    return (
      <motion.div {...common} {...CARD_MOTION}>
        {inner}
      </motion.div>
    );
  }
  return <div {...common}>{inner}</div>;
}
