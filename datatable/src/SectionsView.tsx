import React from "react";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { AnimatePresence, useReducedMotion } from "framer-motion";

import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

import { RowCard, BOARD_POS_ATTR } from "./RowCard";
import type { CardRenderOptions } from "./RowCard";
import type { BoardConfig, BoardLane, GroupingLevel } from "./BoardView";
import {
  GroupSectionHeader,
  NARROW_SPAN_TIER_CLASS,
  SPAN_TIER_CLASS,
  spanTierForCards,
} from "./GroupSections";
import type { RenderSectionWrapper, SectionWrapperInfo } from "./GroupSections";
import {
  ROW_SCOPE_ATTR,
  ensureVisibleWithin,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import { CARD_SIZE_WIDTHS, DEFAULT_CARD_SIZE } from "./CardView";

export interface SectionsViewProps<TData extends RowData> extends CardRenderOptions<TData> {
  table: TanstackTable<TData>;
  scrollRef: React.RefObject<HTMLDivElement>;
  board: BoardConfig<TData>;
  /** Card min width in px — drives both the packed card grid inside a section
   *  and how many tracks a section claims. Defaults to "comfortable". */
  cardMinWidth?: number;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  restoreRowIndex?: ScrollRestoreRef;
  /** Enter/exit + reflow animation on the cards. */
  animate?: boolean;
  /** Section-level drag seam — see `RenderSectionWrapper` for the contract. */
  renderSectionWrapper?: RenderSectionWrapper;
  /** Trailing header furniture per section — a drag grip, a ⋯ menu. Rides in
   *  `GroupSectionHeader`'s `actions` slot, after the count. */
  sectionHeaderActions?: (section: SectionWrapperInfo) => React.ReactNode;
}

interface SectionItem<TData extends RowData> {
  row: Row<TData>;
  /** Index into the sorted row model — the shared coordinate every layout
   *  stamps, so the scroll hand-off survives a view toggle. */
  index: number;
}

/**
 * One node of the grouping tree. A node either renders its items as a card
 * grid (a leaf) or renders `children` — never both: once a deeper level
 * exists, the cards live in the sub-sections and drawing them twice would
 * double every row on screen.
 */
interface SectionNode<TData extends RowData> {
  lane: BoardLane;
  /** Path through the tree by lane value, e.g. "printed" / "printed∕pla".
   *  Collapse state keys off this, so it survives re-bucketing. */
  path: string;
  depth: number;
  items: SectionItem<TData>[];
  children?: SectionNode<TData>[];
}

/** A leaf in render order — the unit keyboard navigation walks. */
interface LeafSection<TData extends RowData> {
  node: SectionNode<TData>;
  items: SectionItem<TData>[];
}

function posKey(section: number, pos: number): string {
  return `${section}:${pos}`;
}

// Span tiers, grid classes and the header anatomy live in GroupSections — the
// same vocabulary the app pages' hand-curated section grids consume, so the
// two packing systems cannot drift on what a "medium" section is.

/**
 * Packed-sections rendering of a DataTable's rows: one section per group value,
 * tiled into a six-track grid and sized by what it holds — the same packing the
 * project pages use for their part-set sections, driven by a group-by attribute
 * instead of hand-arranged records.
 *
 * The board's sibling, not its replacement: both read the same `BoardConfig`,
 * so a page that offers one offers the other for free. Where the board gives
 * every group an equal-width vertical lane (right for scanning a process left
 * to right), this sizes each group by its population and reflows — right for
 * "show me the collection, organised".
 *
 * Nesting: `board.subGroups` adds levels. A section whose level has a deeper
 * one below it renders sub-sections instead of cards, recursively. Inner
 * levels drop empty groups (an empty "PETG" row inside every status section is
 * noise); the top level keeps the board's rule — declared enum values show
 * even at zero, "Untagged" only when occupied.
 *
 * Not virtualized, same trade as the board: list pages hold their whole
 * collection client-side, and the chunk virtualizer is shaped around one flat
 * row list.
 */
export function SectionsView<TData extends RowData>(
  props: SectionsViewProps<TData>
): JSX.Element {
  const rows = props.table.getRowModel().rows;
  const { lanes, laneOf, subGroups, onLaneClick } = props.board;
  const cardWidth = props.cardMinWidth ?? CARD_SIZE_WIDTHS[DEFAULT_CARD_SIZE];

  const containerRef = React.useRef<HTMLDivElement>(null);

  // ---- The grouping tree ---------------------------------------------------
  const sections = React.useMemo<SectionNode<TData>[]>(() => {
    const bucket = (
      level: GroupingLevel<TData>,
      source: SectionItem<TData>[],
      parentPath: string,
      depth: number,
      dropEmpty: boolean,
      parentValue: string | null
    ): SectionNode<TData>[] => {
      const byValue = new Map<string, SectionItem<TData>[]>();
      for (const lane of level.lanes) byValue.set(lane.value, []);
      for (const item of source) {
        for (const value of level.laneOf(item.row.original)) {
          byValue.get(value)?.push(item);
        }
      }
      const nodes: SectionNode<TData>[] = [];
      for (const lane of level.lanes) {
        const items = byValue.get(lane.value) ?? [];
        // Top level keeps the board's rule: declared enum values show at zero,
        // "Untagged" only when occupied. Inner levels drop every empty — a
        // zero row repeated inside each parent says nothing new — unless the
        // lane names this parent as its own (`parentValue`): a curated empty
        // sub-section renders inside its declaring parent, and only there,
        // because an empty section that never renders can never be a drop
        // target.
        if (items.length === 0 && (dropEmpty || lane.isNone)) {
          if (lane.parentValue === undefined || lane.parentValue !== parentValue) continue;
        }
        const path = parentPath ? `${parentPath}∕${lane.value}` : lane.value;
        const node: SectionNode<TData> = { lane, path, depth, items };
        const nextLevel = subGroups?.[depth];
        // Recurse even when empty: a parent with no rows can still declare
        // empty child sections that should render (the rescue above). With no
        // rescued lanes the recursion returns [] and the body falls through
        // to the same render as before.
        if (nextLevel) {
          node.children = bucket(nextLevel, items, path, depth + 1, true, lane.value);
        }
        nodes.push(node);
      }
      return nodes;
    };
    return bucket(
      { lanes, laneOf },
      rows.map((row, index) => ({ row, index })),
      "",
      0,
      false,
      null
    );
  }, [rows, lanes, laneOf, subGroups]);

  // ---- Collapse ------------------------------------------------------------
  // Keyed by value-path rather than index so a filter that removes a section
  // doesn't shift the collapsed state onto its neighbour. Session-local by
  // design for now; persistence is a consumer concern once the layout settles.
  //
  // The set stores *toggles away from the default*, not collapsed paths: under
  // `defaultCollapsed` a top-level section is collapsed unless toggled, so
  // sections that appear later (a grouping change, a filter) arrive in the
  // default state instead of inheriting whatever an absence in a
  // collapsed-set would mean. Deeper levels always default expanded — a tile
  // that opens onto another layer of chevrons would make every card two
  // clicks away.
  const defaultCollapsed = props.board.defaultCollapsed ?? false;
  const [toggled, setToggled] = React.useState<Set<string>>(() => new Set());
  const isCollapsed = React.useCallback(
    (path: string, depth: number) =>
      defaultCollapsed && depth === 0 ? !toggled.has(path) : toggled.has(path),
    [defaultCollapsed, toggled]
  );
  const toggleCollapsed = (path: string) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  // ---- Leaves in render order (keyboard navigation's coordinate space) -----
  const leaves = React.useMemo<LeafSection<TData>[]>(() => {
    const out: LeafSection<TData>[] = [];
    const walk = (nodes: SectionNode<TData>[]) => {
      for (const node of nodes) {
        if (isCollapsed(node.path, node.depth)) continue;
        // A node whose deeper level claimed none of its rows renders its own
        // cards (see the body fallback below), so it is a leaf here too —
        // curated trees have childless sections beside nested ones.
        if (node.children && node.children.length > 0) walk(node.children);
        else if (node.items.length > 0) out.push({ node, items: node.items });
      }
    };
    walk(sections);
    return out;
  }, [sections, isCollapsed]);

  /** Leaf index by path — the renderer needs the leaf's position in keyboard
   *  space while walking the tree. */
  const leafIndexByPath = React.useMemo(() => {
    const map = new Map<string, number>();
    leaves.forEach((leaf, i) => map.set(leaf.node.path, i));
    return map;
  }, [leaves]);

  const reduceMotion = useReducedMotion();
  const animated = (props.animate ?? true) && !reduceMotion;

  // ---- Scroll hand-off to and from the other layouts -----------------------
  const handleRef = props.scrollHandleRef;
  React.useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      getFirstVisibleRowIndex: () =>
        firstVisibleRowIndex(containerRef.current, props.scrollRef.current),
      // Nothing is virtualized here; a collapsed section's cards are the one
      // thing not in the DOM, and a missing target is a no-op by contract.
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
  // Same roving model as the board, with leaf sections standing in for lanes:
  // Up/Down move within a section, Left/Right jump sections. The geometry is a
  // packed grid rather than columns, so "within" is reading order, not a
  // visual column — good enough to reach every card, revisit if it grates.
  const [focus, setFocus] = React.useState<{ sec: number; pos: number } | null>(null);
  const wantFocusRef = React.useRef(false);

  React.useEffect(() => {
    setFocus((f) => {
      if (!f) return f;
      const sec = Math.min(f.sec, leaves.length - 1);
      if (sec < 0) return null;
      const count = leaves[sec].items.length;
      if (count === 0) return null;
      return { sec, pos: Math.min(f.pos, count - 1) };
    });
  }, [leaves]);

  React.useEffect(() => {
    if (!wantFocusRef.current || !focus) return;
    wantFocusRef.current = false;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[${BOARD_POS_ATTR}="${posKey(focus.sec, focus.pos)}"]`
    );
    if (!el) return;
    el.focus({ preventScroll: true });
    ensureVisibleWithin(el, props.scrollRef.current);
  });

  const fallbackKey = leaves.length > 0 ? posKey(0, 0) : null;

  const moveFocus = (sec: number, pos: number) => {
    if (sec < 0 || sec >= leaves.length) return;
    const count = leaves[sec].items.length;
    if (count === 0) return;
    setFocus({ sec, pos: Math.max(0, Math.min(pos, count - 1)) });
    wantFocusRef.current = true;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const key = target.getAttribute(BOARD_POS_ATTR);
    if (!key) return;
    const [secStr, posStr] = key.split(":");
    const sec = Number(secStr);
    const pos = Number(posStr);
    if (!Number.isFinite(sec) || !Number.isFinite(pos)) return;
    const row = leaves[sec]?.items[pos]?.row;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(sec, pos + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(sec, pos - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        moveFocus(sec + 1, 0);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(sec - 1, 0);
        break;
      case "Home":
        e.preventDefault();
        moveFocus(sec, 0);
        break;
      case "End":
        e.preventDefault();
        moveFocus(sec, leaves[sec].items.length - 1);
        break;
      case " ":
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

  if (sections.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-center text-muted-foreground">
        {props.board.groupLabel
          ? `No ${props.board.groupLabel} values to group by.`
          : "Nothing to group."}
      </div>
    );
  }

  const renderCards = (leaf: LeafSection<TData>, secIndex: number) => {
    const cards = leaf.items.map((item, pos) => {
      const key = posKey(secIndex, pos);
      return (
        <React.Fragment key={item.row.id}>
          <RowCard
            row={item.row}
            index={item.index}
            posAttr={key}
            tabIndex={
              key === (focus ? posKey(focus.sec, focus.pos) : fallbackKey) ? 0 : -1
            }
            animated={animated}
            onFocus={() => setFocus({ sec: secIndex, pos })}
            view={props}
          />
          {item.row.getIsExpanded() && (
            // Full grid width: the expansion panel is a detail sheet, and
            // pinning it to one card-sized cell would fold it into a strip.
            <div className="col-span-full">{props.renderSubComponent({ row: item.row })}</div>
          )}
        </React.Fragment>
      );
    });
    return (
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(min(${cardWidth}px, 100%), 1fr))`,
        }}
      >
        {animated ? <AnimatePresence initial={false}>{cards}</AnimatePresence> : cards}
      </div>
    );
  };

  const renderNode = (node: SectionNode<TData>, parentValue: string | null): React.ReactNode => {
    const nodeCollapsed = isCollapsed(node.path, node.depth);
    const isTop = node.depth === 0;
    const aggregate = props.board.laneAggregate?.(node.items.map((i) => i.row.original));
    const leafIndex = leafIndexByPath.get(node.path);

    const info: SectionWrapperInfo = {
      value: node.lane.value,
      label: node.lane.label,
      path: node.path,
      depth: node.depth,
      parentValue,
      isNone: !!node.lane.isNone,
      collapsed: nodeCollapsed,
      count: node.items.length,
    };

    const header = (
      <GroupSectionHeader
        label={node.lane.label}
        count={node.items.length}
        visual={node.lane.visual}
        aggregate={aggregate}
        isNone={node.lane.isNone}
        size={isTop ? "md" : "sm"}
        collapsed={nodeCollapsed}
        onToggleCollapse={() => toggleCollapsed(node.path)}
        onLabelClick={
          onLaneClick ? () => onLaneClick(node.lane.value, !!node.lane.isNone) : undefined
        }
        labelTitle={onLaneClick ? `Filter to ${node.lane.label}` : undefined}
        actions={props.sectionHeaderActions?.(info)}
      />
    );

    const body = node.children && node.children.length > 0 ? (
      // Sub-sections pack into a two-track grid of their own — the narrow
      // ladder: below full width everything pairs up, and only a large
      // sub-section takes the parent's full width. Dense for the same reason
      // as the outer grid: a full-width child after a half-width one would
      // otherwise strand the second track.
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:[grid-auto-flow:dense]">
        {node.children.map((child) => renderNode(child, node.lane.value))}
      </div>
    ) : node.items.length > 0 && leafIndex !== undefined ? (
      renderCards({ node, items: node.items }, leafIndex)
    ) : (
      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        Empty
      </div>
    );

    // The grid-item geometry. Top level packs the six-track ladder (collapse
    // drops to the smallest rung, deliberately ahead of the lane's pinned
    // span — pins describe the expanded body); nested sections divide their
    // parent's two tracks by the narrow ladder.
    const spanClass = isTop
      ? SPAN_TIER_CLASS[
          nodeCollapsed ? "s" : (node.lane.span ?? spanTierForCards(node.items.length, cardWidth))
        ]
      : NARROW_SPAN_TIER_CLASS[
          node.lane.span ?? spanTierForCards(node.items.length, cardWidth)
        ];

    const inner = (
      <section
        aria-label={node.lane.label}
        className={cn(
          "flex flex-col gap-3 rounded-lg border p-3",
          isTop ? "bg-card/50" : "bg-background/40",
          node.lane.isNone && "border-dashed"
        )}
      >
        {header}
        {!nodeCollapsed && body}
      </section>
    );

    // The seam takes over the outermost grid element — a dnd transform there
    // moves the whole grid item, where one on an inner div would slide the
    // content around inside a stationary cell.
    if (props.renderSectionWrapper) {
      return (
        <React.Fragment key={node.path}>
          {props.renderSectionWrapper(info, { className: spanClass }, inner)}
        </React.Fragment>
      );
    }
    return (
      <div key={node.path} className={spanClass}>
        {inner}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      // items-start so a tile keeps its natural height instead of stretching
      // to its row's tallest neighbour — a collapsed section is just its
      // header bar, not a blank box.
      //
      // grid-auto-flow dense so a later section back-fills a hole an earlier
      // row left (an s(2) beside an m(3) otherwise strands a dead track until
      // the row wraps) — the same choice the app pages' hand-curated packed
      // grids made, and the "packed" in packed sections. The cost is that
      // visual order can deviate from DOM order, which keyboard navigation
      // walks; the curated pages accepted that trade first.
      className="grid grid-cols-1 items-start gap-3 pb-3 md:grid-cols-6 md:[grid-auto-flow:dense]"
      {...{ [ROW_SCOPE_ATTR]: "" }}
    >
      {sections.map((node) => renderNode(node, null))}
    </div>
  );
}
