import React from "react";

export function InitializeFilters(model_data, datasetStats) {
  // Early return if datasetStats is not ready (race condition during initial load)
  if (!datasetStats || Object.keys(datasetStats).length === 0) {
    console.log("InitializeFilters: datasetStats not ready yet, skipping initialization");
    return {};
  }

  var filter_start = {};
  model_data.map(function (item, index, array) {
    if (item["filter"]) {
      var filter = {
        type: item["type"],
        value: item["filter_empty"],
        rule: item["filter_rule"],
        filter_empty: JSON.parse(JSON.stringify(item["filter_empty"])),
      };
      var title = item["name"];
      filter_start[title] = filter;

      if (item["options"]) {
        filter_start[title]["options"] = item["options"];
      }

      if (item["type"] === "number") {
        //get the earliest and latest stat objects and assign to filter empty and value for filters
        var min = datasetStats[title].find((obj) => {
          return obj.name == "min";
        })["value"];
        var max = datasetStats[title].find((obj) => {
          return obj.name == "max";
        })["value"];

        filter_start[title]["filter_empty"]["min"] = min;
        filter_start[title]["value"]["min"] = min;

        filter_start[title]["filter_empty"]["max"] = max;
        filter_start[title]["value"]["max"] = max;
      }

      if (item["type"] === "datetime") {
        //get the earliest and latest stat objects and assign to filter empty and value for filters
        var earliest = datasetStats[title].find((obj) => {
          return obj.name == "earliest";
        })["value"];
        var latest = datasetStats[title].find((obj) => {
          return obj.name == "latest";
        })["value"];

        filter_start[title]["filter_empty"]["timespan_begin"] = earliest;
        filter_start[title]["value"]["timespan_begin"] = earliest;

        filter_start[title]["filter_empty"]["timespan_end"] = latest;
        filter_start[title]["value"]["timespan_end"] = latest;
      }
    }
  });

  return filter_start;
}
