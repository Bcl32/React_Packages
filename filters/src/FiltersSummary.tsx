import * as React from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
// Registered here historically; kept so nothing that relies on the plugin
// being loaded by this module changes.
dayjs.extend(duration);

import { Button } from "@bcl32/utils/Button";
import { FilterContext } from "./FilterContext";
import { summaryValue } from "./filterText";
import type { Filters, FilterContextValue } from "./types";
import { capitalize } from "./utils";

interface FiltersSummaryProps {
  active_filters: Filters;
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
          {Object.keys(active_filters).map((key) => {
            // Safety check: ensure filter exists before accessing
            if (!context.filters[key]) {
              return null;
            }

            const filter_value = summaryValue(context.filters[key]);

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

  const filter = context.filters[name];
  // User-added instances are removed outright; declared ones reset to their
  // full range (same rule as the ✕ on a toolbar chip).
  const isDynamic = !!filter.dynamic && !!context.remove_filter;
  const label = filter.title ?? capitalize(filter.field ?? name);

  return (
    <div className="flex flex-row grid xl:grid-cols-12" key={name}>
      <span className="font-semibold col-span-4">
        {label}:
      </span>

      <span className="whitespace-pre-line col-span-6">{filter_value}</span>

      <Button
        onClick={() =>
          isDynamic
            ? context.remove_filter!(name)
            : context.change_filters(name, "value", structuredClone(filter["filter_empty"]))
        }
        variant="default"
        size="lg"
        className="col-span-2"
      >
        {isDynamic ? "Remove" : "Reset"}
      </Button>
    </div>
  );
}
