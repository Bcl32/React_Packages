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
        // Compare via a NaN-safe key: two unparseable timestamps must count
        // as EQUAL (NaN !== NaN is true, which turned any invalid pair into
        // a phantom always-active filter).
        const timeKey = (v: string) => {
          const t = new Date(v).getTime();
          return Number.isNaN(t) ? "invalid" : t;
        };
        if (
          timeKey(dtValue["timespan_begin"]) !== timeKey(dtEmpty["timespan_begin"])
        ) {
          active_filters[key] = { ...filter, timespan_begin: "filter" } as FilterValue;
          break;
        }
        if (
          timeKey(dtValue["timespan_end"]) !== timeKey(dtEmpty["timespan_end"])
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
