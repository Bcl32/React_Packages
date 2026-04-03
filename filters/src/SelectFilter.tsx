import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Combobox } from "@bcl32/utils/Combobox";
import type { FilterContextValue } from "./types";
import { capitalize } from "./utils";

interface SelectFilterProps {
  name: string;
  options: (string | { label: string })[];
}

export function SelectFilter({ name, options }: SelectFilterProps): JSX.Element | null {
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
        placeholder={`Filter ${name}...`}
      />
    </div>
  );
}
