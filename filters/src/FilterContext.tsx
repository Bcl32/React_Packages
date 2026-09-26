import * as React from "react";
import type { FilterContextValue } from "./types";

/**
 * The context every filter control reads. Internal to the package: apps mount
 * it with FilterProvider and read it with useFilterContext.
 */
export const FilterContext = React.createContext<FilterContextValue | null>(null);

export type { FilterContextValue, Filters, FilterValue } from "./types";
