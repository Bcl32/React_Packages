import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@bcl32/utils/cn";
import { EntitySearchPage } from "./EntitySearchPage";
import type { CommandEntry, SearchSource } from "./types";

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

/** How long a global alias sequence stays "live" before the buffer resets. */
const ALIAS_SEQUENCE_TIMEOUT_MS = 1000;

/** Typing anywhere inside one of these never starts a global alias sequence. */
const ALIAS_IGNORE_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]';

type AliasTarget =
  | { kind: "source"; source: SearchSource; label: string }
  | { kind: "command"; entry: CommandEntry; label: string };

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
}

export function CommandPalette({
  commands,
  searchSources = [],
  hotkey = "k",
  placeholder = "Type a command or search…",
  enableGlobalAliases = true,
  enableNumberedResults = true,
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

  // --- Aliases --------------------------------------------------------------

  /**
   * alias -> target. Search sources are inserted first so they win a collision,
   * matching the Tab handler's source-before-command precedence (a collision is
   * a configuration bug and is warned about in dev).
   */
  const aliasMap = React.useMemo(() => {
    const map = new Map<string, AliasTarget>();
    for (const source of searchSources) {
      const alias = source.alias?.toLowerCase();
      if (alias && !map.has(alias)) {
        map.set(alias, { kind: "source", source, label: `Search ${source.label}…` });
      }
    }
    for (const entry of commands) {
      const alias = entry.alias?.toLowerCase();
      if (alias && !map.has(alias)) {
        map.set(alias, { kind: "command", entry, label: entry.label });
      }
    }
    return map;
  }, [commands, searchSources]);

  const openSearchPage = (source: SearchSource, seed: string) => {
    setPage(source.key);
    setSearch(seed);
    setOpen(true);
  };

  const fireAlias = (alias: string) => {
    const target = aliasMap.get(alias);
    if (!target) return;
    if (target.kind === "source") openSearchPage(target.source, "");
    else runEntry(target.entry);
  };

  // Refs keep the window listener stable while still seeing current state.
  const openRef = React.useRef(open);
  const aliasMapRef = React.useRef(aliasMap);
  const fireAliasRef = React.useRef(fireAlias);
  React.useEffect(() => {
    openRef.current = open;
  }, [open]);
  React.useEffect(() => {
    aliasMapRef.current = aliasMap;
  }, [aliasMap]);
  React.useEffect(() => {
    fireAliasRef.current = fireAlias;
  });

  // Global key sequences (palette closed): "g" then "d" navigates, etc.
  React.useEffect(() => {
    if (!enableGlobalAliases) return;

    let buffer = "";
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    /** Buffer always expires after the timeout; `fireOnTimeout` also fires then. */
    const armTimer = (fireOnTimeout: string | null) => {
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        buffer = "";
        if (fireOnTimeout) fireAliasRef.current(fireOnTimeout);
      }, ALIAS_SEQUENCE_TIMEOUT_MS);
    };
    const reset = () => {
      clearTimer();
      buffer = "";
    };

    const evaluate = (candidate: string, key: string, allowRetest: boolean, e: KeyboardEvent) => {
      const map = aliasMapRef.current;
      const exact = map.has(candidate);
      let hasLonger = false;
      for (const alias of map.keys()) {
        if (alias.length > candidate.length && alias.startsWith(candidate)) {
          hasLonger = true;
          break;
        }
      }
      // Unambiguous hit: fire now. The firing key must be swallowed — a source
      // alias focuses the palette input during this same keydown, so without
      // preventDefault the character leaks into the freshly focused input.
      if (exact && !hasLonger) {
        e.preventDefault();
        reset();
        fireAliasRef.current(candidate);
        return;
      }
      // Hit, but a longer alias shares the prefix: wait for disambiguation.
      if (exact) {
        buffer = candidate;
        armTimer(candidate);
        return;
      }
      // Still a live prefix of something: keep accumulating.
      if (hasLonger) {
        buffer = candidate;
        armTimer(null);
        return;
      }
      // Dead end: restart the sequence from the key just typed, once.
      if (allowRetest && candidate.length > 1) {
        reset();
        evaluate(key, key, false, e);
        return;
      }
      reset();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (openRef.current) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === "function" && target.closest(ALIAS_IGNORE_SELECTOR)) {
        return;
      }
      if (e.key === "Escape") {
        reset();
        return;
      }
      if (!/^[a-z0-9]$/i.test(e.key)) return;
      const key = e.key.toLowerCase();
      evaluate(buffer + key, key, true, e);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimer();
    };
  }, [enableGlobalAliases]);

  // Dev-only registry validation: duplicates and prefix conflicts.
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const declared: { alias: string; label: string }[] = [];
    for (const source of searchSources) {
      if (source.alias) declared.push({ alias: source.alias.toLowerCase(), label: `Search ${source.label}…` });
    }
    for (const entry of commands) {
      if (entry.alias) declared.push({ alias: entry.alias.toLowerCase(), label: entry.label });
    }
    const seen = new Map<string, string>();
    for (const { alias, label } of declared) {
      const previous = seen.get(alias);
      if (previous) {
        console.warn(
          `[command-palette] duplicate alias "${alias}": "${previous}" and "${label}". Only the first one is reachable.`
        );
      } else {
        seen.set(alias, label);
      }
    }
    for (const short of declared) {
      for (const long of declared) {
        if (long.alias.length > short.alias.length && long.alias.startsWith(short.alias)) {
          console.warn(
            `[command-palette] alias prefix conflict: "${short.alias}" ("${short.label}") is a prefix of ` +
              `"${long.alias}" ("${long.label}"), so "${short.alias}" only fires after a ` +
              `${ALIAS_SEQUENCE_TIMEOUT_MS}ms pause.`
          );
        }
      }
    }
  }, [commands, searchSources]);

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

  return (
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
  );
}
