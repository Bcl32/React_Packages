import React from "react";
import type { Row } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

import { childrenOf, outlineLines } from "./Outline";
import type { RowTree } from "./Outline";

/**
 * The card of an Outline view: one top-level row and its tree beneath it.
 *
 * Hand it to a `sections` view's `renderCard`, with the table fed
 * `outlineRoots(tree, matching)` — see `Outline.ts`. The frame owns what every
 * outline needs and no page should redo: the fold chevrons, the indentation
 * and its guide line, fading the lines the filters did not match, and keeping
 * a nested line's click from reaching the card (the card is the ROOT's row, so
 * a click that bubbled would open the root instead of the line).
 *
 * What a line looks like is the page's: `renderLine` draws every line, root
 * included, and receives a `lead` to place before its title — the chevron
 * plus whatever `leadOf` adds (a step number, an icon).
 *
 * No line carries a select checkbox: an outline is read and ticked, not
 * picked for bulk edits, and a checkbox on the root alone would set it a
 * checkbox-width right of the lines beneath it. (The table's toolbar
 * Select-all still selects the top-level rows.)
 */

export interface OutlineLineProps {
  /** Levels below the root: 0 is the root itself. */
  depth: number;
  /** The fold chevron (or a same-width gap) plus `leadOf`'s output. */
  lead: React.ReactNode;
  /** True for the card's own row. */
  isRoot: boolean;
  /** Whether the row is folded (its children hidden). */
  folded: boolean;
}

export interface OutlineCardProps<TData extends RowData> {
  row: Row<TData>;
  tree: RowTree<TData>;
  renderLine: (row: TData, line: OutlineLineProps) => React.ReactNode;
  /** Extra lead content per row, after the chevron. */
  leadOf?: (row: TData) => React.ReactNode;
  /** Ids the filters let through; a line outside it is faded. Omit to fade
   *  nothing. */
  matches?: ReadonlySet<string>;
  /** Start every row with children folded — the Overview posture. */
  defaultFolded?: boolean;
  /** Indent per level, in rem. */
  indentRem?: number;
}

function FoldToggle({
  folded,
  hasChildren,
  onFold,
}: {
  folded: boolean;
  hasChildren: boolean;
  onFold: () => void;
}) {
  if (!hasChildren) return <span className="w-4 shrink-0" />;
  const Icon = folded ? ChevronRight : ChevronDown;
  return (
    <button
      type="button"
      data-no-drag
      aria-label={folded ? "Show nested rows" : "Hide nested rows"}
      aria-expanded={!folded}
      onClick={(e) => {
        e.stopPropagation();
        onFold();
      }}
      // Exactly the gap's width, so a line with a chevron and one without
      // start their content at the same x.
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function OutlineCard<TData extends RowData>({
  row,
  tree,
  renderLine,
  leadOf,
  matches,
  defaultFolded = false,
  indentRem = 1.25,
}: OutlineCardProps<TData>) {
  const root = row.original;
  const rootId = String(root.id);
  const [folded, setFolded] = React.useState<Set<string>>(() => {
    if (!defaultFolded) return new Set();
    const ids = [rootId, ...outlineLines(tree, rootId).map((l) => String(l.row.id))];
    return new Set(ids.filter((id) => childrenOf(tree, id).length > 0));
  });
  const fold = (id: string) =>
    setFolded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const lead = (r: TData) => {
    const id = String(r.id);
    return (
      <>
        <FoldToggle
          folded={folded.has(id)}
          hasChildren={childrenOf(tree, id).length > 0}
          onFold={() => fold(id)}
        />
        {leadOf?.(r)}
      </>
    );
  };
  const faded = (id: string) => (matches && !matches.has(id) ? "opacity-50" : undefined);
  const lines = folded.has(rootId) ? [] : outlineLines(tree, rootId, folded);

  return (
    <div>
      {/* No checkbox to show it, so a selected root (Shift/Ctrl-click) is
          marked on its own line. */}
      <div
        className={cn(
          "rounded-md",
          faded(rootId),
          row.getIsSelected() && "bg-primary/10 ring-1 ring-inset ring-primary/40",
        )}
      >
        {renderLine(root, {
          depth: 0,
          lead: lead(root),
          isRoot: true,
          folded: folded.has(rootId),
        })}
      </div>
      {lines.map(({ row: r, depth }) => {
        const id = String(r.id);
        return (
          <div
            key={id}
            // The card belongs to the root; a nested line answers for itself.
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className={cn("border-l border-border", faded(id))}
            style={{ marginLeft: `${depth * indentRem}rem` }}
          >
            {renderLine(r, { depth, lead: lead(r), isRoot: false, folded: folded.has(id) })}
          </div>
        );
      })}
    </div>
  );
}
