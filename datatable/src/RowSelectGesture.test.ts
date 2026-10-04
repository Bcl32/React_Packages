import { describe, expect, it } from "vitest";
import { createTable, getCoreRowModel, type RowSelectionState } from "@tanstack/react-table";

import { applySelectionGesture, noteSelectionAnchor } from "./RowSelectGesture";

type R = { id: string };
const data: R[] = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

/** A real TanStack table with self-held selection state. */
function makeTable() {
  let rowSelection: RowSelectionState = {};
  const table = createTable<R>({
    data,
    columns: [{ id: "name", accessorKey: "id" }],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
    enableRowSelection: true,
    state: { rowSelection },
    onStateChange: () => {},
    onRowSelectionChange: (updater) => {
      rowSelection = typeof updater === "function" ? updater(rowSelection) : updater;
      table.setOptions((prev) => ({ ...prev, state: { ...prev.state, rowSelection } }));
    },
    renderFallbackValue: null,
  });
  table.setOptions((prev) => ({ ...prev, state: { ...table.initialState, rowSelection } }));
  const row = (id: string) => table.getRowModel().rowsById[id];
  const selected = () => Object.keys(table.getState().rowSelection).filter((k) => table.getState().rowSelection[k]).sort();
  return { table, row, selected };
}
const plain = { shiftKey: false, metaKey: false, ctrlKey: false };

describe("applySelectionGesture", () => {
  it("leaves a plain click to the row", () => {
    const { row, selected } = makeTable();
    expect(applySelectionGesture(row("a"), plain)).toBe(false);
    expect(selected()).toEqual([]);
  });

  it("toggles one row on Ctrl/Cmd-click and anchors there", () => {
    const { row, selected } = makeTable();
    expect(applySelectionGesture(row("b"), { ...plain, ctrlKey: true })).toBe(true);
    expect(selected()).toEqual(["b"]);
    applySelectionGesture(row("d"), { ...plain, shiftKey: true });
    expect(selected()).toEqual(["b", "c", "d"]);
  });

  it("ranges from the anchor either way, adding to the selection", () => {
    const { row, selected } = makeTable();
    applySelectionGesture(row("e"), { ...plain, metaKey: true });
    applySelectionGesture(row("c"), { ...plain, shiftKey: true });
    expect(selected()).toEqual(["c", "d", "e"]);
    // The anchor stays on "e": a second shift-click re-ranges from it.
    applySelectionGesture(row("a"), { ...plain, shiftKey: true });
    expect(selected()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("treats a first shift-click with no anchor as a toggle", () => {
    const { row, selected } = makeTable();
    applySelectionGesture(row("c"), { ...plain, shiftKey: true });
    expect(selected()).toEqual(["c"]);
  });

  it("takes the anchor from a plain checkbox tick", () => {
    const { row, selected } = makeTable();
    row("b").toggleSelected();
    noteSelectionAnchor(row("b"));
    applySelectionGesture(row("d"), { ...plain, shiftKey: true });
    expect(selected()).toEqual(["b", "c", "d"]);
  });
});
