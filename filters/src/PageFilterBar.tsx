import * as React from "react";
import type { DataTableFilter } from "./DataTableFilterBar";

interface PageFilterBarProps {
  /**
   * The bar from `useDataTableFilterBar`, built with `collapsible: false`. This
   * component only arranges what the hook returns; every behaviour — search,
   * adding, chips, targeting — is the hook's, so the two agree by construction.
   */
  filter: DataTableFilter;
  /**
   * The entity name, drawn with the "(shown/total)" count at the start of the
   * top row. The table beneath then takes no `title` of its own — the bar is
   * where the count changes, so the bar is where it reads.
   */
  title?: string;
  /** Rendered after the title, before the search box. */
  leading?: React.ReactNode;
  /** Rendered at the end of the top row, pushed to the right edge. */
  trailing?: React.ReactNode;
  /** Replaces the default card chrome (`rounded-lg border bg-card px-4 py-3`). */
  className?: string;
}

/**
 * A filter bar that owns the top of its page.
 *
 * The bar inside a `DataTable` toolbar has to stay small: it shares a row with
 * the table's title, scrolls its chips sideways rather than letting them push
 * the rows down, and folds its cards away behind a toggle. None of that applies
 * once the bar is the first thing on the page — there is nothing above it to
 * crowd and nothing beneath it that a taller bar displaces, since whatever
 * follows simply starts lower. So this lays the same pieces out the other way:
 *
 *   [title (n/m)] [leading] [search] [+ Add filter] [chip] [chip] … [trailing]
 *   [card] [card] [card] [card]
 *
 * Chips wrap; the cards sit in their own row beneath and vanish when none are
 * mounted, so with nothing added the bar is a single line.
 *
 * Build the hook with `size: "large"` as well as `collapsible: false`: the
 * controls are the hook's, so their size is the hook's to set, and this bar's
 * own chrome — heading, padding, spacing — is drawn to match the large ones.
 *
 * Built for the pattern where the table is one of several things the filters
 * cut — a colour wheel, a map, a set of facet rows — and the bar has to visibly
 * govern all of them rather than look like the table's own.
 */
export function PageFilterBar({
  filter,
  title,
  leading,
  trailing,
  className = "rounded-lg border bg-card px-4 py-3",
}: PageFilterBarProps): JSX.Element {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {title && (
          // One step up from the table toolbar's heading: this row is the
          // page's headline, not a caption beside a table.
          <h3 className="text-2xl font-semibold capitalize whitespace-nowrap shrink-0 mr-2">
            {title}
            <span className="text-base font-normal text-muted-foreground ml-2">
              ({filter.filteredCount}/{filter.totalCount})
            </span>
          </h3>
        )}
        {leading}
        {filter.search}
        {filter.addPicker}
        {filter.toggle}
        {filter.chips}
        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>
      {filter.panel}
    </div>
  );
}
