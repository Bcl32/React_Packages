import * as React from "react";

/**
 * Marks a filter search input as a jump target. `FilterSearchBar` sets it; the
 * hotkey below is the only thing that reads it. A data attribute rather than a
 * registry context because the bars are mounted by `useDataTableFilterBar` deep
 * inside whatever page happens to be on screen — there is no single React
 * subtree that sees all of them, and every consumer app would otherwise need a
 * provider at its root just to make one keystroke work.
 */
export const FILTER_SEARCH_ATTR = "data-filter-search";
const TARGET_SELECTOR = `[${FILTER_SEARCH_ATTR}]`;

/** Bare keys typed inside one of these belong to the field, not to the app. */
const TYPING_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/**
 * Landing highlight. Written as literal class names so Tailwind's scanner
 * picks them up from this file — they are applied imperatively and so appear
 * nowhere in any JSX. `ring-primary` deliberately differs from the `ring-ring`
 * the Input already shows on focus, so the flash reads as "you were moved
 * here" rather than as ordinary focus.
 */
const FLASH_CLASSES = ["ring-2", "ring-primary", "ring-offset-2"];
const FLASH_MS = 900;

const flashTimers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/**
 * Exported for FilterTargeting, which lands on a filter card rather than a
 * search box but owes the user the same "you were moved here" cue. It lives
 * here rather than in a shared module so FLASH_CLASSES is written out exactly
 * once — those class names only exist because Tailwind's scanner reads them
 * from this file, and a second copy would be a second thing to keep in sync.
 */
export function flash(el: HTMLElement): void {
  const pending = flashTimers.get(el);
  if (pending) clearTimeout(pending);
  el.classList.add(...FLASH_CLASSES);
  flashTimers.set(
    el,
    setTimeout(() => {
      el.classList.remove(...FLASH_CLASSES);
      flashTimers.delete(el);
    }, FLASH_MS),
  );
}

/**
 * Where to look for jump targets.
 *
 * With a modal open, only the modal counts: several pages mount a picker table
 * (part pickers, the part-set wizard) with its own filter search inside a
 * dialog, and those should be reachable — but a bar on the page *behind* the
 * modal must never steal focus out of it.
 *
 * Exported because FilterTargeting has to make the identical call about filter
 * *bars* — one rule for "which layer of the page is live", not two that can
 * disagree.
 */
export function topmostFilterRoot(): ParentNode {
  const dialogs = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][data-state="open"]',
  );
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : document;
}

/**
 * Every jump target currently on screen, ordered top-to-bottom then
 * left-to-right — visual order, which is what "the next one" means to someone
 * looking at a detail page with three tables stacked down it. Document order
 * would usually agree but is not guaranteed to.
 */
function visibleTargets(): HTMLElement[] {
  return Array.from(topmostFilterRoot().querySelectorAll<HTMLElement>(TARGET_SELECTOR))
    .filter((el) => el.getClientRects().length > 0)
    .sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return ra.top - rb.top || ra.left - rb.left;
    });
}

/**
 * Where focus was when the hotkey first pulled it into a filter bar, so Escape
 * can put it back. Cleared once spent — a stale reference would hand focus to
 * an unrelated element on a later Escape.
 */
let returnFocusTo: HTMLElement | null = null;

/**
 * Focus a filter search box, advancing to the next one if a box already holds
 * focus. Returns false when the page has none, which lets the caller leave the
 * keystroke alone (Firefox's quick-find still works on pages without a table).
 *
 * Exported for the command palette, which offers this as a normal command so
 * the shortcut is discoverable without already knowing it.
 */
export function focusFilterSearch(): boolean {
  const targets = visibleTargets();
  if (targets.length === 0) return false;

  const active = document.activeElement as HTMLElement | null;
  const current = targets.findIndex((el) => el === active);
  let next: HTMLElement;
  if (current >= 0) {
    next = targets[(current + 1) % targets.length];
  } else {
    // First press: the bar nearest the top of the viewport, which on a long
    // detail page is the table you are actually looking at. Everything scrolled
    // past falls back to the first.
    next = targets.find((el) => el.getBoundingClientRect().top >= 0) ?? targets[0];
    if (active && active !== document.body) returnFocusTo = active;
  }

  // focus() alone would jump-scroll; scrollIntoView does it smoothly and
  // "nearest" keeps an already-visible bar from moving at all.
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: "nearest", behavior: "smooth" });
  flash(next);
  return true;
}

/**
 * Step back out of a filter search box, restoring whatever had focus before the
 * hotkey took it. Called by `FilterSearchBar` on Escape with an empty query.
 */
export function releaseFilterSearch(el: HTMLElement | null): void {
  el?.blur();
  const target = returnFocusTo;
  returnFocusTo = null;
  if (target?.isConnected) target.focus({ preventScroll: true });
}

export interface FilterSearchHotkeyOptions {
  /** The key to bind. Default "/". */
  key?: string;
  /** Set false to unbind, e.g. behind a user preference. */
  enabled?: boolean;
}

/**
 * Binds a global "jump to the filter search box" key. Mount once, at the app
 * layout.
 *
 * Pressing it repeatedly cycles through the page's filter bars. That works
 * because an *empty* filter search box lets the key through instead of typing
 * it — once you have typed something, `/` is just a character again, so
 * searching for a value containing a slash still behaves.
 */
export function useFilterSearchHotkey({
  key = "/",
  enabled = true,
}: FilterSearchHotkeyOptions = {}): void {
  React.useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;

      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === "function") {
        const inTarget = target.matches(TARGET_SELECTOR);
        if (inTarget && (target as HTMLInputElement).value !== "") return;
        if (!inTarget && target.closest(TYPING_SELECTOR)) return;
      }

      if (focusFilterSearch()) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, enabled]);
}
