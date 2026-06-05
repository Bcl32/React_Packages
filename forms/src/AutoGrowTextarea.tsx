import * as React from "react";

export interface AutoGrowTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

/**
 * A controlled textarea whose height tracks its content, so the box resizes
 * to the text instead of scrolling. No external dependency — it sets
 * `height = scrollHeight` whenever the value changes.
 */
export const AutoGrowTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoGrowTextareaProps
>(function AutoGrowTextarea({ value, className, rows = 1, ...rest }, ref) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
    },
    [ref],
  );

  const resize = React.useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Re-measure when the value changes (incl. external updates).
  React.useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={setRefs}
      rows={rows}
      value={value}
      onInput={resize}
      className={
        className ??
        "w-full resize-none overflow-hidden rounded-md border bg-background px-3 py-2 text-sm"
      }
      {...rest}
    />
  );
});
