import React from "react";
//other modules
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

//MONOREPO PACKAGE IMPORTS
import { Button } from "@bcl32/utils/Button";
import { FilterContext } from "./FilterContext";

export function FiltersSummary({ active_filters }) {
  // Get filters from Context (single source of truth)
  const { filters } = React.useContext(FilterContext);

  // Safety check: Don't render until filters are initialized
  if (!filters || Object.keys(filters).length === 0) {
    return null;
  }

  const hasActiveFilters = Object.entries(active_filters).length > 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Applied Filters</h2>

      {!hasActiveFilters && (
        <p className="text-muted-foreground">No active filters</p>
      )}

      {hasActiveFilters && (
        <>
          {Object.entries(active_filters).map(([key, entry]) => {
            // Safety check: ensure filter exists before accessing
            if (!filters[key]) {
              return null;
            }

            if (entry["type"] === "datetime") {
              var start = filters[key]["value"]["timespan_begin"];
              var end = filters[key]["value"]["timespan_end"];

              var filter_value =
                "Start: " +
                dayjs(start).format("MMM, D YYYY - h:mma") +
                "\n End: " +
                dayjs(end).format("MMM, D YYYY - h:mma");
            } else {
              var filter_value =
                filters[key]["rule"] + " " + filters[key]["value"];
            }

            return (
              <FiltersEntry
                key={"filter-summary" + key}
                name={key}
                entry={entry}
                filter_value={filter_value}
              ></FiltersEntry>
            );
          })}
        </>
      )}
    </div>
  );
}

function FiltersEntry({ name, entry, filter_value }) {
  // Get filters and change_filters from Context
  const { filters, change_filters } = React.useContext(FilterContext);

  // Safety check
  if (!filters || !filters[name]) {
    return null;
  }

  return (
    <div className="flex flex-row grid xl:grid-cols-12" key={name}>
      <span className="font-semibold col-span-4">
        {/* capitalizes the string */}
        {name[0].toUpperCase() + name.slice(1)}:
      </span>

      <span className="whitespace-pre-line col-span-6">{filter_value}</span>

      <Button
        onClick={() =>
          change_filters(name, "value", filters[name]["filter_empty"])
        }
        variant="default"
        size="lg"
        className="col-span-2"
      >
        Reset
      </Button>
    </div>
  );
}
