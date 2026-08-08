import { flash, focusFilterSearch, topmostFilterRoot } from "./FilterSearchHotkey";

/**
 * Marks a rendered filter card with the filter *key* it belongs to. `FilterElement`
 * sets it; the targeting below is the only thing that reads it. The key, not the
 * field name, because a user-added duplicate is "tags#2" and both cards are on
 * screen at once.
 */
export const FILTER_FIELD_ATTR = "data-filter-field";

/** Marks the shared chrome row so control-focus can skip its rule pill and ✕. */
export const FILTER_HEADER_ATTR = "data-filter-header";

/**
 * What a mounted filter bar lets the outside world do to it.
 *
 * A registry rather than the data-attribute trick `FilterSearchHotkey` uses,
 * because reaching a filter means calling React callbacks (`addFilter`,
 * `setOpen`) and not just moving focus. The motivation is the same though: bars
 * are mounted by `useDataTableFilterBar` deep inside whatever page is on
 * screen, so there is no React subtree that sees all of them and no consumer
 * should have to mount a provider at its root to make one keystroke work.
 */
export interface FilterBarHandle {
  /** The bar's panel element — decides visibility and scopes the card lookup. */
  element: () => HTMLElement | null;
  /** Expand the panel, so a filter revealed here is actually on screen. */
  reveal: () => void;
  /** Whether this bar could ever show `field` — mounted or addable. */
  hasField: (field: string) => boolean;
  /** The key of a mounted instance of `field`, or null if none is mounted. */
  keyForField: (field: string) => string | null;
  /** Mount `field`; returns its key, or null while the dataset stats are absent. */
  addField: (field: string) => string | null;
  /** Open the "+ Add filter" picker. */
  openAddPicker: () => void;
}

const bars = new Set<FilterBarHandle>();

/**
 * How long a request keeps trying before it is abandoned. Long enough for a
 * route change plus a cold list fetch, short enough that a mistyped sequence
 * cannot fire minutes later on a page the user has since walked to themselves.
 */
const REQUEST_TTL_MS = 8000;

type FilterRequest =
  | { kind: "field"; field: string }
  | { kind: "search" }
  | { kind: "add" };

interface PendingRequest {
  request: FilterRequest;
  /** Only act once the router has actually landed here. See `onRoute`. */
  path?: string;
  expiresAt: number;
}

/**
 * One at a time. A second shortcut typed before the first resolves means the
 * user changed their mind, so the newer request simply replaces the older.
 */
let pending: PendingRequest | null = null;

/**
 * Register a filter bar for the lifetime of its mount.
 *
 * Pumps on the way in: a request issued before this bar existed (the normal
 * case — the shortcut navigates here) is waiting for exactly this moment.
 */
export function registerFilterBar(handle: FilterBarHandle): () => void {
  bars.add(handle);
  pumpFilterRequests();
  return () => {
    bars.delete(handle);
  };
}

/**
 * Retry the pending request, if any.
 *
 * Every step of a request can legitimately fail on the first try — the page
 * hasn't navigated, the bar hasn't mounted, the dataset hasn't loaded so
 * `addField` returns null, the new card isn't in the DOM until React commits.
 * Rather than guess at delays, the bar calls this whenever the state any of
 * those depend on changes, and each attempt gets one step further.
 */
export function pumpFilterRequests(): void {
  if (!pending) return;
  if (Date.now() > pending.expiresAt) {
    pending = null;
    return;
  }
  if (pending.path && !onRoute(pending.path)) return;
  if (attempt(pending.request)) pending = null;
}

/** Reveal `field`'s filter and put the cursor in it. Adds it if not mounted. */
export function requestFilter(field: string, options: { path?: string } = {}): void {
  queue({ kind: "field", field }, options.path);
}

/** Focus the filter search box once the target page's bar is up. */
export function requestFilterSearch(options: { path?: string } = {}): void {
  queue({ kind: "search" }, options.path);
}

/** Open the "+ Add filter" picker once the target page's bar is up. */
export function requestAddFilter(options: { path?: string } = {}): void {
  queue({ kind: "add" }, options.path);
}

