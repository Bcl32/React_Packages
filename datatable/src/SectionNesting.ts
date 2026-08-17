/**
 * What a curated section is allowed to do to another section — the two-level
 * depth contract, decided once.
 *
 * Several surfaces ask this question: the drag guard that lights a target up,
 * the drop handler that writes the move, a section's own ⋯ menu, and any
 * "nest under…" picker. They must not disagree — a target that lights up for
 * a move the handler discards is worse than one that never lit up at all.
 *
 * The consumer's server is the authority (its route asserting valid parents);
 * everything here exists so the UI can disable an affordance with its reason
 * instead of earning a 400 on submit.
 */

/** What every section-shaped drop target shares — inset so lighting up never
 *  changes geometry mid-drag (`MeasuringStrategy.Always` re-measures). */
export const DROP_RING = "ring-2 ring-inset ring-primary bg-primary/5";

/** The minimal section row the helpers read. Field names follow the shared
 *  backend shape (`parent_section_id`, `sort_order`). */
export interface SectionLike {
  id: string;
  name?: string | null;
  parent_section_id?: string | null;
  sort_order?: number | null;
}

export interface SectionDropArgs {
  draggedId?: string | null;
  draggedParentId?: string | null;
  targetId?: string | null;
  targetParentId?: string | null;
}

export type SectionDropResolution =
  | { kind: "reorder"; parentId: string | null }
  | { kind: "move"; destinationId: string };

/**
 * What dropping one section onto another means.
 *
 * Takes loose ids rather than section rows so a drag guard can answer from
 * the dnd payload alone — a hovered target knows the dragged section's parent
 * (it is in the payload) and its own, which is the whole question.
 *
 * @returns `null` when the drop is not a move at all.
 */
export function resolveSectionDrop({
  draggedId,
  draggedParentId = null,
  targetId,
  targetParentId = null,
}: SectionDropArgs): SectionDropResolution | null {
  if (!draggedId || !targetId || draggedId === targetId) return null;

  const draggedParent = draggedParentId || null;
  const targetParent = targetParentId || null;

  // Same sibling list — the reorder that has always worked. This is also why
  // a top-level section dropped on a top-level section is NOT a merge: the
  // two gestures are the same pixels, and merge deletes a section. Ordering
  // the page would have to be given up to hang a destructive action on it.
  if (draggedParent === targetParent) {
    return { kind: "reorder", parentId: draggedParent };
  }

  // Only a sub-section re-parents by drag. A top-level section dropped
  // elsewhere could only merge, and merge is destructive enough to want a
  // deliberate choice and a confirm — it lives in the ⋯ menu instead.
  if (!draggedParent) return null;

  // Dropping onto a sub-section means "join this list", not "go inside it" —
  // it cannot go inside, and its siblings are where the pointer actually is.
  // The resulting destination is top-level either way: a sub-section's parent
  // is parentless by the depth contract.
  const destinationId = targetParent || targetId;
  if (destinationId === draggedParent) return null; // already lives there
  if (destinationId === draggedId) return null; // into its own subtree
  return { kind: "move", destinationId };
}

/**
 * Why `sectionId` cannot become a sub-section of `destSection`, or null.
 *
 * Shared so a modal's checkbox and a section menu give the same three answers
 * in the same words. `sectionId` may be null — the other case is filing loose
 * rows, where only the destination's own depth is in question.
 */
export function nestingBlockedReason(
  sections: SectionLike[] = [],
  sectionId: string | null | undefined,
  destSection: SectionLike | null | undefined
): string | null {
  if (!destSection) return null;
  if (destSection.parent_section_id) {
    return `"${destSection.name || "That section"}" is already a sub-section, and sections nest only one level deep.`;
  }
  // Only the whole-section case can trip the remaining two: a brand new
  // sub-section has no children of its own and is nobody's parent.
  if (!sectionId) return null;
  if (sectionId === destSection.id) {
    return "A section cannot be nested inside itself.";
  }
  if (sections.some((s) => s.parent_section_id === sectionId)) {
    return "This section has sub-sections of its own, so it cannot become one.";
  }
  return null;
}

