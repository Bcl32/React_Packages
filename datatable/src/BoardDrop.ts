import type { ModelAttribute } from "@bcl32/data-utils";
import { fieldLabel } from "@bcl32/forms/fieldLabel";

import type { BoardLane } from "./BoardView";

/**
 * What dropping a row onto a board lane means, decided from the grouping
 * attribute's own metadata — the rule half of board drag-and-drop, and
 * `SectionNesting`'s sibling: pure, no drag library, no request.
 *
 * The board supplies the seams (`renderCardWrapper`, `renderLaneWrapper`); the
 * page owns the drag and the request. What neither should have to know is
 * whether a drop on the "High" lane is `{ priority: "high" }` or nothing at
 * all. That depends only on the attribute the lanes were grouped by, and the
 * generated metadata already says everything needed:
 *
 * - a list-valued attribute (`cell_shape` other than scalar — tags, systems)
 *   has no single meaning for a drop: add the lane's value, or replace?
 * - a non-editable attribute (`editable: false` — a derived status) is not
 *   the client's to write;
 * - the "no value" lane (`lane.isNone`) writes null, but only where the field
 *   may be empty (`nullable: true`);
 * - everything else writes the lane's value, decoded back from the string a
 *   lane carries (`"true"` is a boolean, `"3"` on a numeric grouping a number).
 *
 * The refusal is a sentence, so the lane under the pointer can say why rather
 * than silently ignore the drop — call this per lane to colour the ring while a
 * card is held, and again on the drop.
 *
 * A page whose grouping is not a plain attribute (a derived "due this week"
 * bucket) or whose field is writable without a form control (an assignee the
 * form cannot pick) keeps its own rule for that case and asks this for the
 * rest.
 */

export type LaneDrop =
  | { ok: true; write: Record<string, unknown> }
  | { ok: false; reason: string };

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The lane's string as the value the field stores, or undefined if it cannot be one. */
function decode(attr: ModelAttribute, laneValue: string): unknown {
  if (attr.type === "boolean") {
    if (laneValue === "true") return true;
    if (laneValue === "false") return false;
    return undefined;
  }
  if (attr.type === "number" || attr.filter_type === "number") {
    const n = Number(laneValue);
    return laneValue.trim() !== "" && Number.isFinite(n) ? n : undefined;
  }
  return laneValue;
}

/**
 * The fields a drop onto `lane` of a board grouped by `attr` should write, or
 * why it writes nothing.
 */
export function laneDropWrite(
  attr: ModelAttribute | null | undefined,
  lane: BoardLane,
): LaneDrop {
  if (!attr) return { ok: false, reason: "Group the board by a field to move cards between lanes." };
  const title = fieldLabel(attr);

  const shape = (attr.cell_shape as string | undefined) ?? "scalar";
  if (shape !== "scalar") {
    return {
      ok: false,
      reason: `A record can have several ${lower(title)} — edit them on the record instead.`,
    };
  }
  if (attr.editable === false) {
    return { ok: false, reason: `${title} can't be changed by moving a card.` };
  }
  if (lane.isNone) {
    return attr.nullable === true
      ? { ok: true, write: { [attr.name]: null } }
      : { ok: false, reason: `${title} can't be empty.` };
  }
  const value = decode(attr, lane.value);
  if (value === undefined) {
    return { ok: false, reason: `"${lane.label}" isn't a ${lower(title)} this field can hold.` };
  }
  return { ok: true, write: { [attr.name]: value } };
}
