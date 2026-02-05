import * as React from "react";
import type { FilterContextValue } from "./types";

export const FilterContext = React.createContext<FilterContextValue | null>(null);

export type { FilterContextValue, Filters, FilterValue } from "./types";
