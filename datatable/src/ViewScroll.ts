/**
 * Scroll-position hand-off between a DataTable's layouts.
 *
 * Every layout renders the same sorted row model, so a scroll position can be
 * expressed as "the index of the topmost visible row" and re-applied after a
 * view toggle — even though they lay those rows out completely differently (one
 * row per line, `cols` cards per line, lanes of cards, a docked list). Without
 * this, toggling always dumped you back at the top.
 *
 * Written when there were two layouts; there are five now, and the same
 * contract carries all of them.
 */
import type React from "react";

/** Stamped by every layout on every rendered row, card, tile or list item — the
 *  table, the card grid, the gallery, the board and the detail pane's list.
 *  Always the index into the *row model*, never a layout-local position: the
 *  board can draw one row in several lanes, and it carries `BOARD_POS_ATTR` for
 *  its own cursor precisely so this one stays comparable across layouts. */
export const ROW_INDEX_ATTR = "data-row-index";

/** Marks the element owning a set of `ROW_INDEX_ATTR` nodes. A DataTable
 *  rendered inside an expansion panel stamps its own rows with the same
 *  attribute, so "is this row mine?" has to be answered by scope, not selector. */
export const ROW_SCOPE_ATTR = "data-row-scope";

export interface ViewScrollHandle {
  /** Index (into the current sorted row model) of the topmost visible row, or
   *  null when nothing is rendered. */
  getFirstVisibleRowIndex: () => number | null;
  /** Bring `index` to the top of the scroll region. */
  scrollToRowIndex: (index: number) => void;
}

/**
 * A pending one-shot restore, handed from DataTable to whichever layout mounts
 * next. A ref rather than state: consuming it must not trigger a render, and
 * the value is written from an event handler during the same tick that swaps
 * the layout.
 */
export type ScrollRestoreRef = React.MutableRefObject<number | null>;

export function firstVisibleRowIndex(
  scope: HTMLElement | null,
  scrollEl: HTMLElement | null
): number | null {
  if (!scope || !scrollEl) return null;
  const top = scrollEl.getBoundingClientRect().top;
  const nodes = scope.querySelectorAll<HTMLElement>(`[${ROW_INDEX_ATTR}]`);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.closest(`[${ROW_SCOPE_ATTR}]`) !== scope) continue; // nested table
    // 1px of slack: a row parked exactly at the top rounds either way.
    if (node.getBoundingClientRect().bottom > top + 1) {
      const index = Number(node.dataset.rowIndex);
      return Number.isFinite(index) ? index : null;
    }
  }
  return null;
}

/**
 * Scroll a rendered row to the top of `scrollEl` by adjusting scrollTop
 * directly. `scrollIntoView` would do the same thing but also walks up and
 * scrolls every ancestor, yanking the whole page.
 */
/** Minimal scroll to bring an already-rendered node fully inside `scrollEl` —
 *  nothing happens when it is visible already. */
export function ensureVisibleWithin(
  node: HTMLElement | null,
  scrollEl: HTMLElement | null
): void {
  if (!node || !scrollEl) return;
  const n = node.getBoundingClientRect();
  const s = scrollEl.getBoundingClientRect();
  if (n.top < s.top) scrollEl.scrollTop += n.top - s.top;
  else if (n.bottom > s.bottom) scrollEl.scrollTop += n.bottom - s.bottom;
}

export function scrollRenderedRowToTop(
  scope: HTMLElement | null,
  scrollEl: HTMLElement | null,
  index: number
): void {
  const node = scope?.querySelector<HTMLElement>(`[${ROW_INDEX_ATTR}="${index}"]`);
  if (!node || !scrollEl) return;
  scrollEl.scrollTop +=
    node.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top;
}
