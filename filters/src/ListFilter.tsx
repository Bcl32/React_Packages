import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Combobox } from "@bcl32/utils/Combobox";
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { FilterContextValue } from "./types";
import { capitalize } from "./utils";

interface ListFilterProps {
  name: string;
  options: (string | { label: string })[];
}

export function ListFilter({ name, options }: ListFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  const stringOptions = options.map((o) => (typeof o === "string" ? o : o.label));
  const currentValue = Array.isArray(filterData["value"]) ? filterData["value"] as string[] : [];

  return (
    <div>
      <span className="font-semibold">
        {capitalize(name)}:
      </span>

      <Combobox
        multiple
        freeSolo
        options={stringOptions}
        value={currentValue}
        onChange={(value) => context?.change_filters(name, "value", value)}
        placeholder={`Add ${name}...`}
      />

      <ToggleGroup
        type="single"
        variant="outline"
        value={filterData["rule"]}
        onValueChange={(value) => {
          context?.change_filters(name, "rule", value);
        }}
      >
        <ToggleGroupItem value="any">{"any"}</ToggleGroupItem>
        <ToggleGroupItem value="all">{"all"}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
