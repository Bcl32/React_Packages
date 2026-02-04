//THIRD PARTY LIBRARIES
import React from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";

//my custom components
import { GroupFilters } from "./GroupFilters";
import { AnimatedTabs, TabContent } from "@bcl32/utils/AnimatedTabs";
import { FilterElement } from "@bcl32/filters/FilterElement";
import { FilterContext } from "@bcl32/filters/FilterContext";

export function AllFilters({
  ModelData,
  dataset,
  ...props
}) {
  // Get filters from Context (single source of truth)
  const { filters } = React.useContext(FilterContext);

  // Safety check: Don't render until filters are initialized
  if (!filters || Object.keys(filters).length === 0) {
    return <div className="p-2 text-sm text-muted-foreground">Initializing filters...</div>;
  }

  let {
    string_filters,
    numeric_filters,
    select_filters,
    list_filters,
    time_filters,
  } = GroupFilters(filters);

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

              {/* {select_filters.map((entry) => {
                return (
                  <FilterElement key={entry["name"]} filter_data={entry} />
                );
              })} */}

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
