import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@bcl32/utils/cn";
import type { TrieNode } from "./shortcutTrie";
import type { SequenceActivation } from "./useShortcutSequencer";

const kbdClass =
  "shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground";

const entryClass =
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm " +
  "hover:bg-accent hover:text-accent-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface SequenceHUDProps {
  /** Keys typed so far; "" while idle. */
  path: string;
  /** Trie node `path` points at. */
  node: TrieNode;
  activation: SequenceActivation | null;
  /** Delay before the panel appears once a prefix goes live. `0` shows it immediately. */
  delayMs?: number;
  /** Same walk as typing the key. */
  enterKey: (key: string) => void;
}

/**
 * Which-key style bottom panel listing every continuation of the typed prefix.
 * Portalled to `document.body` so no transformed ancestor can capture the
 * `fixed` positioning.
 */
export function SequenceHUD({ path, node, activation, delayMs = 200, enterKey }: SequenceHUDProps) {
  const eligible = activation === "typed" && path !== "" && node.children.size > 0;
  const [ready, setReady] = React.useState(false);
  const [entered, setEntered] = React.useState(false);

  // The delay is spent once per sequence: `ready` is never lowered while the
  // sequence stays alive, so drilling a level deeper does not blink the panel
  // away. A sequence that resolves or dies inside the delay never shows it.
  React.useEffect(() => {
    if (!eligible) {
      setReady(false);
      return;
    }
    if (delayMs <= 0) {
      setReady(true);
      return;
    }
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [eligible, path, delayMs]);

  // A transition needs a frame in the "before" state to animate from; the
  // motion-reduce classes pin the final state so that frame is never visible
  // to someone who asked for no motion.
  React.useEffect(() => {
    if (!ready) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  if (!eligible || !ready) return null;

  const children = [...node.children.values()];
  // Derived interior nodes are labelled with their own key (no prefixLabels
  // entry), which the breadcrumb already shows as a chip.
  const label = node.label && node.label !== node.key ? node.label : null;

  return createPortal(
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t-2 border-ring bg-popover text-popover-foreground shadow-lg",
        "motion-safe:transition motion-safe:duration-150",
        "motion-reduce:translate-y-0 motion-reduce:opacity-100",
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span className="flex shrink-0 items-center gap-1">
          {[...path].map((key, i) => (
            <kbd key={`${key}-${i}`} className={kbdClass}>
              {key}
            </kbd>
          ))}
        </span>
        {label && <span className="truncate text-popover-foreground">{label}</span>}
        <span className="ml-auto shrink-0">esc cancel</span>
      </div>
      <div className="grid max-h-[40vh] grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-1 overflow-y-auto p-2">
        {children.map((child) => {
          const Icon = child.icon;
          return (
            <button
              key={child.key}
              type="button"
              className={entryClass}
              // The sequencer resets a typed sequence on any window mousedown
              // (bubble phase), which would clear the path before this button's
              // click could walk it.
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => enterKey(child.key)}
            >
              <kbd className={kbdClass}>{child.key}</kbd>
              {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{child.label}</span>
              {child.children.size > 0 && (
                <span aria-hidden="true" className="ml-auto shrink-0 text-muted-foreground">
                  ›
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
