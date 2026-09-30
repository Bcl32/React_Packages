import React from "react";
import { GripVertical } from "lucide-react";

import { cn } from "@bcl32/utils/cn";

/**
 * What a drag LOOKS like, shared by every app that drags cards, rows or
 * sections through this package's seams — the presentational half of
 * drag-and-drop, beside `SectionNesting` (what a section drop may do) and
 * `BoardDrop` (what a lane drop writes).
 *
 * Still no drag library: the grip is a plain button that takes dnd-kit's
 * `listeners` and `attributes` as props and its activator (or node) ref
 * through `ref`, and the drop animation is a plain object dnd-kit's
 * `DragOverlay` accepts. The caller keeps its own `useDraggable` /
 * `useSortable` and its own payload; only the pixels are shared.
 *
 * These began as Print Tracker's project page, copied four times over (the
 * section grip, the table-row grip, the item-card grip, the Part Set member
 * grip) with one class string between them.
 */

/** The grip's look. `touch-none` is load-bearing: without it a touch drag is
 *  claimed by the page scroll and the pointer sensor never sees the move. */
export const DRAG_GRIP_CLASS =
  "cursor-grab touch-none p-1 rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing";

/** The red twin of `DROP_RING`: the target under the pointer will not take
 *  this drop. Inset for the same reason — lighting up must not move the rect
 *  the drop is being resolved against. */
export const REFUSE_RING = "ring-2 ring-inset ring-destructive bg-destructive/5 cursor-not-allowed";

/**
 * The same two highlights drawn ABOVE the target's content, for a target
 * whose children paint an opaque background of their own — a wrapper around
 * a tinted section, a lane full of cards. `DROP_RING` is an inset box-shadow,
 * and an inset shadow is painted over the element's own background but UNDER
 * its children, so on such a wrapper it is fully present in the DOM and
 * invisible on screen. An `::after` overlay sits on top instead: it takes the
 * wrapper's corner radius, ignores the pointer (so it never becomes what is
 * clicked or dropped on), and changes no geometry.
 */
const OVERLAY =
  "relative after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:ring-2 after:ring-inset after:content-['']";
export const DROP_HIGHLIGHT = `${OVERLAY} after:ring-primary after:bg-primary/5`;
export const REFUSE_HIGHLIGHT = `${OVERLAY} after:ring-destructive after:bg-destructive/10 cursor-not-allowed`;

/**
 * The grip-strip LAYOUT a draggable card wears in every app: the whole right
 * edge of the card, full height, is the handle — a target the width of a
 * gutter rather than of a 14 px icon — with the icon at its top. The card
 * reserves the gutter (`GRIP_GUTTER_CLASS` on its own root, or
 * `GRIP_GUTTER_CHILD_CLASS` on a wrapper around a card it does not render), so
 * the strip covers nothing; the card's root must be `relative`. Anything the
 * card pins to its right edge moves left of the gutter (`right-9`).
 */
export const GRIP_STRIP_CLASS =
  "absolute bottom-1 right-1 top-1 z-10 flex w-7 items-start justify-center pt-2";
export const GRIP_GUTTER_CLASS = "pr-8";
export const GRIP_GUTTER_CHILD_CLASS = "[&>*:first-child]:pr-8";

export interface DragGripProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** What is being dragged, for `aria-label` and the tooltip. */
  label: string;
  /** Icon size classes. Default `w-3.5 h-3.5`; a section header uses `w-4 h-4`. */
  iconClassName?: string;
  /** Dim the grip while its item is the one in flight. */
  dragging?: boolean;
  /** Draw as the card's full-height right-edge strip (see `GRIP_STRIP_CLASS`)
   *  rather than an inline button. Implies a 16 px icon. */
  strip?: boolean;
}

/**
 * The grip a drag starts from. Pass dnd-kit's activator ref (or node ref) as
 * `ref` and spread its `listeners` and `attributes` as props — they land after
 * the defaults, so dnd-kit's `role` and `tabIndex` apply to the grip.
 */
