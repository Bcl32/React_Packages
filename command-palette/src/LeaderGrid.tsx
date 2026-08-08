import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@bcl32/utils/cn";
import type { TrieNode } from "./shortcutTrie";

const kbdClass =
  "shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground";

const cardClass =
  "flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm " +
  "hover:bg-accent hover:text-accent-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface LeaderGridProps {
  /** True while the sequencer's activation is "leader". */
  open: boolean;
  /** Keys walked so far below the root. */
  path: string;
  /** Trie node `path` points at. */
  node: TrieNode;
  /** Breadcrumb label for the root level. */
  rootLabel: string;
  /** Same walk as typing the key. */
  enterKey: (key: string) => void;
  /** Overlay click, Escape, or any other Radix-initiated close. */
  onClose: () => void;
}

/**
 * Centred menu of the current trie level, opened by the leader key. Keys are
 * handled globally by the sequencer (including Backspace to pop a level), so
 * this component only renders the level and turns clicks into key walks.
 */
export function LeaderGrid({ open, path, node, rootLabel, enterKey, onClose }: LeaderGridProps) {
  const children = [...node.children.values()];
  const label = node.label && node.label !== node.key ? node.label : null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[15%] z-50 w-[90vw] max-w-xl -translate-x-1/2",
            "overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
          )}
          // The sequencer owns every key while this is open, so the dialog must
          // not move focus: taking it would ring an arbitrary card and make
          // Space/Enter run it, and handing focus back on close would land
          // AFTER a search alias has already focused the palette input.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Shortcut menu</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="shrink-0 text-sm text-popover-foreground">{rootLabel}</span>
            {[...path].map((key, i) => (
              <React.Fragment key={`${key}-${i}`}>
                <span aria-hidden="true">›</span>
                <kbd className={kbdClass}>{key}</kbd>
              </React.Fragment>
            ))}
            {label && <span className="truncate">{label}</span>}
            <span className="ml-auto shrink-0">⌫ back · esc close</span>
          </div>
          <div className="grid max-h-[min(60vh,24rem)] grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2 overflow-y-auto p-3">
            {children.map((child) => {
              const Icon = child.icon;
              return (
                <button
                  key={child.key}
                  type="button"
                  className={cardClass}
                  // The sequencer's window mousedown listener only resets typed
                  // sequences, but stopping here keeps the leader path safe if
                  // that guard is ever widened.
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
            {children.length === 0 && (
              <p className="px-1 py-2 text-sm text-muted-foreground">No shortcuts here.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
