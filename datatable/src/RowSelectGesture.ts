import type { Row, Table } from "@tanstack/react-table";

/**
 * Shift-click and Ctrl/Cmd-click selection, for every layout.
 *
 * The file manager's grammar, applied to rows:
 *
 * - **Ctrl/Cmd-click** toggles one row and makes it the anchor.
 * - **Shift-click** selects every row from the anchor to the clicked one,
 *   inclusive, ADDING to the selection (the anchor stays put, so a second
 *   shift-click re-ranges from the same place). With no anchor yet it behaves
 *   like Ctrl-click.
 * - A plain checkbox tick also sets the anchor (`noteSelectionAnchor`).
 * - A plain click is not a selection gesture: it stays the row's click
 *   (`rowClickFunction`, expansion).
 *
 * "From the anchor to the clicked one" means in the order the rows are DRAWN.
 * Every rendered row carries `data-row-id`; when both ends are on screen in
 * one container, the range is read off the DOM, so a grouped layout (sections,
 * board) ranges down what you can see rather than through the underlying sort.
 * Otherwise — a virtualized list scrolled away from the anchor — it falls back
 * to the table's row model, which is what a flat list draws anyway.
 *
 * The anchor is kept per table instance, in a WeakMap, so no layout has to
 * carry it and a remounted table starts fresh.
 */

/** The attribute every rendered row carries — a card's wrapper, a table `<tr>`. */
export const ROW_ID_ATTR = "data-row-id";

const anchors = new WeakMap<object, string>();

/** The table a row belongs to. TanStack rows do not expose it, but every
 *  cell's render context does — and that is reachable from any row. */
function tableOf<TData>(row: Row<TData>): Table<TData> | undefined {
  return row.getAllCells()[0]?.getContext().table;
}

/** Record `row` as the anchor — after a plain checkbox tick, say. */
export function noteSelectionAnchor<TData>(row: Row<TData>): void {
  const table = tableOf(row);
  if (table) anchors.set(table, row.id);
}

/** Row ids in drawn order, read from the closest container holding both ends. */
function drawnOrder(from: Element | null, anchorId: string, targetId: string): string[] | null {
  for (let el = from?.parentElement ?? null; el; el = el.parentElement) {
    const found = el.querySelectorAll(`[${ROW_ID_ATTR}]`);
    if (found.length < 2) continue;
    const ids = Array.from(found, (node) => node.getAttribute(ROW_ID_ATTR) ?? "");
    if (ids.includes(anchorId) && ids.includes(targetId)) return ids;
  }
  return null;
}

export interface SelectionGestureEvent {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  /** The element the row is drawn as — where a drawn-order range starts. */
  currentTarget?: EventTarget | null;
}

/**
 * Apply a modifier-click to the selection. Returns true when the click WAS a
 * selection gesture (the caller then skips its ordinary click), false when it
 * was a plain click.
 */
export function applySelectionGesture<TData>(
  row: Row<TData>,
  event: SelectionGestureEvent,
): boolean {
  const additive = event.metaKey || event.ctrlKey;
  if (!event.shiftKey && !additive) return false;
  const table = tableOf(row);
  if (!table || !row.getCanSelect()) return false;

  const anchorId = anchors.get(table);
  if (event.shiftKey && anchorId && anchorId !== row.id) {
    // `Element` exists only where there is a DOM — not in node tests or SSR.
    const element =
      typeof Element !== "undefined" && event.currentTarget instanceof Element
        ? event.currentTarget
        : null;
    const order =
      drawnOrder(element, anchorId, row.id) ?? table.getRowModel().rows.map((r) => r.id);
    const a = order.indexOf(anchorId);
    const b = order.indexOf(row.id);
    if (a >= 0 && b >= 0) {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const range = order.slice(lo, hi + 1);
      table.setRowSelection((prev) => {
        const next = { ...prev };
        for (const id of range) next[id] = true;
        return next;
      });
      return true;
    }
  }
  row.toggleSelected();
  anchors.set(table, row.id);
  return true;
}

/** Keep a shift-click from extending the page's TEXT selection across rows. */
export function preventShiftTextSelection(event: { shiftKey: boolean; preventDefault: () => void }) {
  if (event.shiftKey) event.preventDefault();
}
