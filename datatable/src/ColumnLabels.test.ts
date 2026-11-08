import type { Column } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import type { ModelData, RowData } from "@bcl32/data-utils";

import { columnCardLabel, columnLabelText } from "./ColumnLabels";

const ModelData = {
  model_attributes: [
    { name: "weight_g", type: "number", title: "Weight", unit: "g", unit_label: "g" },
    { name: "status", type: "string", title: "Status" },
  ],
} as unknown as ModelData;

const column = (id: string, meta?: unknown) =>
  ({ id, columnDef: { meta } }) as unknown as Column<RowData, unknown>;

describe("column labels", () => {
  it("name a field's stored unit, because an app's cell prints the number as stored", () => {
    expect(columnLabelText(column("weight_g"), ModelData)).toBe("Weight (g)");
    expect(columnCardLabel(column("weight_g"), ModelData)).toBe("Weight (g)");
  });

  it("add nothing to a field with no unit", () => {
    expect(columnLabelText(column("status"), ModelData)).toBe("Status");
  });

  it("leave a hand-written card label alone", () => {
    expect(columnLabelText(column("weight_g", { card: { label: "Mass" } }), ModelData)).toBe("Mass");
  });
});
