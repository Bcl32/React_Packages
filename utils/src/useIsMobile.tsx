import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile(): boolean {
  // Read synchronously on first render. Seeding this from `undefined` and
  // filling it in from an effect makes every mobile-conditional layout paint
  // its desktop variant for one frame and then reflow — visible as a flash on
  // anything that swaps layout (not just visibility) on the mobile branch.
  const [isMobile, setIsMobile] = React.useState<boolean>(readIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(readIsMobile());
    mql.addEventListener("change", onChange);
    // Re-read on mount: a resize between the render and this effect would
    // otherwise be missed.
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
