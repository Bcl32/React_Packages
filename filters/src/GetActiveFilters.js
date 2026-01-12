import React from "react";

export function GetActiveFilters(filters) {
  var active_filters = {};

  for (const key in filters) {
    var filter = filters[key];

    switch (filter["type"]) {
      case "string":
      case "number":
        if (filter["value"] != filter["filter_empty"]) {
          active_filters[key] = filter;
        }
        break;
      case "list":
      case "select":
        if (filter["value"].length != 0) {
          active_filters[key] = filter;
        }
        break;
      case "datetime":
        if (
          new Date(filter["value"]["timespan_begin"]).getTime() !=
          new Date(filter["filter_empty"]["timespan_begin"]).getTime()
        ) {
          active_filters[key] = filter;
          active_filters[key]["timespan_begin"] = "filter";
          break;
        }
        if (
          new Date(filter["value"]["timespan_end"]).getTime() !=
          new Date(filter["filter_empty"]["timespan_end"]).getTime()
        ) {
          active_filters[key] = filter;
          break;
        }
    }
  }

  return active_filters;
}
