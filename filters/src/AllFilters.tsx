import * as React from "react";

import { GroupFilters } from "./GroupFilters";
import { AnimatedTabs, TabContent } from "@bcl32/utils/AnimatedTabs";
import { FilterElement } from "./FilterElement";
import { FilterContext } from "./FilterContext";
import type { FilterContextValue } from "./types";

interface AllFiltersProps {
  ModelData?: unknown;
  dataset?: unknown;
}

export function AllFilters(_props: AllFiltersProps): JSX.Element {
  // Get filters from Context (single source of truth)
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  // Safety check: Don't render until filters are initialized
  if (!context?.filters || Object.keys(context.filters).length === 0) {
    return <div className="p-2 text-sm text-muted-foreground">Initializing filters...</div>;
  }

  const {
    string_filters,
    numeric_filters,
    list_filters,
    time_filters,
  } = GroupFilters(context.filters);

  return (
    <div>
      <div>
        <AnimatedTabs tab_titles={["Text Filters","Time Filters"]}>
          <div className="overflow-auto">

            <TabContent unmount={false}>
              {string_filters.map((entry) => {
                return (
                  <FilterElement key={entry["name"]} filter_data={entry} />
                );
              })}

              {numeric_filters.map((entry) => {
                return (
                  <FilterElement key={entry["name"]} filter_data={entry} />
                );
              })}

              {list_filters.map((entry) => {
                return (
                  <FilterElement key={entry["name"]} filter_data={entry} />
                );
              })}
            </TabContent>

            <TabContent>
              {time_filters.map((entry) => {
                return (
                  <FilterElement key={entry["name"]} filter_data={entry} />
                );
              })}
            </TabContent>
          </div>
        </AnimatedTabs>
      </div>
    </div>
  );
}
