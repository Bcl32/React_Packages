import * as React from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

import { Button } from "@bcl32/utils/Button";
import { FilterContext } from "./FilterContext";
import type { Filters, FilterContextValue } from "./types";

interface FiltersSummaryProps {
  active_filters: Filters;
}

interface DatetimeFilterValue {
  timespan_begin: string;
  timespan_end: string;
}

export function FiltersSummary({ active_filters }: FiltersSummaryProps): JSX.Element | null {
  // Get filters from Context (single source of truth)
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safety check: Don't render until filters are initialized
  if (!context?.filters || Object.keys(context.filters).length === 0) {
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
            if (!context.filters[key]) {
              return null;
            }

            let filter_value: string;
            if (entry["type"] === "datetime") {
              const dtValue = context.filters[key]["value"] as DatetimeFilterValue;
              const start = dtValue["timespan_begin"];
              const end = dtValue["timespan_end"];

              filter_value =
                "Start: " +
                dayjs(start).format("MMM, D YYYY - h:mma") +
                "\n End: " +
                dayjs(end).format("MMM, D YYYY - h:mma");
            } else {
              filter_value =
                context.filters[key]["rule"] + " " + context.filters[key]["value"];
            }

            return (
              <FiltersEntry
                key={"filter-summary" + key}
                name={key}
                filter_value={filter_value}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

interface FiltersEntryProps {
  name: string;
  filter_value: string;
}

function FiltersEntry({ name, filter_value }: FiltersEntryProps): JSX.Element | null {
  // Get filters and change_filters from Context
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safety check
  if (!context?.filters || !context.filters[name]) {
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
          context.change_filters(name, "value", context.filters[name]["filter_empty"])
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
