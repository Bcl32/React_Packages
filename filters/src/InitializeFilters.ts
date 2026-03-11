import type { Filters, ModelAttribute, DatasetStats, FilterValue, NumberRange, DatetimeFilterValue } from "./types";

export function InitializeFilters(model_data: ModelAttribute[], datasetStats: DatasetStats): Filters {
  // Early return if datasetStats is not ready (race condition during initial load)
  if (!datasetStats || Object.keys(datasetStats).length === 0) {
    return {};
  }

  const filter_start: Filters = {};

  model_data.forEach(function (item) {
    if (item["filter"]) {
      const filter: FilterValue = {
        type: item["type"] as FilterValue["type"],
        value: item["filter_empty"],
        rule: item["filter_rule"],
        filter_empty: structuredClone(item["filter_empty"]),
      };
      const title = item["name"];
      filter_start[title] = filter;

      if (item["options"]) {
        filter_start[title]["options"] = item["options"] as string[];
      }

      if (item["type"] === "number") {
        //get the earliest and latest stat objects and assign to filter empty and value for filters
        const minStat = datasetStats[title].find((obj) => {
          return obj.name === "min";
        });
        const maxStat = datasetStats[title].find((obj) => {
          return obj.name === "max";
        });

        const min = minStat?.["value"] as number;
        const max = maxStat?.["value"] as number;

        const filterEmpty = filter_start[title]["filter_empty"] as NumberRange;
        const filterValue = filter_start[title]["value"] as NumberRange;

        filterEmpty["min"] = min;
        filterValue["min"] = min;

        filterEmpty["max"] = max;
        filterValue["max"] = max;
      }

      if (item["type"] === "datetime") {
        //get the earliest and latest stat objects and assign to filter empty and value for filters
        const earliestStat = datasetStats[title].find((obj) => {
          return obj.name === "earliest";
        });
        const latestStat = datasetStats[title].find((obj) => {
          return obj.name === "latest";
        });

        const earliest = earliestStat?.["value"] as string;
        const latest = latestStat?.["value"] as string;

        const filterEmpty = filter_start[title]["filter_empty"] as DatetimeFilterValue;
        const filterValue = filter_start[title]["value"] as DatetimeFilterValue;

        filterEmpty["timespan_begin"] = earliest;
        filterValue["timespan_begin"] = earliest;

        filterEmpty["timespan_end"] = latest;
        filterValue["timespan_end"] = latest;
      }
    }
  });

  return filter_start;
}
