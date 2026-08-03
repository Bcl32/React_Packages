import * as React from "react";
import { FilterContext } from "./FilterContext";
import type { Filters, FilterCatalogEntry, FilterInitialValue } from "./types";

interface FilterProviderProps {
  filters: Filters;
  changeFilters: (name: string, key: string, value: unknown) => void;
  // Optional: supply these to enable user-added filter instances. Components
  // fall back to read-only behaviour when they're absent, so existing
  // consumers keep working unchanged.
  addFilter?: (field: string, initial?: FilterInitialValue) => string | null;
  removeFilter?: (name: string) => void;
  filterCatalog?: FilterCatalogEntry[];
  children: React.ReactNode;
}

export function FilterProvider({
  filters,
  changeFilters,
  addFilter,
  removeFilter,
  filterCatalog,
  children,
}: FilterProviderProps) {
  const contextValue = React.useMemo(
    () => ({
      filters,
      change_filters: changeFilters,
      add_filter: addFilter,
      remove_filter: removeFilter,
      filter_catalog: filterCatalog,
    }),
    [filters, changeFilters, addFilter, removeFilter, filterCatalog]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}
