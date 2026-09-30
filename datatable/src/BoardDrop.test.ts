import { describe, expect, it } from "vitest";
import type { ModelAttribute } from "@bcl32/data-utils";

import { laneDropWrite } from "./BoardDrop";
import type { BoardLane } from "./BoardView";

// Shapes lifted from real generated ModelData: Home Helper's Task and Print
// Tracker's Project, whose `status` is derived from item progress.
const attr = (over: Partial<ModelAttribute>): ModelAttribute =>
  ({ name: "field", type: "select", editable: true, filter: true, filter_type: "options", cell_shape: "scalar", ...over }) as ModelAttribute;

const priority = attr({ name: "priority", title: "Priority" });
const project = attr({ name: "project_id", title: "Project", type: "id", nullable: true });
const done = attr({ name: "done", title: "Done", type: "boolean", filter_type: "boolean", cell_shape: undefined });
const tags = attr({ name: "tags", title: "Tags", type: "list", cell_shape: "scalar-array" });
const derived = attr({ name: "status", title: "Status", editable: false });
const units = attr({ name: "rack_units", title: "Rack units", type: "number", filter_type: "number" });

const lane = (value: string, label = value): BoardLane => ({ value, label });
const none: BoardLane = { value: "_none", label: "No project", isNone: true };

describe("laneDropWrite", () => {
  it("writes the lane's value for a single-valued, editable field", () => {
    expect(laneDropWrite(priority, lane("urgent"))).toEqual({ ok: true, write: { priority: "urgent" } });
    expect(laneDropWrite(project, lane("a1b2", "Kitchen Reno"))).toEqual({ ok: true, write: { project_id: "a1b2" } });
  });

  it("decodes the lane's string back into the field's type", () => {
    expect(laneDropWrite(done, lane("true", "Yes"))).toEqual({ ok: true, write: { done: true } });
    expect(laneDropWrite(done, lane("false", "No"))).toEqual({ ok: true, write: { done: false } });
    expect(laneDropWrite(units, lane("3"))).toEqual({ ok: true, write: { rack_units: 3 } });
    expect(laneDropWrite(units, lane("abc")).ok).toBe(false);
  });

  it("writes null to the no-value lane only where the field may be empty", () => {
    expect(laneDropWrite(project, none)).toEqual({ ok: true, write: { project_id: null } });
    expect(laneDropWrite(priority, none)).toEqual({ ok: false, reason: "Priority can't be empty." });
  });

  it("refuses a list-valued field, which has no single meaning for a drop", () => {
    const r = laneDropWrite(tags, lane("weekend"));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/several tags/);
  });

  it("refuses a field the client does not write, such as a derived status", () => {
    expect(laneDropWrite(derived, lane("active"))).toEqual({
      ok: false,
      reason: "Status can't be changed by moving a card.",
    });
  });

  it("refuses when the board is not grouped by a field at all", () => {
    expect(laneDropWrite(null, lane("x")).ok).toBe(false);
  });
});
