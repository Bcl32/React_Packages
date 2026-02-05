import type { Filters, FilterValue } from "./types";

interface DatetimeFilterValue {
  timespan_begin: string;
  timespan_end: string;
}

export function GetActiveFilters(filters: Filters): Filters {
  const active_filters: Filters = {};

  for (const key in filters) {
    const filter = filters[key];

    switch (filter["type"]) {
      case "string":
      case "number":
        if (filter["value"] !== filter["filter_empty"]) {
          active_filters[key] = filter;
        }
        break;
      case "list":
      case "select": {
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
