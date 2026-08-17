import React from "react";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { AnimatePresence, useReducedMotion } from "framer-motion";

import { cn } from "@bcl32/utils/cn";
import { Card, CardHeader, CardTitle } from "@bcl32/utils/Card";
import type { RowData } from "@bcl32/data-utils";

import { RowCard, BOARD_POS_ATTR } from "./RowCard";
import type { CardRenderOptions } from "./RowCard";
import {
  ROW_SCOPE_ATTR,
  ensureVisibleWithin,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import { CARD_SIZE_WIDTHS, DEFAULT_CARD_SIZE } from "./CardView";
import type { CardSize } from "./CardView";

/** One board column. Deliberately the same shape as the filters package's
 *  `EntityGroup` minus its count, so a group tile and a lane header are the
 *  same thing said twice — the board computes its own counts (see below). */
export interface BoardLane {
  value: string;
  label: string;
  visual?: React.ReactNode;
  /** The "no value" bucket. Rendered dashed and last, and hidden when empty. */
  isNone?: boolean;
  /**
   * Sections layout: a pinned width tier for this group, overriding the
   * count-computed span — how a curated tree's hand-chosen section widths
   * survive into the grouped rendering. Applies only while the section is
   * expanded; a collapsed tile keeps the uniform small rung, matching the
   * curated pages' own rule that collapse overrides pins. The board ignores
   * it (lanes are equal-width by design).
   */
  span?: "xs" | "s" | "m" | "l";
  /**
   * Sections layout: a pinned tile size for this group alone, overriding the
   * table-wide `cardMinWidth`. Size names resolve against the active variant's
   * preset table, so "large" means a large *gallery* tile in a photo view and
   * a large *card* in a record view.
   *
   * Per-section rather than per-table because a curated tree's sections hold
   * different things: the one photo of the front of a house wants a big tile,
   * and twenty bathroom shots want small ones. It also feeds the auto span —
   * how wide a section gets is a question about how many of ITS tiles fit, so
   * pinning the size without it would make the width answer for a tile the
   * section is no longer drawing. The board ignores it (lanes are equal-width
   * by design).
   */
  cardSize?: CardSize;
  /**
   * Sections nesting: the parent lane this lane was declared under. Inner
   * levels normally drop empty lanes — every child lane is declared once,
   * globally, and appears under the right parent only because it is empty
   * everywhere else. Naming the parent here rescues the *empty* lane inside
   * that one parent, which is what lets an empty curated sub-section render
   * (and so be a drop target) without leaking into its siblings. Membership
   * of occupied lanes is still `laneOf`'s call; the board ignores this.
   */
  parentValue?: string;
}

/**
 * One further level of grouping below the top lanes — what the sections layout
 * nests by. The same shape as the top level (`lanes` + `laneOf`) because it is
 * the same thing one level down; an array of these so a third level is a longer
 * array, not a new API.
 */
export interface GroupingLevel<TData extends RowData> {
  lanes: BoardLane[];
  laneOf: (row: TData) => string[];
  /** What this level groups by, e.g. "Material". */
  groupLabel?: string;
}

export interface BoardConfig<TData extends RowData> {
  /**
   * The lanes, in display order. Must cover every value `laneOf` can return —
   * a row whose value has no lane is not rendered anywhere. Deriving both from
   * the same rows (which is what `useEntityGroups` does) satisfies this.
   */
  lanes: BoardLane[];
  /** Which lane(s) a row belongs in. An array because a row can legitimately
   *  sit in several — a part in two systems shows up under both. */
  laneOf: (row: TData) => string[];
  /**
   * Deeper grouping levels, outermost first. The board ignores these — one axis
   * is all its geometry has room for — but the sections layout nests: top-level
   * sections by `lanes`, then each section groups its own rows by
   * `subGroups[0]`, and so on down the array.
   */
  subGroups?: GroupingLevel<TData>[];
  /**
   * Optional roll-up shown in a group header beside the count — "2.4 kg",
   * "14 h". Receives exactly the rows the group holds, so it agrees with the
   * count by construction.
   */
  laneAggregate?: (rows: TData[]) => React.ReactNode;
  /**
   * Sections layout: start with every top-level section collapsed to its
   * header tile. This is what turns the layout into a *landing* — a grid of
   * group tiles that expand in place — instead of an opened-out browse.
   * Deeper levels keep their normal expanded default, so one click on a tile
   * shows its contents rather than another layer of chevrons. The board
   * ignores it.
   */
  defaultCollapsed?: boolean;
  /** The attribute feeding `subGroups[0]`, mirrored here for the toolbar's
   *  "then by" picker the same way `groupBy` mirrors `lanes`. */
  subGroupBy?: string;
  /** Offering this is what puts the "then by" choice in the group picker.
   *  Called with `null` to clear the nesting. */
  onSubGroupByChange?: (attrName: string | null) => void;
  /** Clicking a lane header. The group-cards view uses this to pin the value as
   *  a filter and drop into the table; without it headers are inert. */
  onLaneClick?: (value: string, isNone: boolean) => void;
  /** What the lanes are grouped by, e.g. "Status". Used in the empty state. */
  groupLabel?: string;
  /** The attribute currently laning the board. Only needed alongside
   *  `groupByOptions` — the lanes themselves are already resolved. */
  groupBy?: string;
  /**
   * Attributes the board could lane by instead. Supplying two or more puts a
   * picker in the toolbar next to the layout toggle; a page that resolves its
   * grouping some other way can leave this out and the picker stays away.
   */
  groupByOptions?: { value: string; label: string }[];
  onGroupByChange?: (attrName: string) => void;
}

export interface BoardViewProps<TData extends RowData> extends CardRenderOptions<TData> {
  table: TanstackTable<TData>;
  scrollRef: React.RefObject<HTMLDivElement>;
  board: BoardConfig<TData>;
  /** Lane width in px. Defaults to the "comfortable" card width. */
  laneWidth?: number;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  restoreRowIndex?: ScrollRestoreRef;
  /** Enter/exit + reflow animation on the cards. */
  animate?: boolean;
}

interface LaneItem<TData extends RowData> {
  row: Row<TData>;
  /** Index into the sorted row model — NOT the position in the lane. Every
   *  layout stamps this same coordinate so the scroll hand-off survives a
   *  view toggle. */
  index: number;
}

interface LaneBucket<TData extends RowData> {
  lane: BoardLane;
  items: LaneItem<TData>[];
}

/** `"<laneIndex>:<positionInLane>"` — the board's own card coordinate. The row
 *  model index can't serve: a row shown in two lanes has one index and two
 *  cards, so focus would be ambiguous. */
function posKey(lane: number, pos: number): string {
  return `${lane}:${pos}`;
}

/**
 * Board ("Kanban") rendering of a DataTable's rows: one vertical lane per group
 * value, each holding the same `RowCard` the card grid draws. Runs on the same
 * TanStack table instance as the other layouts, so sorting, selection,
 * expansion and filtering all carry over — cards within a lane follow the
 * table's current sort.
 *
 * Read-only by design: there is no drag. The two entities this ships for group
 * by multi-valued attributes (a part is in several systems) or by a derived
 * status the API refuses to accept a write for, so a drop would have nowhere
 * to land. Adding drag later is a per-entity opt-in, not a rewrite of this.
 *
 * Not virtualized. Every list page loads its whole collection client-side and
 * a lane holds a fraction of it; the grid's chunk virtualizer is shaped around
 * a single flat row list and doesn't transfer to per-lane scrolling.
 */
export function BoardView<TData extends RowData>(props: BoardViewProps<TData>): JSX.Element {
  const rows = props.table.getRowModel().rows;
  const { lanes, laneOf, onLaneClick } = props.board;
  const laneWidth = props.laneWidth ?? CARD_SIZE_WIDTHS[DEFAULT_CARD_SIZE];

  const containerRef = React.useRef<HTMLDivElement>(null);

  const buckets = React.useMemo<LaneBucket<TData>[]>(() => {
    const byValue = new Map<string, LaneItem<TData>[]>();
    for (const lane of lanes) byValue.set(lane.value, []);
    rows.forEach((row, index) => {
      for (const value of laneOf(row.original)) {
        byValue.get(value)?.push({ row, index });
      }
    });
    return lanes.map((lane) => ({ lane, items: byValue.get(lane.value) ?? [] }));
    // Counts come from this pass rather than being passed in alongside the
    // lanes: a header reading "(12)" above nine cards is what happens when the
    // two are derived separately, and the group-cards view already counts
    // against the unfiltered dataset.
  }, [rows, lanes, laneOf]);

  // An empty "Untagged" lane is pure noise — it exists to catch rows, and there
  // are none. Every other empty lane stays: a status with nothing in it is a
  // fact worth showing, and is the whole reason enum buckets get seeded.
  const visible = React.useMemo(
    () => buckets.filter((b) => !b.lane.isNone || b.items.length > 0),
    [buckets]
  );

  const reduceMotion = useReducedMotion();
  const animated = (props.animate ?? true) && !reduceMotion;

  // ---- Scroll hand-off to and from the other layouts -----------------------
  const handleRef = props.scrollHandleRef;
  React.useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getFirstVisibleRowIndex: () =>
        firstVisibleRowIndex(containerRef.current, props.scrollRef.current),
      // Nothing is virtualized here, so the target card is always in the DOM.
      scrollToRowIndex: (index) =>
        scrollRenderedRowToTop(containerRef.current, props.scrollRef.current, index),
    };
    return () => {
      handleRef.current = null;
    };
  });
  React.useEffect(() => {
    const pending = props.restoreRowIndex?.current;
    if (pending == null) return;
    props.restoreRowIndex!.current = null;
    const raf = requestAnimationFrame(() =>
      scrollRenderedRowToTop(containerRef.current, props.scrollRef.current, pending)
    );
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard navigation -------------------------------------------------
  const [focus, setFocus] = React.useState<{ lane: number; pos: number } | null>(null);
  const wantFocusRef = React.useRef(false);

  // A filter can empty the lane the cursor was in, or shorten it under the
  // cursor's position.
  React.useEffect(() => {
    setFocus((f) => {
      if (!f) return f;
      const lane = Math.min(f.lane, visible.length - 1);
      if (lane < 0) return null;
      const count = visible[lane].items.length;
      if (count === 0) return null;
      return { lane, pos: Math.min(f.pos, count - 1) };
    });
  }, [visible]);

  React.useEffect(() => {
    if (!wantFocusRef.current || !focus) return;
    wantFocusRef.current = false;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[${BOARD_POS_ATTR}="${posKey(focus.lane, focus.pos)}"]`
    );
    if (!el) return;
    // Ours to do: the browser's own scroll walks up and drags every ancestor
    // scroller, including the page.
    el.focus({ preventScroll: true });
    ensureVisibleWithin(el, props.scrollRef.current);
  });

  const firstFilled = visible.findIndex((b) => b.items.length > 0);
  const fallbackKey = firstFilled >= 0 ? posKey(firstFilled, 0) : null;

  const moveFocus = (lane: number, pos: number) => {
    if (lane < 0 || lane >= visible.length) return;
    const count = visible[lane].items.length;
    if (count === 0) return;
    setFocus({ lane, pos: Math.max(0, Math.min(pos, count - 1)) });
    wantFocusRef.current = true;
  };

  /** Nearest lane with cards in it, walking `step` from `from`. Empty lanes are
   *  skipped rather than swallowing the cursor. */
  const laneToward = (from: number, step: number): number => {
    for (let i = from + step; i >= 0 && i < visible.length; i += step) {
      if (visible[i].items.length > 0) return i;
    }
    return -1;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only a card root drives navigation. A keystroke inside a card — typing in
    // an inline editor, space on its checkbox — belongs to that control.
    const target = e.target as HTMLElement;
    const key = target.getAttribute(BOARD_POS_ATTR);
    if (!key) return;
    const [laneStr, posStr] = key.split(":");
    const lane = Number(laneStr);
    const pos = Number(posStr);
    if (!Number.isFinite(lane) || !Number.isFinite(pos)) return;
    const row = visible[lane]?.items[pos]?.row;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(lane, pos + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(lane, pos - 1);
        break;
      case "ArrowRight": {
        e.preventDefault();
        const next = laneToward(lane, 1);
        if (next >= 0) moveFocus(next, pos);
        break;
      }
      case "ArrowLeft": {
        e.preventDefault();
        const prev = laneToward(lane, -1);
        if (prev >= 0) moveFocus(prev, pos);
        break;
      }
      case "Home":
        e.preventDefault();
        moveFocus(lane, 0);
        break;
      case "End":
        e.preventDefault();
        moveFocus(lane, visible[lane].items.length - 1);
        break;
      case " ":
        // Space scrolls the page by default, which is exactly the wrong answer
        // to "tick this card".
        if (row?.getCanSelect()) {
          e.preventDefault();
          row.toggleSelected();
        }
        break;
      case "Enter":
        if (!row) break;
        e.preventDefault();
        if (props.expandOnRowClick) row.toggleExpanded();
        props.rowClickFunction?.(row.original);
        break;
      default:
        break;
    }
  };

  if (visible.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-center text-muted-foreground">
        {props.board.groupLabel
          ? `No ${props.board.groupLabel} values to group by.`
          : "Nothing to group."}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-colcount={visible.length}
      onKeyDown={onKeyDown}
      className="flex items-start gap-3 pb-3"
      {...{ [ROW_SCOPE_ATTR]: "" }}
    >
      {visible.map((bucket, laneIndex) => (
        <div
          key={bucket.lane.value}
          role="row"
          aria-label={bucket.lane.label}
          className="flex shrink-0 flex-col"
          style={{ width: laneWidth }}
        >
          <LaneHeader
            lane={bucket.lane}
            count={bucket.items.length}
            aggregate={props.board.laneAggregate?.(bucket.items.map((i) => i.row.original))}
            onClick={onLaneClick}
          />

          <div className="flex flex-col gap-3">
            {(() => {
              const cards = bucket.items.map((item, pos) => {
                const key = posKey(laneIndex, pos);
                return (
                  <React.Fragment key={item.row.id}>
                    <RowCard
                      row={item.row}
                      index={item.index}
                      posAttr={key}
                      // Roving tabindex: exactly one card on the whole board
                      // sits in the tab order, so Tab moves past it rather
                      // than through every card.
                      tabIndex={
                        key === (focus ? posKey(focus.lane, focus.pos) : fallbackKey) ? 0 : -1
                      }
                      animated={animated}
                      onFocus={() => setFocus({ lane: laneIndex, pos })}
                      view={props}
                    />
                    {item.row.getIsExpanded() && (
                      <div>{props.renderSubComponent({ row: item.row })}</div>
                    )}
                  </React.Fragment>
                );
              });
              return animated ? (
                <AnimatePresence initial={false}>{cards}</AnimatePresence>
              ) : (
                cards
              );
            })()}

            {bucket.items.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                Empty
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The lane's group tile. Same anatomy as the group-cards view's tile — visual,
 *  label, count, dashed for the "no value" bucket — because it stands for the
 *  same thing, and clicking it drills in the same way. */
function LaneHeader(props: {
  lane: BoardLane;
  count: number;
  aggregate?: React.ReactNode;
  onClick?: (value: string, isNone: boolean) => void;
}): JSX.Element {
  const { lane, count, aggregate, onClick } = props;

  const tile = (
    <Card
      className={cn(
        lane.isNone && "border-dashed",
        onClick && "transition-colors hover:bg-accent/30"
      )}
    >
      <CardHeader className="p-3">
        <CardTitle
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            lane.isNone && "text-muted-foreground"
          )}
        >
          {lane.visual}
          <span className="truncate">{lane.label}</span>
          <span className="ml-auto flex items-center gap-2 text-xs font-normal text-muted-foreground">
            {aggregate != null && <span>{aggregate}</span>}
            <span>({count})</span>
          </span>
        </CardTitle>
      </CardHeader>
    </Card>
  );

  return (
    // Sticky against the shared scroll region so the lane you are reading keeps
    // saying which lane it is. Opaque background, or cards scroll through it.
    <div className="sticky top-0 z-10 bg-background pb-3">
      {onClick ? (
        <button
          type="button"
          className="w-full text-left"
          title={`Filter to ${lane.label}`}
          onClick={() => onClick(lane.value, !!lane.isNone)}
        >
          {tile}
        </button>
      ) : (
        tile
      )}
    </div>
  );
}
