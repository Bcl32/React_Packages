import * as React from "react";

/**
 * Shared geometry for dropdowns that have to escape their container.
 *
 * Both the filter search box and the "Add filter" picker now live in the data
 * table's toolbar strip, which is `overflow-x-auto` so that an unbounded run of
 * active-filter chips scrolls instead of growing the header. An overflow box
 * clips its absolutely positioned descendants no matter how high their
 * z-index, so the only way either panel floats over the page is to portal it to
 * <body> — and once portalled it needs viewport coordinates rather than the
 * offsets it used to inherit from its parent.
 */

/** Distance between the anchor's edge and the panel. */
export const PANEL_GAP = 4;
/** Below this much room underneath, dropping downwards isn't worth it. */
export const PANEL_MIN_HEIGHT = 140;
/** Keep the panel this far off every viewport edge. */
export const VIEWPORT_MARGIN = 8;

/**
 * Fixed-position box pinned under (or over) `rect`.
 *
 * Height is capped to the space actually available, and the panel flips above
 * the anchor when the toolbar sits near the bottom of the window.
 */
export function anchoredPanelStyle(rect: DOMRect, width: number): React.CSSProperties {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const below = viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
  const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN;
  const flip = below < PANEL_MIN_HEIGHT && above > below;
  return {
    position: "fixed",
    width,
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, viewportWidth - width - VIEWPORT_MARGIN),
    ),
    ...(flip
      ? { bottom: viewportHeight - rect.top + PANEL_GAP, maxHeight: above }
      : { top: rect.bottom + PANEL_GAP, maxHeight: below }),
  };
}

/**
 * Track an element's viewport box while `active`.
 *
 * Scroll is captured so that scrolling *any* ancestor — the toolbar strip, the
 * page — re-anchors the panel, not just the window.
 */
export function useAnchorRect(
  ref: React.RefObject<HTMLElement>,
  active: boolean,
): DOMRect | null {
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null);

  React.useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = ref.current;
      if (el) setAnchor(el.getBoundingClientRect());
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [ref, active]);

  return anchor;
}
