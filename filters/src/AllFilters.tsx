import * as React from "react";

import { OrderFilters } from "./OrderFilters";
import { FilterElement } from "./FilterElement";
import { AddFilterPicker } from "./AddFilterPicker";
import { FilterContext } from "./FilterContext";
import type { FilterContextValue, FilterData } from "./types";

export function AllFilters(): JSX.Element {
  // Get filters from Context (single source of truth)
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  const catalog = context?.filter_catalog ?? [];
  const canAddFilters = !!context?.add_filter && catalog.length > 0;

  // Safety check: Don't render until filters are initialized. An empty filter
  // map is legitimate once filters are add-on-demand, so a usable catalog is
  // enough to render.
  if (!context?.filters || (Object.keys(context.filters).length === 0 && !canAddFilters)) {
    return <div className="p-2 text-sm text-muted-foreground">Initializing filters...</div>;
  }

  // One section rather than per-kind tabs: with numeric/date/text filters all
  // created on demand, the tabs were mostly empty containers for a picker.
  const ordered = OrderFilters(context.filters);

  return (
    <div className="space-y-1.5">
      {canAddFilters && (
        <div className="flex items-center gap-2">
          <AddFilterPicker
            catalog={catalog}
            onAdd={(field) => context.add_filter!(field)}
          />
          {ordered.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Pick an attribute to start filtering.
            </span>
          )}
        </div>
      )}

      {/* Same two-up-and-wider grid as the inline filter bar — this panel used
          to stack every filter in one column, which made a dialog of six
          filters scroll for no reason. */}
      <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((entry: FilterData) => (
          <FilterElement key={entry["name"]} filter_data={entry} />
        ))}
      </div>
    </div>
  );
}
