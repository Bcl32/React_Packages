import React from "react";

export function GroupFilters(filters) {
  let string_filters = [];
  let numeric_filters = [];
  let select_filters = [];
  let list_filters = [];
  let time_filters = [];

  Object.keys(filters).forEach((key) => {
    if (filters[key]["type"] == "string") {
      const entry = JSON.parse(JSON.stringify(filters[key]));
      entry["name"] = key;
      string_filters.push(entry);
    }

    if (filters[key]["type"] == "number") {
      const entry = JSON.parse(JSON.stringify(filters[key]));
      entry["name"] = key;
      numeric_filters.push(entry);
    }

    if (filters[key]["type"] == "select") {
      const entry = JSON.parse(JSON.stringify(filters[key]));
      entry["name"] = key;
      select_filters.push(entry);
    }

    if (filters[key]["type"] == "list") {
      const entry = JSON.parse(JSON.stringify(filters[key]));
      entry["name"] = key;
      list_filters.push(entry);
    }

    if (filters[key]["type"] == "datetime") {
      const entry = JSON.parse(JSON.stringify(filters[key]));
      entry["name"] = key;
      time_filters.push(entry);
    }
  });

  return {
    string_filters: string_filters,
    numeric_filters: numeric_filters,
    select_filters: select_filters,
    list_filters: list_filters,
    time_filters: time_filters,
  };
}
