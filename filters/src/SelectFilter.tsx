import * as React from "react";
import { FilterContext } from "./FilterContext";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { FilterContextValue } from "./types";

interface SelectOption {
  label: string;
}

interface SelectFilterProps {
  name: string;
  options: (string | SelectOption)[];
}

export function SelectFilter({ name, options }: SelectFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  //special formData updater function for select comboboxes as input differs from other inputs are objects and multiple items can used
  function handleComboboxChange(fieldName: string, value: (string | SelectOption)[]) {
    const entries: string[] = [];
    value.forEach(function (item) {
      //get labels from each selected object in array
      if (typeof item === "string") {
        //custom entries don't have label key
        entries.push(item);
      } else if (item.label) {
        entries.push(item.label);
      }
    });

    context?.change_filters(fieldName, "value", entries);
  }

  return (
    <div>
      <span className="font-semibold">
        {/* capitalizes the string */}
        {name[0].toUpperCase() + name.slice(1)}:
      </span>

      <Autocomplete
        freeSolo
        multiple
        options={options}
        value={filterData["value"] as string[]}
        onChange={(_event, value) => handleComboboxChange(name, value as (string | SelectOption)[])}
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
