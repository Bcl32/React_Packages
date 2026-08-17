import type React from "react";

import type { RowData } from "@bcl32/data-utils";

import type { BoardConfig, BoardLane, GroupingLevel } from "./BoardView";
import type { SpanTier } from "./GroupSections";

/**
 * A curated section tree, expressed in the grouping vocabulary — what lets a
 * page render hand-arranged sections through the same `SectionsView` that
 * draws attribute grouping.
 *
 * The mapping is read-only by construction: a tree node becomes a lane (id as
 * value, label as label, given order as lane order), membership becomes
 * `laneOf` (the row's node id walked up to the right ancestor), and child
 * nodes become the nested `GroupingLevel`. Nothing here can write — drag
 * handlers and menus stay consumer-side; this is a lens over the tree.
 *
 * Depth: the grouping levels are two — top-level nodes, then their children.
 * A deeper descendant (grandchild) rolls its rows up into its level-1
 * ancestor rather than rendering another rung.
 *
 * Loose rows: a parent that holds direct rows *and* child nodes maps its
 * direct rows to a per-parent dashed lane — the sub-grid can only draw lanes,
 * and silently dropping the direct rows would make the parent's count
 * disagree with its visible cards. A childless node skips the second level
 * entirely (its inner bucketing claims nothing) and renders its cards
 * directly.
 */

/** The synthesized "no node" lane value. Rows whose id is missing — or no
 *  longer in the tree — land here rather than vanishing. */
export const TREE_UNGROUPED = "__ungrouped";

/** The per-parent lane holding a nested parent's directly-assigned rows. */
export function treeLooseLane(parentId: string): string {
  return `__direct:${parentId}`;
}

const LOOSE_PREFIX = "__direct:";

export type TreeLaneRef =
  | { kind: "ungrouped" }
  | { kind: "loose"; parentId: string }
  | { kind: "node"; id: string };

/** Classify a lane value a drop handler received back into tree terms — the
 *  inverse of the sentinels above, so a consumer never string-matches them. */
export function parseTreeLane(value: string): TreeLaneRef {
  if (value === TREE_UNGROUPED) return { kind: "ungrouped" };
  if (value.startsWith(LOOSE_PREFIX)) {
    return { kind: "loose", parentId: value.slice(LOOSE_PREFIX.length) };
  }
  return { kind: "node", id: value };
}

/** One node of the consumer's curated tree. Field names are the contract —
 *  the consumer maps its own rows (sections, folders, …) into this shape. */
export interface TreeBoardNode {
  id: string;
  label: string;
  /** Nested nodes. Depth beyond two rolls rows up into the level-1 ancestor. */
  children?: TreeBoardNode[];
  /** Header decoration — swatches, icons. Injectable because it is the one
   *  genuinely app-shaped part of a tree board. */
  visual?: React.ReactNode;
  /** A hand-pinned width tier. Validated — values that aren't a tier (stale
   *  persisted config) are dropped rather than passed through. */
  span?: string | null;
}

export interface TreeBoardOptions<TData extends RowData> {
  /** Which tree node a row is assigned to — `null`/`undefined` means loose. */
  nodeIdOf: (row: TData) => string | null | undefined;
  /** What the top level is, e.g. "Sections". */
  groupLabel?: string;
  subGroupLabel?: string;
  ungroupedLabel?: string;
  /** Label of the per-parent lane holding a nested parent's direct rows. */
  looseLabel?: string;
  /**
   * Render a parent's empty child nodes as empty sections instead of dropping
   * them. Off by default (matching attribute grouping, where a zero row inside
   * every parent is noise); a drag-and-drop consumer turns it on because an
   * empty section that never renders can never be a drop target.
   */
  keepEmptyChildren?: boolean;
}

const SPAN_TIERS: ReadonlySet<string> = new Set(["xs", "s", "m", "l"]);
function pinnedSpan(span: string | null | undefined): SpanTier | undefined {
  return span != null && SPAN_TIERS.has(span) ? (span as SpanTier) : undefined;
}

