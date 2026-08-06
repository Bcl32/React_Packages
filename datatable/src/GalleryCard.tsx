import React from "react";
import type { Row } from "@tanstack/react-table";

import { cn } from "@bcl32/utils/cn";
import type { RowData } from "@bcl32/data-utils";

import { partitionCells, renderCell } from "./CardCells";

/**
 * Gallery tile: the media cell, at size, with the title as a caption underneath
 * and nothing else.
 *
 * The point of the layout is that for Parts and Plates the thumbnail *is* the
 * information — you recognise the thing you are looking for by its shape long
 * before you read its name. So everything the default card spends vertical
 * space on (labelled body fields, badges, a footer) is dropped, which is what
 * lets the grid run four to five times as dense.
 *
 * The two controls that can't be dropped — select and the row-actions menu —
 * are overlaid on the image and revealed on hover/focus, so a grid the user is
 * only browsing reads as pictures rather than as a checklist. A ticked checkbox
 * stays visible regardless: hiding the evidence of a selection is how you end up
 * bulk-editing rows you forgot you had picked.
 */

/** Gallery size presets, in px of minimum tile width. Much smaller than
 *  CARD_SIZE_WIDTHS — a tile carries one image and one line of text, so the
 *  width that makes a *card* readable just wastes the grid here. */
export const GALLERY_SIZE_WIDTHS = {
  compact: 104,
  comfortable: 144,
  large: 208,
} as const;

export const DEFAULT_GALLERY_MIN_WIDTH = GALLERY_SIZE_WIDTHS.comfortable;

export function GalleryTile<TData extends RowData>(props: {
  row: Row<TData>;
  clickable: boolean;
}): JSX.Element {
  const cells = partitionCells(props.row);
  const selected = props.row.getIsSelected();

  return (
    <figure className="group relative flex h-full flex-col gap-1.5">
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-lg border bg-muted/30",
          // ring-inset for the same reason the card view documents: the grid
          // sits flush against the scroll region, so an outside ring is clipped
          // off the first row and either edge column.
          selected && "ring-2 ring-inset ring-primary",
          props.clickable && "transition-colors group-hover:border-primary/60"
        )}
      >
        {cells.media.length > 0 ? (
          // Media renderers are sized for table cells (fixed column width, and
          // ThumbnailCell's negative-margin bleed) — neutralize the bleed and
          // let the image fill the square instead of pinning it to the fixed
          // h-32/w-32 the default card uses, since here the tile itself is the
          // thing being sized.
          <div className="flex h-full w-full items-center justify-center overflow-hidden [&>*]:!m-0 [&>*]:h-full [&>*]:w-full [&_img]:h-full [&_img]:w-full [&_img]:!rounded-none [&_img]:object-cover">
            {cells.media.map((cell) => (
              <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            No image
          </div>
        )}

        {cells.select && (
          <div
            className={cn(
              "absolute left-1 top-1 rounded bg-background/85 p-0.5 shadow-sm transition-opacity",
              // The select cell carries a -m-4/p-4 hit-area bleed tuned for
              // table cells; flattened here or it swallows the whole tile.
              "[&_label]:!m-0 [&_label]:!p-0",
              selected
                ? "opacity-100"
                : "opacity-0 focus-within:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
            )}
          >
            {renderCell(cells.select)}
          </div>
        )}

        {cells.actions && (
          <div className="absolute right-1 top-1 rounded bg-background/85 opacity-0 shadow-sm transition-opacity focus-within:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100">
            {renderCell(cells.actions)}
          </div>
        )}
      </div>

      {cells.title.length > 0 && (
        // Two lines then clip. A tile whose caption is allowed to run grows
        // taller than its neighbours, and in a grid that means one long name
        // adds a band of white space across the entire row.
        //
        // The clamp is repeated on descendant links because a title cell is
        // often not plain text — Plates renders `flex[ <Link/> <Badge/> ]`, and
        // a clamp on the figcaption counts *its* line boxes, of which a flex
        // row is exactly one however tall the name inside it wraps.
        <figcaption className="flex justify-center px-0.5 text-center text-xs font-medium leading-tight [&_a]:line-clamp-2 [&_a]:break-words">
          {cells.title.map((cell) => (
            <React.Fragment key={cell.id}>{renderCell(cell)}</React.Fragment>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
