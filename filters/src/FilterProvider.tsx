import * as React from "react";
import { FilterContext } from "./FilterContext";
import type { Filters } from "./types";

interface FilterProviderProps {
  filters: Filters;
  changeFilters: (name: string, key: string, value: unknown) => void;
  children: React.ReactNode;
}

export function FilterProvider({
  filters,
  changeFilters,
  children,
}: FilterProviderProps) {
  const contextValue = React.useMemo(
    () => ({ filters, change_filters: changeFilters }),
    [filters, changeFilters]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}
