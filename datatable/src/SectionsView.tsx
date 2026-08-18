import React from "react";
import type { Row, Table as TanstackTable } from "@tanstack/react-table";
import { AnimatePresence, useReducedMotion } from "framer-motion";

import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

import { RowCard, BOARD_POS_ATTR } from "./RowCard";
import type { CardRenderOptions } from "./RowCard";
import type { BoardConfig, BoardLane, GroupingLevel } from "./BoardView";
import {
  DEFAULT_SECTIONS_PACKING,
  GroupSectionHeader,
  NARROW_SPAN_TIER_CLASS,
  SECTIONS_PACKING,
  SECTION_COL_SPAN_CLASS,
  SECTION_COL_SPAN_VAR,
  SECTION_INNER_GRID_CLASS,
  SECTION_TRACKS_VAR,
  SPAN_TIER_CLASS,
  resolveSectionTone,
  sectionColumnCount,
  sectionRowSpan,
  sectionShapeColumns,
  sectionTrackPitch,
  sectionTrackSpanForColumns,
  spanTierForCards,
  spanTierTracks,
  themeSurfaceCount,
} from "./GroupSections";
import type {
  RenderSectionWrapper,
  SectionTone,
  SectionWrapperInfo,
  SectionsPacking,
  SpanTier,
} from "./GroupSections";
import {
  ROW_SCOPE_ATTR,
  ensureVisibleWithin,
  firstVisibleRowIndex,
  scrollRenderedRowToTop,
} from "./ViewScroll";
import type { ScrollRestoreRef, ViewScrollHandle } from "./ViewScroll";
import { CARD_SIZE_WIDTHS, DEFAULT_CARD_SIZE, sizeWidthsForVariant } from "./CardView";

