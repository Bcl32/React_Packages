import type { Filters, FilterValue, DatetimeFilterValue, NumberRange } from "./types";

export function GetActiveFilters(filters: Filters): Filters {
  const active_filters: Filters = {};

  for (const key in filters) {
    const filter = filters[key];

    switch (filter["type"]) {
      case "string":
        if (filter["value"] !== filter["filter_empty"]) {
          active_filters[key] = filter;
        }
        break;
      case "number": {
        const numValue = filter["value"] as NumberRange;
        const numEmpty = filter["filter_empty"] as NumberRange;
        if (numValue["min"] !== numEmpty["min"] || numValue["max"] !== numEmpty["max"]) {
          active_filters[key] = filter;
        }
        break;
      }
      case "options": {
        const arrValue = filter["value"] as string[];
        if (arrValue.length !== 0) {
          active_filters[key] = filter;
        }
        break;
      }
      case "datetime": {
        const dtValue = filter["value"] as DatetimeFilterValue;
        const dtEmpty = filter["filter_empty"] as DatetimeFilterValue;
        if (
          new Date(dtValue["timespan_begin"]).getTime() !==
          new Date(dtEmpty["timespan_begin"]).getTime()
        ) {
          active_filters[key] = { ...filter, timespan_begin: "filter" } as FilterValue;
          break;
        }
        if (
          new Date(dtValue["timespan_end"]).getTime() !==
          new Date(dtEmpty["timespan_end"]).getTime()
        ) {
          active_filters[key] = filter;
          break;
        }
        break;
      }
    }
  }

  return active_filters;
}
