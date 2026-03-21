import { useContext } from "react";
import { FilterContext } from "./FilterContext";
import type { FilterContextValue } from "./types";

export function useFilterContext(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error(
      "useFilterContext must be used within a FilterProvider or FilterContext.Provider"
    );
  }
  return context;
}
