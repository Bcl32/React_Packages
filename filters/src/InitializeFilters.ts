import type { Filters, ModelAttribute, DatasetStats, FilterValue, NumberRange, DatetimeFilterValue } from "./types";

const OPTIONS_FIELDS = [
  "options",
  "source_kind",
  "selection",
  "display",
  "value_key",
  "label_key",
  "colour_presets",
] as const;

export function InitializeFilters(model_data: ModelAttribute[], datasetStats: DatasetStats): Filters {
  // Early return if datasetStats is not ready (race condition during initial load)
  if (!datasetStats || Object.keys(datasetStats).length === 0) {
    return {};
  }

  const filter_start: Filters = {};

  model_data.forEach(function (item) {
    if (item["filter"]) {
      const declaredFilterType = item["filter_type"] as FilterValue["type"] | undefined;
      const dataType = item["type"] as string;
      const resolvedType: FilterValue["type"] =
        declaredFilterType ??
        (dataType === "string" || dataType === "number" || dataType === "datetime"
          ? dataType
          : "options");
      const filter: FilterValue = {
        type: resolvedType,
        value: item["filter_empty"],
        rule: item["filter_rule"],
        filter_empty: structuredClone(item["filter_empty"]),
      };
      const title = item["name"];
      filter_start[title] = filter;

      if (resolvedType === "options") {
        for (const field of OPTIONS_FIELDS) {
          if (item[field] !== undefined) {
            (filter_start[title] as unknown as Record<string, unknown>)[field] = item[field];
          }
        }
      }

      if (item["primaryFilter"]) {
        (filter_start[title] as unknown as Record<string, unknown>)["primaryFilter"] = true;
      }

      if (item["filterOrder"] !== undefined) {
        (filter_start[title] as unknown as Record<string, unknown>)["filterOrder"] = item["filterOrder"];
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