export interface SectionsViewProps<TData extends RowData> extends CardRenderOptions<TData> {
  table: TanstackTable<TData>;
  scrollRef: React.RefObject<HTMLDivElement>;
  board: BoardConfig<TData>;
  /** Card min width in px — drives both the packed card grid inside a section
   *  and how many tracks a section claims. Defaults to "comfortable". */
  cardMinWidth?: number;
  /** Which packing strategy lays the sections out — see `SectionsPacking`.
   *  Defaults to `"fit-narrow"`. Live-switchable: every mode reads the same
   *  measurements, so changing it re-derives the geometry without re-measuring
   *  anything. */
  sectionsPacking?: SectionsPacking;
  renderSubComponent: (props: { row: Row<TData> }) => React.ReactNode;
  scrollHandleRef?: React.MutableRefObject<ViewScrollHandle | null>;
  restoreRowIndex?: ScrollRestoreRef;
  /** Enter/exit + reflow animation on the cards. */
  animate?: boolean;
  /** Section-level drag seam — see `RenderSectionWrapper` for the contract. */
  renderSectionWrapper?: RenderSectionWrapper;
  /** Trailing header furniture per section — a ⋯ menu, edit affordances.
   *  Rides in `GroupSectionHeader`'s `actions` slot, after the count. */
  sectionHeaderActions?: (section: SectionWrapperInfo) => React.ReactNode;
  /** Leading header furniture per section — the reorder grip. Rides in
   *  `GroupSectionHeader`'s `leading` slot, ahead of the collapse chevron. */
  sectionHeaderLeading?: (section: SectionWrapperInfo) => React.ReactNode;
  /** Backdrop colour per section, from the theme's card palette. Defaults to
   *  `"none"` — the neutral card/background frame every sections view has
   *  drawn until now. See `SectionTone`. */
  sectionTone?: SectionTone;
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
 * Per-path box measurement, the shared half of both packing decisions: how
 * many row modules a section claims (from its height) and how many tile
 * columns its card grid draws (from its width). Both need the same thing —
 * one number per rendered element, keyed by section path, kept current as the
 * layout moves — so they share one mechanism rather than two copies of a
 * ResizeObserver dance that must not drift apart.
 *
 * `valueOf` runs against the element and must be cheap; it is read through a
 * ref so a caller may pass an inline closure.
 *
 * The measure→resize→measure loop these usually create is closed off in two
 * different places, both load-bearing:
 *
 * - Geometrically, by the callers. A section's height is content-driven under
 *   `items-start` however many rows it spans, and a card grid's width comes
 *   from the section's column span, not from how many tracks it draws. So no
 *   measurement here can be moved by the value it produces.
 *
 * - In React's update cascade, by measuring in the layout effect ONLY for
 *   paths that have no value yet. The synchronous first measure is what keeps
 *   a wrong span or an auto-fill fallback from ever being painted; a sweep
 *   that re-measured everything on every render instead dispatched from
 *   inside the commit phase, and with framer-motion re-rendering the tree
 *   through a reflow that chain runs away — changing one section's width tier
 *   reliably hit React's nested-update ceiling ("Maximum update depth
 *   exceeded") even though the measurement it kept re-dispatching never
 *   changed. Every later change moves the box, so the observer sees it, and
 *   it sees it in its own task where a state update is a fresh chain.
 */
function useMeasuredBoxes(valueOf: (el: HTMLElement) => number): {
  values: Record<string, number>;
  measureRef: (path: string) => React.RefCallback<HTMLElement>;
} {
  const [values, setValues] = React.useState<Record<string, number>>({});
  const valuesRef = React.useRef(values);
  valuesRef.current = values;
  const valueOfRef = React.useRef(valueOf);
  valueOfRef.current = valueOf;

  const els = React.useRef(new Map<string, HTMLElement>());
  const pathByEl = React.useRef(new WeakMap<Element, string>());
  const refs = React.useRef(new Map<string, React.RefCallback<HTMLElement>>());
  const observerRef = React.useRef<ResizeObserver | null>(null);

  const measure = React.useCallback((path: string, el: HTMLElement) => {
    const value = valueOfRef.current(el);
    setValues((prev) => (prev[path] === value ? prev : { ...prev, [path]: value }));
  }, []);

  // The observer owns every measurement after the first: it fires on observe()
  // as well as on change, so an element replaced under an existing path (a
  // re-bucket, a grouping switch) is re-measured even though the path already
  // carries a value.
  const observer = (): ResizeObserver | null => {
    if (!observerRef.current && typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const path = pathByEl.current.get(entry.target);
          if (path) measure(path, entry.target as HTMLElement);
        }
      });
    }
    return observerRef.current;
  };
  React.useEffect(() => () => observerRef.current?.disconnect(), []);

  /** Ref callback for one path, memoized — a fresh callback each render would
   *  detach and re-observe every element on every keystroke. */
  const measureRef = (path: string): React.RefCallback<HTMLElement> => {
    const existing = refs.current.get(path);
    if (existing) return existing;
    const cb: React.RefCallback<HTMLElement> = (el) => {
      const prev = els.current.get(path);
      if (prev && prev !== el) {
        observerRef.current?.unobserve(prev);
        pathByEl.current.delete(prev);
      }
      if (el) {
        els.current.set(path, el);
        pathByEl.current.set(el, path);
        observer()?.observe(el);
      } else {
        els.current.delete(path);
        refs.current.delete(path);
      }
    };
    refs.current.set(path, cb);
    return cb;
  };

  React.useLayoutEffect(() => {
    els.current.forEach((el, path) => {
      if (valuesRef.current[path] === undefined) measure(path, el);
    });
  });

  return { values, measureRef };
}

/** A section's rendered height in px. Stored raw rather than already divided
 *  into row modules: the module is a property of the ACTIVE PACKING MODE, and
 *  a stored span would be stale the moment the mode changed (the observer has
 *  no reason to fire — the box did not move). Raw height keeps the measured
 *  state mode-independent and leaves the quantization where every other
 *  derived number lives, in render. */
const heightOf = (el: HTMLElement): number => el.getBoundingClientRect().height;

/** A card grid's content width. The element is ours and carries no padding or
 *  border, so the border box IS the content box — and the fractional rect
 *  beats `clientWidth`, whose rounding can flip a column count at the edge. */
const contentWidthOf = (el: HTMLElement): number => el.getBoundingClientRect().width;

/**
 * A section's own horizontal chrome — the border and padding between the track
 * width the grid hands it and the width its cards get.
 *
 * Read off the rendered element rather than written down as `2 × 12 + 2 × 1`,
 * for the reason the column count is measured rather than derived: a section's
 * frame is styling, it differs by depth already (`bg-card/50` vs
 * `bg-background/40` today, a thicker frame tomorrow), and a span computed
 * against a stale constant is wrong in the direction that costs a whole track.
 * Constant per element once painted, so unlike the width and height
 * measurements this one can never move in response to the value it produces.
 */
