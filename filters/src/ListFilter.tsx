import * as React from "react";
import { FilterContext } from "./FilterContext";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { FilterContextValue } from "./types";

interface ListOption {
  label: string;
}

interface ListFilterProps {
  name: string;
  options: (string | ListOption)[];
}

export function ListFilter({ name, options }: ListFilterProps): JSX.Element | null {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safe access to filter data - handles React batching timing issues
  const filterData = context?.filters?.[name];

  // Guard: don't render until filter data is available
  if (!filterData || !context) {
    return null;
  }

  //special formData updater function for select comboboxes as input differs from other inputs are objects and multiple items can used
  function handleComboboxChange(fieldName: string, value: (string | ListOption)[]) {
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
        onChange={(_event, value) => handleComboboxChange(name, value as (string | ListOption)[])}
        sx={{
          '& .MuiInputBase-root': {
            backgroundColor: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            borderRadius: '0.375rem',
            borderColor: 'hsl(var(--input))',
            '&:hover': {
              borderColor: 'hsl(var(--ring))',
            },
            '&.Mui-focused': {
              borderColor: 'hsl(var(--ring))',
              boxShadow: '0 0 0 2px hsl(var(--ring) / 0.2)',
            },
          },
          '& .MuiInputBase-input': {
            color: 'hsl(var(--foreground))',
          },
          '& .MuiInputLabel-root': {
            color: 'hsl(var(--muted-foreground))',
          },
          '& .MuiChip-root': {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder={`Add ${name}...`}
          />
        )}
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
