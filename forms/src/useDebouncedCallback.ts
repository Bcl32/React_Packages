import * as React from "react";

/**
 * Debounce a callback by `delay` ms. Returns the debounced wrapper plus a
 * `flush` that runs any pending call immediately. The latest args win.
 *
 * Lifted from the 500ms setTimeout-in-effect idiom used by the filters
 * package (DebouncedTextFilter) so editable fields can auto-save without
 * firing a request per keystroke. Pending work is flushed on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 500,
): { debounced: (...args: A) => void; flush: () => void; cancel: () => void } {
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgs = React.useRef<A | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const flush = React.useCallback(() => {
    clear();
    if (pendingArgs.current) {
      const args = pendingArgs.current;
      pendingArgs.current = null;
      fnRef.current(...args);
    }
  }, [clear]);

  const cancel = React.useCallback(() => {
    clear();
    pendingArgs.current = null;
  }, [clear]);

  const debounced = React.useCallback(
    (...args: A) => {
      pendingArgs.current = args;
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        if (pendingArgs.current) {
          const a = pendingArgs.current;
          pendingArgs.current = null;
          fnRef.current(...a);
        }
      }, delay);
    },
    [clear, delay],
  );

  // Flush any pending call when the component unmounts.
  React.useEffect(() => flush, [flush]);

  return { debounced, flush, cancel };
}
