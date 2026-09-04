import * as React from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";

import { Input } from "@bcl32/utils/Input";
import {
  ApplyFilterSuggestion,
  SearchFilterIndex,
  type FilterSuggestion,
  type SearchFieldEntry,
} from "./FilterSearch";
import { FILTER_SEARCH_ATTR, releaseFilterSearch } from "./FilterSearchHotkey";
import { anchoredPanelStyle, useAnchorRect } from "./AnchoredPanel";
import type { FilterInitialValue, Filters } from "./types";

/** Suggestion panel width. Matches the old `w-80`. */
const PANEL_WIDTH = 320;

interface FilterSearchBarProps {
  index: SearchFieldEntry[];
  filters: Filters;
  changeFilters: (name: string, key: string, value: unknown) => void;
  addFilter?: (field: string, initial?: FilterInitialValue) => string | null;
  /** Called with the affected filter key after a suggestion applies. */
  onApplied?: (key: string | null) => void;
  placeholder?: string;
  /**
   * Control size. `default` is the table-toolbar box that shares a row with
   * the title; `large` is for a bar that owns the top of its page and has room
   * to be read from further away. The suggestion panel is the same either way.
   */
  size?: "default" | "large";
}

/**
 * Free-text entry point into the filter system: type a value ("PLA"), a field
 * ("weight"), or an expression ("weight > 200", "material: petg") and pick
 * from ranked suggestions. Applying updates a mounted filter in place or
 * instantiates a dynamic one seeded with the parsed value.
 *
 * Autosuggest layers: focusing the empty box lists every filterable field with
 * its live data shape; a partial expression ("material:") enumerates that
 * field's values; and when the highlighted suggestion completes the typed text
 * its remainder renders as inline ghost text — Tab (or → at the end of the
 * input) accepts it without applying, Enter applies.
 */
export function FilterSearchBar({
  index,
  filters,
  changeFilters,
  addFilter,
  onApplied,
  // No placeholder by default: the magnifier icon beside the box already says
  // what it is, and the old "Search filters..." only competed with the ghost
  // completion that renders in the same spot.
  placeholder = "",
  size = "default",
}: FilterSearchBarProps): JSX.Element {
  const large = size === "large";
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [focused, setFocused] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const suggestions = React.useMemo<FilterSuggestion[]>(
    () => SearchFilterIndex(index, query, { filters, canAdd: !!addFilter }),
    [index, query, filters, addFilter],
  );

  // Keep the highlight on a real row as the result set shrinks.
  React.useEffect(() => {
    setActive((prev) => Math.min(prev, Math.max(0, suggestions.length - 1)));
  }, [suggestions.length]);

  React.useEffect(() => {
    if (!focused) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // The panel is portalled out of the container, so it has to be tested
      // separately — otherwise clicking a suggestion counts as "outside".
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setFocused(false);
    };
    // Capture, not bubble: applying a suggestion re-renders and unmounts the
    // clicked row *during* dispatch (mousedown is discrete, so React flushes
    // synchronously). By the bubble phase `target` is detached and `contains`
    // reports false, which would read as a click outside and kill the box while
    // the input still holds focus — leaving it unable to reopen.
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [focused]);

  const open = focused && suggestions.length > 0;
  const empty = focused && query.trim().length > 0 && suggestions.length === 0;
  const showPanel = open || empty;

  // The panel is height-capped to the viewport, so arrowing down a long list
  // can walk the highlight out of sight — drag it back into view.
  const activeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (open) activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const anchor = useAnchorRect(containerRef, showPanel);
  const highlighted = suggestions[active] ?? suggestions[0];

  // Inline completion from the highlighted suggestion, e.g. "pl" + ghost "A".
  const ghost = React.useMemo(() => {
    const completion = highlighted?.completion;
    if (!query || !completion) return "";
    if (!completion.toLowerCase().startsWith(query.toLowerCase())) return "";
    return completion.slice(query.length);
  }, [query, highlighted]);

  function acceptGhost(): boolean {
    if (!ghost || !highlighted?.completion) return false;
    setQuery(highlighted.completion);
    return true;
  }

  function apply(suggestion: FilterSuggestion) {
    const key = ApplyFilterSuggestion(suggestion, {
      filters,
      change_filters: changeFilters,
      add_filter: addFilter,
    });
    setQuery("");
    setActive(0);
    onApplied?.(key);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      // Two steps out: clear what you typed, then leave the box entirely and
      // hand focus back to wherever the `/` hotkey took it from.
      if (query) setQuery("");
      else {
        setFocused(false);
        releaseFilterSearch(inputRef.current);
      }
      return;
    }
    if (e.key === "Tab" && ghost) {
      e.preventDefault();
      acceptGhost();
      return;
    }
    if (e.key === "ArrowRight" && ghost) {
      // Only intercept when the caret sits at the end — mid-string → still
      // moves the cursor like a normal input.
      const input = inputRef.current;
      if (input && input.selectionStart === query.length && input.selectionEnd === query.length) {
        e.preventDefault();
        acceptGhost();
        return;
      }
    }
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      apply(suggestions[active] ?? suggestions[0]);
    }
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <Search size={large ? 17 : 13} className="shrink-0 text-muted-foreground" />
        <div className="relative">
          <Input
            ref={inputRef}
            // Jump target for the `/` hotkey — see FilterSearchHotkey.
            {...{ [FILTER_SEARCH_ATTR]: "" }}
            variant="background"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={large ? "h-10 w-72 text-base" : "h-7 w-44 text-xs"}
          />
          {ghost && (
            // Mirrors the input's box metrics (px-3 + 1px border) so the ghost
            // remainder lines up exactly after the typed text.
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border border-transparent px-3 ${large ? "text-base" : "text-xs"}`}
            >
              <span className="invisible">{query}</span>
              <span className="text-muted-foreground">{ghost}</span>
            </div>
          )}
        </div>
      </div>

      {/* Portalled to <body>: the toolbar that hosts this bar is an
          `overflow-x-auto` strip, and an overflow box clips its absolutely
          positioned descendants no matter how high their z-index. Escaping the
          subtree entirely is the only way the panel floats over the page. */}
      {showPanel &&
        anchor &&
        createPortal(
          <div
            ref={panelRef}
            style={anchoredPanelStyle(anchor, PANEL_WIDTH)}
            className="z-50 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
          >
            {open ? (
              suggestions.map((suggestion, i) => (
                <button
                  key={`${suggestion.label}-${i}`}
                  ref={i === active ? activeRef : undefined}
                  type="button"
                  // mousedown, not click: apply before the input's blur handling
                  // can close the dropdown out from under the press.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    apply(suggestion);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-baseline justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    i === active
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <span className="truncate font-medium">{suggestion.label}</span>
                  {suggestion.detail && (
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {suggestion.detail}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No matching filters
              </p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
