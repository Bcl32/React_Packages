// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

import { TableView } from "./TableView";
import type { TableDensity } from "./TableView";

// The table layout's own furniture: the footer only when a column has one, the
// empty-state row, sortable headers as buttons with aria-sort, `meta.align`,
// density, and the pointer cursor on clickable rows.

type Item = { id: string; name: string; count: number };

const ROWS: Item[] = [
  { id: "a", name: "Alpha", count: 3 },
  { id: "b", name: "Beta", count: 12 },
];

function View(props: {
  rows?: Item[];
  columns: ColumnDef<Item, unknown>[];
  density?: TableDensity;
  emptyMessage?: React.ReactNode;
  rowsClickable?: boolean;
  cellClassName?: string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const table = useReactTable({
    data: props.rows ?? ROWS,
    columns: props.columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  return (
    <div ref={scrollRef}>
      <TableView
        table={table}
        columnsCount={props.columns.length}
        scrollRef={scrollRef}
        rowClickFunction={() => {}}
        rowsClickable={props.rowsClickable}
        density={props.density}
        emptyMessage={props.emptyMessage}
        cellClassName={props.cellClassName}
        renderSubComponent={() => null}
      />
    </div>
  );
}

const plain: ColumnDef<Item, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "count", header: "Count", meta: { align: "right" } },
];

describe("TableView", () => {
  it("draws no footer unless a column defines one", () => {
    const { container, unmount } = render(<View columns={plain} />);
    expect(container.querySelector("tfoot")).toBeNull();
    unmount();
    const withFooter: ColumnDef<Item, unknown>[] = [{ accessorKey: "name", header: "Name", footer: "Total" }];
    const again = render(<View columns={withFooter} />);
    expect(again.container.querySelector("tfoot")?.textContent).toBe("Total");
  });

  it("says No results. by default, the consumer's text when given, nothing for null", () => {
    expect(render(<View rows={[]} columns={plain} />).getByText("No results.")).toBeTruthy();
    expect(render(<View rows={[]} columns={plain} emptyMessage="No hits yet" />).getByText("No hits yet")).toBeTruthy();
    const { container } = render(<View rows={[]} columns={plain} emptyMessage={null} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
  });

  it("makes sortable headers buttons and reports the order through aria-sort", () => {
    const { container } = render(<View columns={plain} />);
    const th = container.querySelector("th")!;
    expect(th.getAttribute("aria-sort")).toBe("none");
    const button = th.querySelector("button")!;
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(th.getAttribute("aria-sort")).toBe("ascending");
  });

  it("aligns a column's header and cells from meta.align", () => {
    const { container } = render(<View columns={plain} />);
    expect(container.querySelectorAll("th")[1].className).toContain("text-right");
    expect(container.querySelector("tbody tr td:nth-child(2)")!.className).toContain("text-right");
    expect(container.querySelector("tbody tr td:nth-child(1)")!.className).not.toContain("text-right");
  });

  it("sets row spacing by density and lets cellClassName win", () => {
    const cell = (density?: TableDensity, cellClassName?: string) =>
      render(<View columns={plain} density={density} cellClassName={cellClassName} />).container.querySelector("tbody td")!.className;
    expect(cell()).toContain("py-2.5");
    expect(cell("compact")).toContain("py-1.5");
    expect(cell("compact")).toContain("text-xs");
    const overridden = cell(undefined, "py-1");
    expect(overridden).toContain("py-1");
    expect(overridden).not.toContain("py-2.5");
  });

  it("gives clickable rows the pointer cursor", () => {
    expect(render(<View columns={plain} rowsClickable />).container.querySelector("tbody tr")!.className).toContain("cursor-pointer");
    expect(render(<View columns={plain} />).container.querySelector("tbody tr")!.className).not.toContain("cursor-pointer");
  });
});
