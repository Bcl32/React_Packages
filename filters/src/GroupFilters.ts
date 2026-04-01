import type { Filters, FilterData, GroupedFilters } from "./types";

export function GroupFilters(filters: Filters): GroupedFilters {
  const string_filters: FilterData[] = [];
  const numeric_filters: FilterData[] = [];
  const select_filters: FilterData[] = [];
  const list_filters: FilterData[] = [];
  const time_filters: FilterData[] = [];
  const colour_filters: FilterData[] = [];

  Object.keys(filters).forEach((key) => {
    if (filters[key]["type"] === "string") {
      string_filters.push({ ...filters[key], name: key } as FilterData);
    }

    if (filters[key]["type"] === "number") {
      numeric_filters.push({ ...filters[key], name: key } as FilterData);
    }

    if (filters[key]["type"] === "select") {
      select_filters.push({ ...filters[key], name: key } as FilterData);
    }

    if (filters[key]["type"] === "list") {
      list_filters.push({ ...filters[key], name: key } as FilterData);
    }

    if (filters[key]["type"] === "datetime") {
      time_filters.push({ ...filters[key], name: key } as FilterData);
    }

    if (filters[key]["type"] === "colour") {
      colour_filters.push({ ...filters[key], name: key } as FilterData);
    }
  });

  return {
    string_filters,
    numeric_filters,
    select_filters,
    list_filters,
    time_filters,
    colour_filters,
  };
}
