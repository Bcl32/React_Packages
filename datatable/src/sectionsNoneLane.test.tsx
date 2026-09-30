// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { SectionsView } from "./SectionsView";
import type { BoardConfig } from "./BoardView";
import type { RenderSectionWrapper } from "./GroupSections";

// The sections layout keeps the board's rule for an empty "No …" group —
// hidden, because it holds nothing — except while a drag is held, when it is
// exactly where somebody may want to drop (`showEmptyNoneLane`).

type Room = { id: string; name: string; floor: string | null };

const ROWS: Room[] = [
  { id: "a", name: "Kitchen", floor: "Main" },
  { id: "b", name: "Den", floor: "Lower" },
];

function Sections(props: { board: BoardConfig<Room>; wrap: RenderSectionWrapper }) {
  const table = useReactTable({
    data: ROWS,
    columns: [{ accessorKey: "name" }],
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef}>
      <SectionsView
        table={table}
        ModelData={{ model_attributes: [] } as never}
        scrollRef={scrollRef}
        board={props.board}
        animate={false}
        renderCard={(row) => <span>{row.original.name}</span>}
        renderSubComponent={() => null}
        renderSectionWrapper={props.wrap}
      />
    </div>
  );
}

const board = (showEmptyNoneLane?: boolean): BoardConfig<Room> => ({
  lanes: [
    { value: "Main", label: "Main" },
    { value: "Lower", label: "Lower" },
    { value: "Attic", label: "Attic" },
    { value: "__none__", label: "No floor", isNone: true },
  ],
  laneOf: (r) => [r.floor ?? "__none__"],
  showEmptyNoneLane,
});

function sectionValues(b: BoardConfig<Room>): string[] {
  const seen: string[] = [];
  const wrap: RenderSectionWrapper = (info, sectionProps, children) => {
    seen.push(info.value);
    return <div {...sectionProps}>{children}</div>;
  };
  render(<Sections board={b} wrap={wrap} />);
  return [...new Set(seen)];
}

describe("SectionsView empty none section", () => {
  it("shows a declared empty section but not an empty none section", () => {
    expect(sectionValues(board())).toEqual(["Main", "Lower", "Attic"]);
  });

  it("keeps the empty none section while a drag asks for it", () => {
    expect(sectionValues(board(true))).toEqual(["Main", "Lower", "Attic", "__none__"]);
  });
});
