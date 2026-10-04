/**
 * Outline — a ROW tree drawn through the `sections` layout.
 *
 * `TreeBoard` is for a CONTAINER tree: curated sections that rows are filed
 * into, where a node is a heading and never a row. This is the other shape: a
 * tree whose nodes ARE rows — a task and its steps, a project and its
 * sub-projects — each one something you can tick, open and edit.
 *
 * The recipe needs no new layout. Feed the table `outlineRoots(tree, matching)`
 * (the top-level row of every row the filters let through), render each card
 * with `OutlineCard`, and the card draws the rest of the tree beneath its root.
 * Grouping, sorting and selection then act on top-level rows; the lines
 * beneath are the tree.
 *
 * Pure: no React. The tree is built from a flat list the page already holds,
 * so a filter never has to know about nesting — a step that matches brings its
 * whole tree with it.
 */

import type { RowData } from "@bcl32/data-utils";

/** A row tree: rows by id, and each parent's children in display order. The
 *  `null` key holds the top level. */
export interface RowTree<TData> {
  byId: Map<string, TData>;
  children: Map<string | null, TData[]>;
  /** The id a row's parent resolved to — null at the top level, including
   *  for a row whose parent is missing from the list. */
  parentIdOf: (row: TData) => string | null;
}

export interface RowTreeOptions<TData> {
  /** The row's parent id, as stored — `parent_task_id`, `parent_project_id`. */
  parentId: (row: TData) => string | null | undefined;
  /** Sibling order. Defaults to the order rows arrived in. */
  compare?: (a: TData, b: TData) => number;
}

const idOf = (row: RowData): string => String(row.id);

/**
 * Build the tree in one pass. A row whose parent is not in the list (a stale
 * cache, a deleted parent) is placed at the top level rather than lost.
 */
export function buildRowTree<TData extends RowData>(
  rows: readonly TData[] | null | undefined,
  options: RowTreeOptions<TData>,
): RowTree<TData> {
  const byId = new Map<string, TData>();
  for (const row of rows ?? []) byId.set(idOf(row), row);
  const parentIdOf = (row: TData): string | null => {
    const raw = options.parentId(row);
    const pid = raw == null ? null : String(raw);
    return pid !== null && pid !== idOf(row) && byId.has(pid) ? pid : null;
  };
  const children = new Map<string | null, TData[]>();
  for (const row of byId.values()) {
    const key = parentIdOf(row);
    const list = children.get(key);
    if (list) list.push(row);
    else children.set(key, [row]);
  }
  if (options.compare) for (const list of children.values()) list.sort(options.compare);
  return { byId, children, parentIdOf };
}

/** A row's direct children, in order; `[]` for none. */
export function childrenOf<TData>(tree: RowTree<TData>, id: string | null): TData[] {
  return tree.children.get(id) ?? [];
}

/** The parent row, or null at the top level. */
export function parentRowOf<TData>(tree: RowTree<TData>, row: TData): TData | null {
  const pid = tree.parentIdOf(row);
  return pid === null ? null : tree.byId.get(pid) ?? null;
}

/** Top-level ancestor first, the immediate parent last. Cycle-safe. */
export function ancestorsOf<TData extends RowData>(tree: RowTree<TData>, row: TData): TData[] {
  const out: TData[] = [];
  const seen = new Set<string>([idOf(row)]);
  let cursor = parentRowOf(tree, row);
  while (cursor && !seen.has(idOf(cursor))) {
    seen.add(idOf(cursor));
    out.unshift(cursor);
    cursor = parentRowOf(tree, cursor);
  }
  return out;
}

/** Every row below `id`, at every depth, in reading order. */
export function descendantsOf<TData extends RowData>(tree: RowTree<TData>, id: string): TData[] {
  return outlineLines(tree, id).map((line) => line.row);
}

/** The top-level row a row sits under — itself at the top level. */
export function topOf<TData extends RowData>(tree: RowTree<TData>, row: TData): TData {
  return ancestorsOf(tree, row)[0] ?? row;
}

/**
 * The Outline view's table rows: the top-level row of every match, once each,
 * in the order the matches arrived (so the table's own sort still decides).
 */
export function outlineRoots<TData extends RowData>(
  tree: RowTree<TData>,
  matching: readonly TData[] | null | undefined,
): TData[] {
  const seen = new Set<string>();
  const out: TData[] = [];
  for (const row of matching ?? []) {
    const top = topOf(tree, tree.byId.get(idOf(row)) ?? row);
    const id = idOf(top);
    if (!seen.has(id)) {
      seen.add(id);
      out.push(top);
    }
  }
  return out;
}

export interface OutlineLine<TData> {
  row: TData;
  /** Levels below the card's root: 1 is a direct child. */
  depth: number;
}

/**
 * The lines under `id`, depth-first, skipping the children of any id in
 * `collapsed` (the folded row itself is still listed). Cycle-safe.
 */
export function outlineLines<TData extends RowData>(
  tree: RowTree<TData>,
  id: string,
  collapsed: ReadonlySet<string> = new Set(),
): OutlineLine<TData>[] {
  const out: OutlineLine<TData>[] = [];
  const seen = new Set<string>([id]);
  const walk = (pid: string, depth: number) => {
    for (const row of childrenOf(tree, pid)) {
      const rid = idOf(row);
      if (seen.has(rid)) continue;
      seen.add(rid);
      out.push({ row, depth });
      if (!collapsed.has(rid)) walk(rid, depth + 1);
    }
  };
  walk(id, 1);
  return out;
}

/** A row's figures at three reaches. */
export interface Rollup<TStats> {
  /** The row alone. */
  own: TStats;
  /** Everything beneath it, the row excluded — `null` when it has no children. */
  below: TStats | null;
  /** The row and everything beneath it. */
  deep: TStats;
}

export interface RollupOptions<TData, TStats> {
  /** What one row contributes on its own. */
  own: (row: TData) => TStats;
  /** Combine two results. Must be associative; it is applied left to right. */
  merge: (a: TStats, b: TStats) => TStats;
}

/**
 * Roll every row's figures up through the tree — Print-Tracker's sections
 * `statsDeep`, for a row tree. Computed once for the whole list, so a card
 * reads its numbers instead of walking its branch on every render.
 *
 * `below` is the figure a record tree usually wants on a parent ("7 of 12
 * steps"), since the parent is itself one of the rows; `deep` is the one a
 * container-like total wants (a project's parts plus its sub-projects').
 */
export function rollupTree<TData extends RowData, TStats>(
  tree: RowTree<TData>,
  options: RollupOptions<TData, TStats>,
): Map<string, Rollup<TStats>> {
  const out = new Map<string, Rollup<TStats>>();
  const visiting = new Set<string>();
  const visit = (row: TData): Rollup<TStats> => {
    const id = idOf(row);
    const done = out.get(id);
    if (done) return done;
    visiting.add(id);
    const own = options.own(row);
    let below: TStats | null = null;
    for (const child of childrenOf(tree, id)) {
      if (visiting.has(idOf(child))) continue;
      const deep = visit(child).deep;
      below = below === null ? deep : options.merge(below, deep);
    }
    visiting.delete(id);
    const result = { own, below, deep: below === null ? own : options.merge(own, below) };
    out.set(id, result);
    return result;
  };
  for (const row of tree.byId.values()) visit(row);
  return out;
}
