// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { BoardView } from "./BoardView";
import type { BoardConfig, RenderLaneWrapper } from "./BoardView";

// The board's drop seam: a lane wrapper takes over each lane's element and is
// told which lane it holds, and the empty "no value" lane can be kept on
// screen for the length of a drag.

type Task = { id: string; title: string; priority: string | null };

const ROWS: Task[] = [
  { id: "a", title: "Caulk", priority: "high" },
  { id: "b", title: "Paint", priority: "low" },
];

const MODEL = { model_attributes: [] } as never;

function Board(props: { board: BoardConfig<Task>; renderLaneWrapper?: RenderLaneWrapper }) {
  const table = useReactTable({
    data: ROWS,
    columns: [{ accessorKey: "title" }],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef}>
      <BoardView
        table={table}
        ModelData={MODEL}
        scrollRef={scrollRef}
        board={props.board}
        animate={false}
        renderCard={(row) => <span>{row.original.title}</span>}
        renderSubComponent={() => null}
        renderLaneWrapper={props.renderLaneWrapper}
      />
    </div>
  );
}

const board = (extra: Partial<BoardConfig<Task>> = {}): BoardConfig<Task> => ({
  lanes: [
    { value: "high", label: "High" },
    { value: "low", label: "Low" },
    { value: "_none", label: "No priority", isNone: true },
  ],
  laneOf: (r) => [r.priority ?? "_none"],
  ...extra,
});

const laneLabels = (root: HTMLElement) =>
  [...root.querySelectorAll('[role="row"]')].map((el) => el.getAttribute("aria-label"));

describe("BoardView lanes", () => {
  it("draws its own lane element when no wrapper is given, and hides an empty none lane", () => {
    const { container } = render(<Board board={board()} />);
    expect(laneLabels(container)).toEqual(["High", "Low"]);
  });

  it("keeps the empty none lane while asked to", () => {
    const { container } = render(<Board board={board({ showEmptyNoneLane: true })} />);
    expect(laneLabels(container)).toEqual(["High", "Low", "No priority"]);
  });

  it("hands each lane to the wrapper with its value, count and element props", () => {
    const seen: [string, number][] = [];
    const wrap: RenderLaneWrapper = ({ lane, count }, laneProps, children) => {
      seen.push([lane.value, count]);
      return (
        <div {...laneProps} data-drop={lane.value} className={`${laneProps.className} self-stretch`}>
          {children}
        </div>
      );
    };
    const { container } = render(<Board board={board()} renderLaneWrapper={wrap} />);
    expect(seen).toEqual([
      ["high", 1],
      ["low", 1],
    ]);
    const high = container.querySelector('[data-drop="high"]') as HTMLElement;
    // The package's own props survive the wrapper: row semantics, width, classes.
    expect(high.getAttribute("role")).toBe("row");
    expect(high.getAttribute("aria-label")).toBe("High");
    expect(high.className).toContain("flex-col");
    expect(high.className).toContain("self-stretch");
    expect(high.style.width).not.toBe("");
    // And the lane's contents are still the package's.
    expect(high.textContent).toContain("Caulk");
  });
});
