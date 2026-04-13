import type { Filters, FilterData, GroupedFilters } from "./types";

export function GroupFilters(filters: Filters): GroupedFilters {
  const primary_filters: FilterData[] = [];
  const string_filters: FilterData[] = [];
  const numeric_filters: FilterData[] = [];
  const options_filters: FilterData[] = [];
  const time_filters: FilterData[] = [];

  Object.keys(filters).forEach((key) => {
    const entry = { ...filters[key], name: key } as FilterData;

    if (filters[key].primaryFilter) {
      primary_filters.push(entry);
      return;
    }

    if (filters[key]["type"] === "string") {
      string_filters.push(entry);
    }

    if (filters[key]["type"] === "number") {
      numeric_filters.push(entry);
    }

    if (filters[key]["type"] === "options") {
      options_filters.push(entry);
    }

    if (filters[key]["type"] === "datetime") {
      time_filters.push(entry);
    }
  });

  return {
    primary_filters,
    string_filters,
    numeric_filters,
    options_filters,
    time_filters,
  };
}
