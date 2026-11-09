import { useEffect } from "react";

import { VIZ_CSS } from "./palette";

export interface VizStylesProps {
  /**
   * Which palette the page is showing. Omitted, the OS preference decides (the
   * media-query scope). Given, it is stamped on `<html data-viz-scheme>` and
   * wins over the OS both ways — pass your theme system's own classification,
   * e.g. `useTheme().theme_type` from @bcl32/themes.
   */
  scheme?: "light" | "dark";
}

/**
 * Mounts the `--viz-*` palette ONCE, on `:root`. Render it a single time near
 * the top of the app (beside the theme provider); every viz atom reads the
 * variables, so an atom rendered without it draws nothing coloured.
 *
 * The stylesheet is a constant text child — no innerHTML.
 */
export function VizStyles({ scheme }: VizStylesProps) {
  useEffect(() => {
    const root = document.documentElement;
    if (scheme) root.setAttribute("data-viz-scheme", scheme);
    else root.removeAttribute("data-viz-scheme");
    return () => root.removeAttribute("data-viz-scheme");
  }, [scheme]);
  return <style data-viz-styles="">{VIZ_CSS}</style>;
}
