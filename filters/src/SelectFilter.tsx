import * as React from "react";
import { FilterContext } from "./FilterContext";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { FilterContextValue } from "./types";
import { extractLabels, capitalize } from "./utils";

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

  function handleComboboxChange(fieldName: string, value: (string | { label: string })[]) {
    context?.change_filters(fieldName, "value", extractLabels(value));
  }

  return (
    <div>
      <span className="font-semibold">
        {capitalize(name)}:
      </span>

      <Autocomplete
        freeSolo
        multiple
        options={options}
        value={filterData["value"] as string[]}
        onChange={(_event, value) => handleComboboxChange(name, value as (string | { label: string })[])}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            label={name}
            placeholder="test"
          />
        )}
      />
    </div>
  );
}