function queue(request: FilterRequest, path?: string): void {
  pending = { request, path, expiresAt: Date.now() + REQUEST_TTL_MS };
  // Deferred, never immediate. A shortcut navigates before it requests, and
  // `history.pushState` runs synchronously inside `navigate()` while React has
  // not re-rendered yet — so for one moment the URL says the new page while the
  // *old* page's bar is still mounted. Attempting there hands the request to
  // whichever bar the user was looking at, which for a field name two entities
  // share ("name", "tags") silently answers with the wrong entity. One turn of
  // the event loop is enough for the commit that unmounts it.
  setTimeout(pumpFilterRequests, 0);
}

/**
 * Whether the router has landed on the requested route yet.
 *
 * Suffix-matched because apps are served under a base path ("/print-tracker/"),
 * and a request that skipped this check would be serviced by whatever bar
 * happened to be on screen at the instant the key was pressed — several
 * entities share field names ("tags", "name"), so the wrong page would answer
 * for the right field.
 */
function onRoute(path: string): boolean {
  return window.location.pathname.replace(/\/+$/, "").endsWith(path.replace(/\/+$/, ""));
}

function attempt(request: FilterRequest): boolean {
  if (request.kind === "field") return openField(request.field);

  const bar = pickBar(() => true);
  if (!bar) return false;
  if (request.kind === "add") {
    bar.reveal();
    bar.openAddPicker();
    return true;
  }
  // Deferred to the pump rather than run from the shortcut's `perform`: the
  // leader grid is itself a `[role="dialog"]`, and `focusFilterSearch` scopes
  // itself to the topmost open one — called synchronously it would search
  // inside the grid and find nothing.
  return focusFilterSearch();
}

function openField(field: string): boolean {
  const bar = pickBar((candidate) => candidate.hasField(field));
  if (!bar) return false;

  bar.reveal();
  // Reuse a mounted instance rather than stacking a duplicate every time the
  // shortcut is pressed. `addField` returns null until the dataset's stats
  // exist, which is the usual reason a freshly-navigated page needs a retry.
  const key = bar.keyForField(field) ?? bar.addField(field);
  if (!key) return false;

  const card = bar
    .element()
    ?.querySelector<HTMLElement>(`[${FILTER_FIELD_ATTR}="${escapeAttr(key)}"]`);
  // Present in state but not yet committed to the DOM — the next pump, fired by
  // the render that adds it, will find it.
  if (!card) return false;

  card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  flash(card);
  focusControl(card);
  return true;
}

/**
 * The bar that should answer, or null to wait.
 *
 * Visible bars only, topmost first, and scoped to the same layer
 * `FilterSearchHotkey` uses — a picker table inside an open modal outranks the
 * page behind it. Because the caller has already navigated and `predicate`
 * screens on the field, no call site has to identify its entity: after landing
 * on /Parts, the Parts bar is the only visible one that knows "tags".
 */
function pickBar(predicate: (handle: FilterBarHandle) => boolean): FilterBarHandle | null {
  const root = topmostFilterRoot();
  const candidates: { handle: FilterBarHandle; rect: DOMRect }[] = [];
  for (const handle of bars) {
    const element = handle.element();
    if (!element || element.getClientRects().length === 0) continue;
    if (root !== document && !root.contains(element)) continue;
    if (!predicate(handle)) continue;
    candidates.push({ handle, rect: element.getBoundingClientRect() });
  }
  candidates.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
  return candidates[0]?.handle ?? null;
}

/**
 * Put the cursor where the user can start narrowing.
 *
 * Text entry first: a combobox opens its list on focus (see `Combobox`), so an
 * options filter lands ready to type a value. Chip toggles, toggle buttons and
 * the colour swatch grid have no field at all — their first button is the best
 * available landing spot, but only after skipping the shared header, whose rule
 * pill and ✕ come first in document order and would otherwise win.
 */
function focusControl(card: HTMLElement): void {
  const entry = card.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
  );
  if (entry) {
    entry.focus({ preventScroll: true });
    return;
  }
  const buttons = Array.from(card.querySelectorAll<HTMLElement>("button:not([disabled])"));
  buttons.find((button) => !button.closest(`[${FILTER_HEADER_ATTR}]`))?.focus({
    preventScroll: true,
  });
}

/** Filter keys are schema field names, but a dynamic instance is "tags#2". */
function escapeAttr(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}
