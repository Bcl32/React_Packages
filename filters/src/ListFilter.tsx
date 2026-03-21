import * as React from "react";
import { FilterContext } from "./FilterContext";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";
import type { FilterContextValue } from "./types";
import { extractLabels, capitalize } from "./utils";

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
        value={Array.isArray(filterData["value"]) ? filterData["value"] as string[] : []}
        onChange={(_event, value) => handleComboboxChange(name, value as (string | { label: string })[])}
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
