import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@bcl32/utils/cn";
import { EntitySearchPage } from "./EntitySearchPage";
import { SequenceHUD } from "./SequenceHUD";
import { LeaderGrid } from "./LeaderGrid";
import { buildShortcutTrie } from "./shortcutTrie";
import type { TrieAction } from "./shortcutTrie";
import { useShortcutSequencer } from "./useShortcutSequencer";
import type { CommandEntry, SearchSource, ShortcutNode } from "./types";

// Statically replaced by the consuming bundler (Vite replaces the whole member
// expression), so no `process` reference survives into the browser.
declare const process: { env: { NODE_ENV?: string } };

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm " +
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground " +
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50";

const groupClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs " +
  "[&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

const badgeClass =
  "ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground";

/**
 * Number badge for the first 9 visible results, rendered from the
 * `data-palette-index` attribute stamped on `[cmdk-item]` nodes in visual
 * order (see the MutationObserver effect in CommandPalette). A ::before
 * pseudo-element is the first flex child, so the number lands left of the
 * icon/thumbnail/label; without the attribute the rules are inert.
 */
const numberBadgeClass =
  "data-[palette-index]:before:content-[attr(data-palette-index)] " +
  "data-[palette-index]:before:flex data-[palette-index]:before:h-4 data-[palette-index]:before:w-4 " +
  "data-[palette-index]:before:shrink-0 data-[palette-index]:before:items-center " +
  "data-[palette-index]:before:justify-center data-[palette-index]:before:rounded " +
  "data-[palette-index]:before:border data-[palette-index]:before:border-border " +
  "data-[palette-index]:before:bg-muted data-[palette-index]:before:font-mono " +
  "data-[palette-index]:before:text-[10px] data-[palette-index]:before:text-muted-foreground";

// Stable identities: these feed the trie memo, which warns in dev on every
// rebuild, so a fresh `[]`/`{}` per render would rebuild (and warn) endlessly.
const NO_TREES: ShortcutNode[] = [];
const NO_PREFIX_LABELS: Record<string, string> = {};

export interface CommandPaletteProps {
  commands: CommandEntry[];
  searchSources?: SearchSource[];
  /** Key pressed with ctrl/cmd to toggle the palette. Default "k". */
  hotkey?: string;
  placeholder?: string;
  /**
   * Listen for bare alias key sequences while the palette is closed
   * (e.g. `g` `d` → Dashboard). Default `true`.
   */
  enableGlobalAliases?: boolean;
  /**
   * Number the first 9 visible results (badges 1–9 in visual order) and run
   * the Nth one on Shift+1..9 while the palette is open. Default `true`.
   */
  enableNumberedResults?: boolean;
  /** Explicit shortcut branches merged into the trie root (e.g. a filter tree). */
  shortcutTrees?: ShortcutNode[];
  /** Visualize typed sequences with a bottom HUD. Default "hud". */
  sequenceHints?: "off" | "hud";
  /** Delay before the HUD appears after an unresolved prefix. Default 200. */
  hintDelayMs?: number;
  /** Single non-alphanumeric key that opens the leader grid. Default undefined (disabled). */
  leaderKey?: string;
  /** Labels for derived interior nodes, keyed by prefix string: `{ g: "Go to page" }`. */
  prefixLabels?: Record<string, string>;
}

