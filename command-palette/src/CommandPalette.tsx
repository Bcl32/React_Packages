import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@bcl32/utils/cn";
import { EntitySearchPage } from "./EntitySearchPage";
import type { CommandEntry, SearchSource } from "./types";

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2 text-sm " +
  "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground " +
  "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50";

const groupClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs " +
  "[&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

export interface CommandPaletteProps {
  commands: CommandEntry[];
  searchSources?: SearchSource[];
  /** Key pressed with ctrl/cmd to toggle the palette. Default "k". */
  hotkey?: string;
  placeholder?: string;
}

export function CommandPalette({
  commands,
  searchSources = [],
  hotkey = "k",
  placeholder = "Type a command or search…",
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState<string | null>(null);
  const navigate = useNavigate();

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
              if (e.key === "Backspace" && !search && page) {
                e.preventDefault();
                setPage(null);
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
            <Command.List className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
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
                            keywords={[entry.label, ...(entry.keywords ?? [])]}
                            onSelect={() => runEntry(entry)}
                            className={itemClass}
                          >
                            {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span className="truncate">{entry.label}</span>
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
                            keywords={["search", "find", s.label]}
                            onSelect={() => {
                              setPage(s.key);
                              setSearch("");
                            }}
                            className={itemClass}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span>Search {s.label}…</span>
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