/**
 * @param nodes The curated tree's top-level nodes, in display order. Pass only
 *   real nodes — the ungrouped lane is synthesized here, last and dashed.
 * @returns A `BoardConfig`-shaped object ({lanes, laneOf, subGroups,
 *   groupLabel}), or `undefined` when there is nothing to draw.
 */
export function buildTreeBoard<TData extends RowData>(
  nodes: TreeBoardNode[] | undefined,
  options: TreeBoardOptions<TData>
): Pick<BoardConfig<TData>, "lanes" | "laneOf" | "subGroups" | "groupLabel"> | undefined {
  if (!nodes?.length) return undefined;
  const {
    nodeIdOf,
    groupLabel = "Sections",
    subGroupLabel = "Sub-sections",
    ungroupedLabel = "Ungrouped",
    looseLabel = "Loose items",
    keepEmptyChildren = false,
  } = options;

  // nodeId → top-level ancestor id, and → level-1 ancestor id (the child of a
  // top-level node it sits under, itself included). Grandchildren and deeper
  // resolve to the same level-1 ancestor — the roll-up.
  const topOf = new Map<string, string>();
  const levelOneOf = new Map<string, string>();
  const walk = (node: TreeBoardNode, topId: string, levelOneId: string | null) => {
    topOf.set(node.id, topId);
    if (levelOneId) levelOneOf.set(node.id, levelOneId);
    for (const child of node.children ?? []) {
      walk(child, topId, levelOneId ?? child.id);
    }
  };
  for (const node of nodes) walk(node, node.id, null);

  const lanes: BoardLane[] = nodes.map((node) => ({
    value: node.id,
    label: node.label,
    visual: node.visual,
    // Hand-pinned widths carry over; SectionsView applies them only while the
    // tile is expanded.
    span: pinnedSpan(node.span),
  }));
  lanes.push({ value: TREE_UNGROUPED, label: ungroupedLabel, isNone: true });

  // Unknown ids fall into the ungrouped lane too — a row pointing at a node
  // deleted mid-flight must land somewhere, or the board contract ("lanes
  // must cover every laneOf value") silently drops it from the screen.
  const laneOf = (row: TData): string[] => {
    const id = nodeIdOf(row);
    return [id ? (topOf.get(id) ?? TREE_UNGROUPED) : TREE_UNGROUPED];
  };

  const childLanes: BoardLane[] = [];
  const parentsWithChildren = new Set<string>();
  for (const node of nodes) {
    if (!node.children?.length) continue;
    parentsWithChildren.add(node.id);
    for (const child of node.children) {
      childLanes.push({
        value: child.id,
        label: child.label,
        visual: child.visual,
        span: pinnedSpan(child.span),
        // Scopes the empty-lane rescue: every child lane is declared once,
        // globally, and appears under the right parent only because it is
        // empty everywhere else — so "keep empties" has to name the parent.
        parentValue: keepEmptyChildren ? node.id : undefined,
      });
    }
  }

  let subGroups: GroupingLevel<TData>[] | undefined;
  if (childLanes.length > 0) {
    // One dashed lane per nested parent. The values are unique (keyed by
    // parent id) even though the labels repeat — each renders only inside its
    // own parent, since inner levels drop empty lanes.
    for (const parentId of parentsWithChildren) {
      childLanes.push({ value: treeLooseLane(parentId), label: looseLabel, isNone: true });
    }
    subGroups = [
      {
        lanes: childLanes,
        laneOf: (row: TData) => {
          const id = nodeIdOf(row);
          if (!id) return [];
          const levelOne = levelOneOf.get(id);
          if (levelOne) return [levelOne];
          return parentsWithChildren.has(id) ? [treeLooseLane(id)] : [];
        },
        groupLabel: subGroupLabel,
      },
    ];
  }

  return { lanes, laneOf, subGroups, groupLabel };
}
