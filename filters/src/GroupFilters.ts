import type { Filters, FilterData, GroupedFilters } from "./types";

export function GroupFilters(filters: Filters): GroupedFilters {
  const primary_filters: FilterData[] = [];
  const string_filters: FilterData[] = [];
  const numeric_filters: FilterData[] = [];
  const select_filters: FilterData[] = [];
  const list_filters: FilterData[] = [];
  const time_filters: FilterData[] = [];
  const colour_filters: FilterData[] = [];

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

    if (filters[key]["type"] === "select" || filters[key]["type"] === "toggle") {
      select_filters.push(entry);
    }

    if (filters[key]["type"] === "list") {
      list_filters.push(entry);
    }

    if (filters[key]["type"] === "datetime") {
      time_filters.push(entry);
    }

    if (filters[key]["type"] === "colour") {
      colour_filters.push(entry);
    }
  });

  return {
    primary_filters,
    string_filters,
    numeric_filters,
    select_filters,
    list_filters,
    time_filters,
    colour_filters,
  };
}
