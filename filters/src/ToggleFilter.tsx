import * as React from "react";
import { FilterContext } from "./FilterContext";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { FilterContextValue } from "./types";
import { capitalize } from "./utils";

interface ToggleFilterProps {
  name: string;
  options: (string | { label: string })[];
}

export function ToggleFilter({ name, options }: ToggleFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  const filterData = context?.filters?.[name];

  if (!filterData || !context) {
    return null;
  }

  const currentValue = Array.isArray(filterData["value"]) ? filterData["value"] as string[] : [];

  return (
    <div>
      <span className="font-semibold">
        {capitalize(name)}:
      </span>
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={currentValue}
        onValueChange={(value) => {
          context.change_filters(name, "value", value);
        }}
        className="flex flex-wrap gap-1 mt-1"
      >
        {options.map((o) => {
          const label = typeof o === "string" ? o : o.label;
          return (
            <ToggleGroupItem key={label} value={label}>
              {capitalize(label)}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