/**
 * Why `sectionId` cannot be merged into `targetId`, or null.
 *
 * Merge is the move nesting refuses: a section with sub-sections cannot
 * become one, but it can be folded into one, because its children come out at
 * the same level they went in at. So "has children" is not a blocker here —
 * the only rule is that the destination must be top-level, which is also what
 * stops a section being merged into its own sub-section (that would delete
 * the target's parent out from under it). Mirrors the server's single check.
 */
export function mergeBlockedReason(
  sections: SectionLike[] = [],
  sectionId: string | null | undefined,
  targetId: string | null | undefined
): string | null {
  if (!sectionId || !targetId) return "Pick a section to merge into.";
  if (sectionId === targetId) return "A section cannot be merged into itself.";
  const target = sections.find((s) => s.id === targetId);
  if (!target) return "That section no longer exists.";
  if (target.parent_section_id) {
    return `"${target.name || "That section"}" is a sub-section, so it cannot take another section's sub-sections.`;
  }
  return null;
}

function bySortOrder(a: SectionLike, b: SectionLike): number {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

/**
 * The sections a given section may be merged into: every top-level one but
 * itself, in the page's own order.
 */
export function mergeTargets(sections: SectionLike[] = [], sectionId: string): SectionLike[] {
  return sections
    .filter((s) => !s.parent_section_id && s.id !== sectionId)
    .sort(bySortOrder);
}

/**
 * The parents a sub-section may move to: every top-level section but the one
 * it is already under, and not itself.
 */
export function moveTargets(
  sections: SectionLike[] = [],
  sectionId: string,
  currentParentId?: string | null
): SectionLike[] {
  return sections
    .filter(
      (s) =>
        !s.parent_section_id && s.id !== sectionId && s.id !== (currentParentId || null)
    )
    .sort(bySortOrder);
}

/** The dnd-kit `active` shape these predicates read, structurally — the
 *  package deliberately has no dnd-kit dependency. */
export interface ActiveDragLike {
  data?: { current?: Record<string, unknown> | undefined };
}

/**
 * Should a drop target light up for the row drag currently in flight?
 *
 * Only row drags land in a section, and dropping a selection back into the
 * section it came from changes nothing — so the origin never highlights.
 *
 * `itemType` is the drag payload's `type` for "the row this page files into
 * sections" — whatever that row is, giving every such drag one type is what
 * lets every drop target serve them all. Defaults to `"items"`.
 */
export function acceptsItemDrag(
  active: ActiveDragLike | null | undefined,
  groupId: string,
  itemType = "items"
): boolean {
  const drag = active?.data?.current;
  return drag?.type === itemType && drag.sourceGroupId !== groupId;
}

/**
 * Same question for a section drag, which means one of two things: reorder
 * within a sibling list, or move a sub-section to a different parent.
 *
 * `resolveSectionDrop` decides both, from the dragged section's parent (which
 * the payload carries) and this target's own — so the ring and the write in
 * the page's drop handler cannot disagree about what a drop would do.
 *
 * Merging is deliberately not a drop. Dropping a top-level section on a
 * top-level section is the reorder gesture, pixel for pixel, and a merge
 * deletes a section — it lives in the ⋯ menu behind a confirm instead.
 */
export function acceptsSectionDrag(
  active: ActiveDragLike | null | undefined,
  group: { id: string; parentInstance?: string | null; parent_section_id?: string | null }
): boolean {
  const drag = active?.data?.current;
  if (drag?.type !== "section") return false;
  return (
    resolveSectionDrop({
      draggedId: drag.sectionId as string | undefined,
      draggedParentId: (drag.parentSectionId as string | null | undefined) ?? null,
      targetId: group.id,
      targetParentId: group.parentInstance ?? group.parent_section_id ?? null,
    }) !== null
  );
}
