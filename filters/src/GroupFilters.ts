import type { Filters, FilterData, GroupedFilters } from "./types";

export function GroupFilters(filters: Filters): GroupedFilters {
  const string_filters: FilterData[] = [];
  const numeric_filters: FilterData[] = [];
  const select_filters: FilterData[] = [];
  const list_filters: FilterData[] = [];
  const time_filters: FilterData[] = [];

  Object.keys(filters).forEach((key) => {
    if (filters[key]["type"] === "string") {
      const entry = JSON.parse(JSON.stringify(filters[key])) as FilterData;
      entry["name"] = key;
      string_filters.push(entry);
    }

    if (filters[key]["type"] === "number") {
      const entry = JSON.parse(JSON.stringify(filters[key])) as FilterData;
      entry["name"] = key;
      numeric_filters.push(entry);
    }

    if (filters[key]["type"] === "select") {
      const entry = JSON.parse(JSON.stringify(filters[key])) as FilterData;
      entry["name"] = key;
      select_filters.push(entry);
    }

    if (filters[key]["type"] === "list") {
      const entry = JSON.parse(JSON.stringify(filters[key])) as FilterData;
      entry["name"] = key;
      list_filters.push(entry);
    }

    if (filters[key]["type"] === "datetime") {
      const entry = JSON.parse(JSON.stringify(filters[key])) as FilterData;
      entry["name"] = key;
      time_filters.push(entry);
    }
  });

  return {
    string_filters,
    numeric_filters,
    select_filters,
    list_filters,
    time_filters,
  };
}