export const DragGrip = React.forwardRef<HTMLButtonElement, DragGripProps>(function DragGrip(
  { label, iconClassName, dragging = false, strip = false, className, ...rest },
  ref
) {
  return (
    <button
      type="button"
      ref={ref}
      title={label}
      aria-label={label}
      {...rest}
      className={cn("shrink-0", DRAG_GRIP_CLASS, strip && GRIP_STRIP_CLASS, dragging && "opacity-40", className)}
    >
      <GripVertical className={iconClassName ?? (strip ? "h-4 w-4" : "w-3.5 h-3.5")} />
    </button>
  );
});

export interface DragPillProps {
  /** The dragged thing's name. */
  label?: string | null;
  /** How many things are in flight; above one, the pill counts them instead. */
  count?: number;
  /** What one of them is called in the count ("3 parts"). Default "item". */
  noun?: string;
}

/** What follows the pointer: a name, or "N items" for a multi-select drag. */
export function DragPill({ label, count, noun = "item" }: DragPillProps): JSX.Element {
  const text = count != null && count > 1 ? `${count} ${noun}s` : label || `1 ${noun}`;
  return (
    <div className="w-max max-w-xs truncate rounded-md border bg-card px-3 py-1.5 text-sm font-medium shadow-lg">
      {text}
    </div>
  );
}

/** The slice of dnd-kit's modifier argument `pillAtCursor` reads. */
interface ModifierArgs {
  transform: { x: number; y: number; scaleX: number; scaleY: number };
  activatorEvent: Event | null;
  draggingNodeRect: { left: number; top: number } | null;
}

/** Where the pill sits relative to the pointer: just right of it, centred on it. */
const PILL_OFFSET = { x: 14, y: -16 };

/**
 * A `DragOverlay` modifier that keeps the pill beside the pointer.
 *
 * An overlay starts where the dragged NODE's top-left corner is and moves by
 * the pointer's delta, so the pill rides at whatever offset the grab had from
 * that corner. With the grip in a card's top-right corner that is a whole
 * card-width to the left of the cursor, which reads as "this is not going
 * where I am pointing" — and the drop lands under the pointer
 * (`pointerWithin`), so the pill must be there too. Adds the grab's offset
 * back. Pass as `<DragOverlay modifiers={[pillAtCursor]}>`; plain function, so
 * no dnd-kit import.
 */
export function pillAtCursor({ transform, activatorEvent, draggingNodeRect }: ModifierArgs) {
  const pointer = activatorEvent as (Event & { clientX?: number; clientY?: number }) | null;
  if (!draggingNodeRect || pointer?.clientX == null || pointer.clientY == null) return transform;
  return {
    ...transform,
    x: transform.x + (pointer.clientX - draggingNodeRect.left) + PILL_OFFSET.x,
    y: transform.y + (pointer.clientY - draggingNodeRect.top) + PILL_OFFSET.y,
  };
}

/** The slice of dnd-kit's drop-animation keyframe argument this reads. */
interface DropAnimationFrameArgs {
  transform: { initial: { x: number; y: number } };
}

/**
 * The drop: fade and shrink where the pointer let go, rather than dnd-kit's
 * default of flying the preview back to its source — which reads as "the drop
 * was refused" when it was not. Pass as `<DragOverlay dropAnimation>`. The
 * transforms are written out by hand so this module needs no dnd-kit import.
 */
export const DROP_ANIMATION = {
  duration: 160,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  keyframes: ({ transform }: DropAnimationFrameArgs) => [
    { opacity: 1, transform: `translate3d(${transform.initial.x}px, ${transform.initial.y}px, 0) scale(1)` },
    { opacity: 0, transform: `translate3d(${transform.initial.x}px, ${transform.initial.y}px, 0) scale(0.9)` },
  ],
};