const chromeWidthOf = (el: HTMLElement): number => {
  const cs = getComputedStyle(el);
  const px = (v: string) => parseFloat(v) || 0;
  return (
    px(cs.borderLeftWidth) + px(cs.borderRightWidth) + px(cs.paddingLeft) + px(cs.paddingRight)
  );
};

/** How many tracks the outermost sections grid divides into — the numeric
 *  twin of `md:grid-cols-6`, and the top of the nesting cascade: every deeper
 *  grid's track count is its parent's column span. */
const TOP_LEVEL_TRACKS = 6;

/** The fixed track count a nested grid divides into under the `rows` and
 *  `packed` modes — the shape this layout had before sub-sections were sized
 *  to their contents, where every child below full width is a half. */
const LEGACY_NESTED_TRACKS = 2;

/** The grid geometry a section is rendered into: how many tracks its grid has,
 *  and — below the top level, where the parent has measured its own grid — the
 *  column span and tile-column cap the parent computed for it. */
interface SectionGeometry {
  tracks: number;
  colSpan?: number;
  columnCap?: number;
}

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
  // A lane may pin its own tile size. Resolved against the ACTIVE VARIANT's
  // preset table, so "large" is a large gallery tile in a photo view and a
  // large card in a record view — the size names are shared, the pixels are
  // not. One function, used for both the grid template and the auto span,
  // because a section's width is an answer about how many of its own tiles
  // fit: resolving them separately is how a section ends up sized for a tile
  // it is not drawing.
  const sizeWidths = sizeWidthsForVariant(props.variant ?? "cards");
  const widthOf = (lane: BoardLane): number =>
    lane.cardSize ? sizeWidths[lane.cardSize] : cardWidth;

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

  // ---- Row spans and tile columns (the two measured halves of the packing) -
  // Vertical: every section gets an explicit `grid-row-end: span N` against
  // the grid's fixed row module, so dense placement back-fills downward as
  // well as sideways (see SECTION_ROW_MODULE_PX for why that is the trick).
  // A section's height is its header plus however many rows of cards its
  // width happens to fit plus whatever a nested grid settled at — nothing a
  // row count could predict, so it is measured. Nested sections measure the
  // same way (renderNode recurses) and cascade upward: a child settling
  // changes the parent's height, the parent's observer fires, its span
  // follows.
  //
  // Horizontal: each leaf card grid measures its own width and draws an
  // integer number of tile columns from it (see `sectionColumnCount`), so a
  // row fills edge to edge with the tile count the width is actually closest
  // to — instead of `auto-fill` dropping a track over the section chrome and
  // stretching the survivors.
  //
  // Both stay mounted in every packing mode, including the ones that apply
  // neither answer: an observer costs nothing next to a re-measure storm on
  // every mode switch, and a mode that measures the same things it always did
  // can be switched into and out of without a frame of unpacked layout.
  const { values: heights, measureRef: heightRef } = useMeasuredBoxes(heightOf);
  const { values: gridWidths, measureRef: cardGridRef } = useMeasuredBoxes(contentWidthOf);
  const { values: chromes, measureRef: chromeRef } = useMeasuredBoxes(chromeWidthOf);

  // Which of those answers actually get applied. Everything below reads this
  // record rather than testing the mode name, so each decision still reads as
  // the thing it decides.
  const mode = SECTIONS_PACKING[props.sectionsPacking ?? DEFAULT_SECTIONS_PACKING]
    ?? SECTIONS_PACKING[DEFAULT_SECTIONS_PACKING];

  // Two measurements on the one `<section>` element — its height in row
  // modules and its horizontal chrome — so their ref callbacks have to be one
  // callback. Memoized per path like the hook's own are: a fresh function each
  // render would detach and re-observe every section on every keystroke.
  const sectionRefs = React.useRef(new Map<string, React.RefCallback<HTMLElement>>());
  const sectionRef = (path: string): React.RefCallback<HTMLElement> => {
    const existing = sectionRefs.current.get(path);
    if (existing) return existing;
    const height = heightRef(path);
    const chrome = chromeRef(path);
    const cb: React.RefCallback<HTMLElement> = (el) => {
      height(el);
      chrome(el);
      if (!el) sectionRefs.current.delete(path);
    };
    sectionRefs.current.set(path, cb);
    return cb;
  };

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

  const renderCards = (leaf: LeafSection<TData>, secIndex: number, columnCap?: number) => {
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
    // Tile sizes are targets, not minimums. `auto-fill` reads the preset as a
    // hard floor, so the section's own chrome — border + p-3, twice over
    // inside a nested sub-section — is enough to drop the last track and hand
    // its width to the survivors: the row that should show six large tiles
    // shows five stretched ones. Measuring this grid and dividing it into an
    // integer column count answers the question the eye is actually asking —
    // six slightly narrow tiles or five wide ones? — and every row then fills
    // edge to edge exactly. Because the width is measured HERE, the chrome is
    // subtracted at whatever depth this grid happens to sit.
    //
    // Until the first measurement lands (one layout pass, before paint) the
    // old auto-fill template stands in, so nothing is drawn column-less.
    //
    // `columnCap` is the other half of a content-sized span: when the parent
    // sized this section's width for a block of N columns (see
    // `sectionShapeColumns`), the grid must draw N and wrap — left to its own
    // devices it would spend the rounding-up slack of the last track on an
    // extra column, and the section would come out a row shorter and a shape
    // wider than the one its width was bought for.
    //
    // Integer columns are on in every packing mode: which count a row is
    // closest to is an objective question about the measured width, not a
    // taste one. What the modes disagree about is what happens to the
    // remainder — normally the columns share it (`1fr`), under `uniform` the
    // tiles hold their nominal width and the section keeps the slack, because
    // a tile that grew to fill a wide section is exactly what a "same size
    // everywhere" gallery is trying not to do. `minmax(0, W)` rather than a
    // bare `W`: below md, and in any section narrower than one tile, the
    // column still has to be able to shrink instead of overflowing.
    const tileWidth = widthOf(leaf.node.lane);
    const gridWidth = gridWidths[leaf.node.path];
    const columns = gridWidth
      ? Math.min(sectionColumnCount(gridWidth, tileWidth, mode.shrinkTol), columnCap ?? Infinity)
      : undefined;
    const track = mode.fixedTileWidth ? `minmax(0, ${tileWidth}px)` : "minmax(0, 1fr)";
    return (
      <div
        ref={cardGridRef(leaf.node.path)}
        className={cn("grid gap-3", mode.fixedTileWidth && "justify-start")}
        style={{
          gridTemplateColumns: columns
            ? `repeat(${columns}, ${track})`
            : `repeat(auto-fill, minmax(min(${tileWidth}px, 100%), 1fr))`,
        }}
      >
        {animated ? <AnimatePresence initial={false}>{cards}</AnimatePresence> : cards}
      </div>
    );
  };

  // Probed once per render, not per section, and skipped entirely when nothing
  // is tinted. Read during render rather than from an effect on purpose: the
  // count decides what the *first* paint looks like, and deferring it would
  // flash a page of neutral sections before they took their colours.
  const surfaceCount =
    props.sectionTone && props.sectionTone !== "none" ? themeSurfaceCount() : 0;

  /**
   * The tier a section would earn on its own: a pin if the lane carries one,
   * otherwise the card-count ladder — and the smallest useful rung once
   * collapsed, at every depth, since a collapsed section is one header line
   * and the pin describes its expanded body.
   */
  const tierOf = (node: SectionNode<TData>): SpanTier =>
    isCollapsed(node.path, node.depth)
      ? "s"
      : (node.lane.span ?? spanTierForCards(node.items.length, widthOf(node.lane)));

  const renderNode = (
    node: SectionNode<TData>,
    parentValue: string | null,
    // Both carry down through the tree, and for opposite reasons: `rootIndex`
    // is inherited unchanged (a sub-section wears its group's colour), while
    // `geometry` is re-derived per child (a sub-section packs into its own
    // parent's tracks, not the page's).
    rootIndex: number,
    geometry: SectionGeometry
  ): React.ReactNode => {
    const nodeCollapsed = isCollapsed(node.path, node.depth);
    const isTop = node.depth === 0;
    const aggregate = props.board.laneAggregate?.(node.items.map((i) => i.row.original));
    const leafIndex = leafIndexByPath.get(node.path);

    const info: SectionWrapperInfo = {
      value: node.lane.value,
      label: node.lane.label,
      path: node.path,
      depth: node.depth,
      rootIndex,
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
        leading={props.sectionHeaderLeading?.(info)}
        actions={props.sectionHeaderActions?.(info)}
      />
    );

    // How many tracks this section itself claims — the number its own
    // sub-grid then divides into. At the top that is the six-track ladder; a
    // nested section was handed its span by the parent that measured the grid
    // it sits in, and falls back to the ladder until that measurement lands.
    //
    // Under `legacyNestedGrid` the cascade stops at the top: a nested grid is
    // a fixed two tracks and its children take the collapsed ladder, so the
    // span is the ladder's answer and nothing measured feeds it.
    const tier = tierOf(node);
    const ownTracks = isTop
      ? spanTierTracks(tier, TOP_LEVEL_TRACKS)
      : mode.legacyNestedGrid
        ? spanTierTracks(tier, geometry.tracks)
        : (geometry.colSpan ?? spanTierTracks(tier, geometry.tracks));
    /** The track count this section's own sub-grid divides into. */
    const nestedTracks = mode.legacyNestedGrid ? LEGACY_NESTED_TRACKS : ownTracks;

    // The nested grid gets as many tracks as this section claimed columns, so
    // an inner track is the same width as an outer one and a "half-width"
    // sub-section means the same fraction of the page at every depth. Then
    // each child is sized to what it HOLDS rather than to a rung: a two-photo
    // sub-section asks for the tracks two photos need, and the dense flow
    // fills what it left beside it — instead of every child splitting the
    // parent down the middle and standing in a half-empty box.
    const gridWidth = gridWidths[node.path];
    const pitch = gridWidth ? sectionTrackPitch(gridWidth, nestedTracks) : 0;
    const childGeometry = (child: SectionNode<TData>): SectionGeometry => {
      const geo: SectionGeometry = { tracks: nestedTracks };
      const childTier = tierOf(child);
      geo.colSpan = spanTierTracks(childTier, nestedTracks);
      // Content-sizing applies to a card-holding leaf whose width nothing has
      // pinned. A pin is an instruction; a collapsed section has no content to
      // size to; a sub-tree's width is about its own children, which the
      // ladder answers well enough at the depth this layout goes to.
      // `!= null`, not `!== undefined`: a stored view config round-trips an
      // unset span as an explicit null, which is "no pin", not "pin to null".
      const pinned = child.lane.span != null;
      const isLeaf = !(child.children && child.children.length > 0);
      const measured = pitch > 0 && !isCollapsed(child.path, child.depth);
      if (mode.contentSized && !pinned && isLeaf && child.items.length > 0 && measured) {
        const childTile = widthOf(child.lane);
        // The child's own frame, measured — the difference between the tracks
        // it is handed and the width its tiles get. Its own once it has
        // rendered; this section's until then, which is the same styling.
        const chrome = chromes[child.path] ?? chromes[node.path] ?? 0;
        const columns = sectionShapeColumns(
          child.items.length,
          // Never ask for more columns than the whole parent could hold: a
          // populous sub-section wraps instead of demanding a width that does
          // not exist. It is also the capacity the wide bias divides into
          // rows, which is why it is passed in rather than min'd afterwards.
          sectionColumnCount(gridWidth - chrome, childTile, mode.shrinkTol),
          mode.shapeBias
        );
        geo.colSpan = sectionTrackSpanForColumns(
          columns,
          childTile,
          chrome,
          pitch,
          nestedTracks,
          mode.shrinkTol
        );
        geo.columnCap = columns;
      }
      return geo;
    };

    const body = node.children && node.children.length > 0 ? (
      // Sub-sections pack into a grid of their own, `ownTracks` wide. Dense
      // for the same reason as the outer grid: a full-width child after a
      // half-width one would otherwise strand the tracks beside it. Same row
      // module and the same items-start as the outer grid, so the two levels
      // pack alike: two short sub-sections stack beside a tall sibling, and
      // the slack a short one used to absorb by stretching to its row's height
      // (drawing the gap INSIDE its own border) moves out onto the background
      // where it reads as spacing.
      //
      // The track count rides a CSS variable rather than an inline template
      // because below md these grids are a single column — see
      // `SECTION_INNER_GRID_CLASS`.
      //
      // The legacy modes take the two-track template as a plain class and no
      // variable, which is the same grid the layout had before sub-sections
      // were content-sized — and `items-start` only where there is a row
      // module to make it mean something, so `rows` reproduces its baseline
      // exactly (short children stretch to their row's height there).
      <div
        ref={cardGridRef(node.path)}
        className={cn(
          "grid gap-3 md:[grid-auto-flow:dense]",
          mode.rowModulePx > 0 && "items-start",
          mode.legacyNestedGrid
            ? "grid-cols-1 md:grid-cols-2"
            : SECTION_INNER_GRID_CLASS,
          mode.rowModuleClass
        )}
        style={
          mode.legacyNestedGrid
            ? undefined
            : ({
                [SECTION_TRACKS_VAR]: `repeat(${nestedTracks}, minmax(0, 1fr))`,
              } as React.CSSProperties)
        }
      >
        {/* `rootIndex` carries down unchanged — a sub-section belongs to its
            group's colour, it does not start a new one. */}
        {node.children.map((child) =>
          renderNode(child, node.lane.value, rootIndex, childGeometry(child))
        )}
      </div>
    ) : node.items.length > 0 && leafIndex !== undefined ? (
      renderCards({ node, items: node.items }, leafIndex, geometry.columnCap)
    ) : (
      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
        Empty
      </div>
    );

    // The grid-item geometry. Top level packs the six-track ladder as classes
    // (its xs rung is responsive, and the curated section grids share the
    // map); nested sections carry a measured track span, which has to be a
    // variable so the single-column layout below md survives it — except in
    // the legacy modes, where the two-track ladder is a class like the top
    // level's and no variable is set.
    const spanClass = isTop
      ? SPAN_TIER_CLASS[tier]
      : mode.legacyNestedGrid
        ? NARROW_SPAN_TIER_CLASS[tier]
        : SECTION_COL_SPAN_CLASS;

    // The row span, quantized here rather than at measurement time so a mode
    // switch re-derives it from the height already on hand — and so `rows`,
    // which packs no rows at all, leaves no stale `grid-row-end` behind on the
    // element it is switching away from. Absent on the very first render of a
    // section (one layout pass, resolved before anything is painted) and in
    // any mode without a row module.
    const height = heights[node.path];
    const rowSpan = mode.rowModulePx > 0 && height ? sectionRowSpan(height, mode.rowModulePx) : 0;
    const wantsColSpanVar = !isTop && !mode.legacyNestedGrid;
    const spanStyle: React.CSSProperties | undefined =
      rowSpan || wantsColSpanVar
        ? ({
            ...(rowSpan ? { gridRowEnd: `span ${rowSpan}` } : null),
            ...(wantsColSpanVar ? { [SECTION_COL_SPAN_VAR]: `span ${ownTracks}` } : null),
          } as React.CSSProperties)
        : undefined;

    // A tinted section replaces the neutral frame rather than layering over it:
    // the palette is seeded one step from `card`, so painting it on top of
    // `bg-card/50` would land it a step further out than it was tuned for.
    const toneStyle = resolveSectionTone(props.sectionTone, info, surfaceCount);

    const inner = (
      <section
        // The measurement subject: the package's own element, because the
        // grid item above it may be the consumer's and is not ours to ref.
        // With items-start the two are the same height anyway.
        ref={sectionRef(node.path)}
        aria-label={node.lane.label}
        className={cn(
          "flex flex-col gap-3 rounded-lg border p-3",
          !toneStyle && (isTop ? "bg-card/50" : "bg-background/40"),
          node.lane.isNone && "border-dashed"
        )}
        style={toneStyle}
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
          {props.renderSectionWrapper(info, { className: spanClass, style: spanStyle }, inner)}
        </React.Fragment>
      );
    }
    return (
      <div key={node.path} className={spanClass} style={spanStyle}>
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
      //
      // The row module is what makes dense mean anything vertically. Without
      // it every grid row is one full-width strip as tall as its tallest
      // member, so a tall section leaves a dead band under each of its short
      // neighbours that nothing is even allowed to move into — the holes this
      // layout is named for. With fixed rows and a measured span per section,
      // the same placement pass fills both axes. `rows` is that "without it"
      // case kept as a mode: auto rows, no spans, full-width strips.
      className={cn(
        "grid grid-cols-1 items-start gap-3 pb-3 md:grid-cols-6 md:[grid-auto-flow:dense]",
        mode.rowModuleClass
      )}
      {...{ [ROW_SCOPE_ATTR]: "" }}
    >
      {sections.map((node, index) =>
        renderNode(node, null, index, { tracks: TOP_LEVEL_TRACKS })
      )}
    </div>
  );
}
