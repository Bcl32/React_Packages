import React from "react";
//context
import { FilterContext } from "./FilterContext";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

//MONOREPO PACKAGE IMPORTS
import { ToggleGroup, ToggleGroupItem } from "@bcl32/utils/ToggleGroup";

export function ListFilter({ name, options, ...props }) {
  var { filters, change_filters } = React.useContext(FilterContext);
  //special formData updater function for select comboboxes as input differs from other inputs are objects and multiple items can used
  function handleComboboxChange(name, value) {
    var entries = [];
    value.forEach(function (item) {
      //get labels from each selected object in array
      if (typeof item.label == "undefined") {
        //custom entries don't have label key
        entries.push(item);
      } else {
        entries.push(item.label);
      } //entries from combobox are in an object with label key
    });

    change_filters(name, "value", entries);
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
        value={filters[name]["value"]}
        onChange={(event, value) => handleComboboxChange(name, value)}
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
        value={filters[name]["rule"]}
        onValueChange={(value) => {
          console.log(name, "rule", value);
          change_filters(name, "rule", value);
        }}
      >
        <ToggleGroupItem value="any">{"any"}</ToggleGroupItem>
        <ToggleGroupItem value="all">{"all"}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
