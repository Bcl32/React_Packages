import * as React from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on a server. The same
 * behaviour where there is a DOM to measure, and no "useLayoutEffect does
 * nothing on the server" warning in a prerender. Chosen once, at module
 * load: `typeof window` cannot change during a process's life.
 */
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