export function CommandPalette({
  commands,
  searchSources = [],
  hotkey = "k",
  placeholder = "Type a command or search…",
  enableGlobalAliases = true,
  enableNumberedResults = true,
  shortcutTrees = NO_TREES,
  sequenceHints = "hud",
  hintDelayMs = 200,
  leaderKey,
  prefixLabels = NO_PREFIX_LABELS,
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState<string | null>(null);
  const navigate = useNavigate();
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // Global toggle: Ctrl/Cmd+<hotkey>. vimBindings is disabled below so ctrl+k
  // reaching this listener while open acts as close (toggle semantics).
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        !e.repeat &&
        e.key.toLowerCase() === hotkey
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkey]);

  // Reset transient state on close.
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(null);
    }
  }, [open]);

  // Numbered results: stamp data-palette-index="1..9" on the first 9 visible
  // enabled items in VISUAL order. cmdk's sort physically re-appendChilds item
  // nodes in score order (document order = visual order) inside a scheduled
  // layout effect, so a plain React effect would race it — a MutationObserver
  // on the list fires after each reorder, before paint. No feedback loop: we
  // only write data-palette-index, which the observer doesn't watch.
  //
  // A callback ref (not an effect keyed on `open`): Radix's Portal mounts the
  // dialog content one render pass after `open` flips, so at effect time on
  // the opening commit the list node doesn't exist yet. The callback ref runs
  // exactly when the node attaches, and with `null` on detach (cleanup).
  const observerRef = React.useRef<MutationObserver | null>(null);
  const attachList = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || !enableNumberedResults) return;
      const stamp = () => {
        const items = node.querySelectorAll<HTMLElement>(
          '[cmdk-item=""]:not([aria-disabled="true"])'
        );
        items.forEach((el, i) => {
          if (i < 9) el.setAttribute("data-palette-index", String(i + 1));
          else el.removeAttribute("data-palette-index");
        });
        node
          .querySelectorAll<HTMLElement>('[cmdk-item=""][aria-disabled="true"][data-palette-index]')
          .forEach((el) => el.removeAttribute("data-palette-index"));
      };
      stamp();
      const observer = new MutationObserver(stamp);
      observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["aria-disabled"],
      });
      observerRef.current = observer;
    },
    [enableNumberedResults]
  );

  const activeSource = page ? searchSources.find((s) => s.key === page) : undefined;

  const grouped = React.useMemo(() => {
    const map = new Map<string, CommandEntry[]>();
    for (const entry of commands) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return [...map.entries()];
  }, [commands]);

  const runEntry = (entry: CommandEntry) => {
    setOpen(false);
    if (entry.perform) entry.perform();
    else if (entry.to) navigate(entry.to);
  };

  // --- Key sequences --------------------------------------------------------

  const openSearchPage = (source: SearchSource, seed: string) => {
    setPage(source.key);
    setSearch(seed);
    setOpen(true);
  };

  /** Dev-only duplicate/prefix-conflict warnings are a side effect of building. */
  const trie = React.useMemo(
    () => buildShortcutTrie({ commands, searchSources, shortcutTrees, prefixLabels }),
    [commands, searchSources, shortcutTrees, prefixLabels]
  );

  const run = (action: TrieAction) => {
    if (action.kind === "source") openSearchPage(action.source, "");
    else if (action.kind === "command") runEntry(action.entry);
    else if (action.node.perform) action.node.perform();
    else if (action.node.to) navigate(action.node.to);
  };

  // Simplification per design: expiry is disabled for the whole hinted mode,
  // including the pre-delay window before the HUD actually paints.
  const hintsVisible = sequenceHints !== "off";

  const seq = useShortcutSequencer({
    trie,
    enableTyped: enableGlobalAliases,
    leaderKey,
    suspended: open,
    hintsVisible,
    run,
  });

  // Opening the palette abandons any live sequence or leader menu.
  const resetSequencer = seq.reset;
  React.useEffect(() => {
    if (open) resetSequencer();
  }, [open, resetSequencer]);

  // Dev-only: a leader key that is also a sequence key is unreachable as one.
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!leaderKey) return;
    if (/^[a-z0-9]$/i.test(leaderKey)) {
      console.warn(
        `[command-palette] leaderKey "${leaderKey}" is alphanumeric, so it shadows the first key of ` +
          `every alias sequence starting with it. Use a punctuation key such as ".".`
      );
    } else if (trie.children.has(leaderKey.toLowerCase())) {
      console.warn(
        `[command-palette] leaderKey "${leaderKey}" collides with a root shortcut key of the same name.`
      );
    }
  }, [leaderKey, trie]);

  /**
   * Tab at the root: `<alias>` runs a command, `<alias> <rest>` opens a search
   * page seeded with `<rest>`. Always swallowed so focus stays in the input.
   */
  const handleRootTab = () => {
    const tokens = search.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;
    const token = tokens[0].toLowerCase();
    const remainder = tokens.slice(1).join(" ");
    const source = searchSources.find((s) => s.alias?.toLowerCase() === token);
    if (source) {
      openSearchPage(source, remainder);
      return;
    }
    if (remainder) return;
    const entry = commands.find((c) => c.alias?.toLowerCase() === token);
    if (entry) runEntry(entry);
  };

  // The root node has no key of its own, so its breadcrumb label comes from the
  // prefixLabels entry for the empty prefix.
  const rootLabel = prefixLabels[""] ?? "Shortcuts";

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            aria-describedby={undefined}
            className={cn(
              "fixed left-1/2 top-[15%] z-50 w-[90vw] max-w-xl -translate-x-1/2",
              "overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
            )}
            // MANDATORY: Escape pops a page instead of closing when a page is open.
            onEscapeKeyDown={(e) => {
              if (page) {
                e.preventDefault();
                setPage(null);
                setSearch("");
              }
            }}
            // MANDATORY: keep Ctrl+B from reaching the window-level sidebar toggle while typing here.
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") e.stopPropagation();
            }}
          >
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <Command
              label="Command palette"
              loop
              vimBindings={false}
              // Server pages filter on the backend; client pages + root use cmdk scoring.
              shouldFilter={!activeSource || activeSource.mode === "client"}
              // MANDATORY: Backspace on empty input pops the page (cmdk README pattern).
              onKeyDown={(e) => {
                // Shift+1..9 runs the Nth visible result. e.code, not e.key —
                // shift mutates the produced character (Digit3 types "#").
                // preventDefault even when fewer than N results exist so the
                // symbol never leaks into the search input.
                if (enableNumberedResults && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  const digit = /^Digit([1-9])$/.exec(e.code);
                  if (digit) {
                    e.preventDefault();
                    e.stopPropagation();
                    listRef.current
                      ?.querySelector<HTMLElement>(`[cmdk-item=""][data-palette-index="${digit[1]}"]`)
                      ?.click();
                    return;
                  }
                }
                if (e.key === "Backspace" && !search && page) {
                  e.preventDefault();
                  setPage(null);
                  return;
                }
                if (e.key === "Tab" && !page) {
                  // Always swallowed at the root — Tab must never move focus out.
                  e.preventDefault();
                  handleRootTab();
                }
              }}
            >
              <div className="flex items-center gap-2 border-b border-border px-3">
                {activeSource && (
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {activeSource.label}
                  </span>
                )}
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder={activeSource ? `Search ${activeSource.label}…` : placeholder}
                  className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List ref={attachList} className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
                {!activeSource && (
                  <>
                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                      No results found.
                    </Command.Empty>
                    {grouped.map(([group, entries]) => (
                      <Command.Group key={group} heading={group} className={groupClass}>
                        {entries.map((entry) => {
                          const Icon = entry.icon;
                          return (
                            <Command.Item
                              key={entry.id}
                              value={entry.id}
                              keywords={[
                                entry.label,
                                ...(entry.keywords ?? []),
                                ...(entry.alias ? [entry.alias] : []),
                              ]}
                              onSelect={() => runEntry(entry)}
                              className={cn(itemClass, numberBadgeClass)}
                            >
                              {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              <span className="truncate">{entry.label}</span>
                              {entry.alias && <kbd className={badgeClass}>{entry.alias}</kbd>}
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                    ))}
                    {searchSources.length > 0 && (
                      <Command.Group heading="Search" className={groupClass}>
                        {searchSources.map((s) => {
                          const Icon = s.icon ?? Search;
                          return (
                            <Command.Item
                              key={s.key}
                              value={`search-${s.key}`}
                              keywords={["search", "find", s.label, ...(s.alias ? [s.alias] : [])]}
                              onSelect={() => {
                                setPage(s.key);
                                setSearch("");
                              }}
                              className={cn(itemClass, numberBadgeClass)}
                            >
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">Search {s.label}…</span>
                              {s.alias && <kbd className={badgeClass}>{s.alias}</kbd>}
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                    )}
                  </>
                )}
                {activeSource && (
                  <EntitySearchPage
                    source={activeSource}
                    search={search}
                    onPick={(route) => {
                      setOpen(false);
                      navigate(route);
                    }}
                  />
                )}
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {sequenceHints === "hud" && (
        <SequenceHUD
          path={seq.path}
          node={seq.node}
          activation={seq.activation}
          delayMs={hintDelayMs}
          enterKey={seq.enterKey}
        />
      )}
      {leaderKey && (
        <LeaderGrid
          open={seq.activation === "leader"}
          path={seq.path}
          node={seq.node}
          rootLabel={rootLabel}
          enterKey={seq.enterKey}
          onClose={seq.reset}
        />
      )}
    </>
  );
}
