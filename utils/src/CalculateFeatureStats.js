import React from "react";

import dayjs from "dayjs";
import { bin } from "d3";
import { ComputeTimeBounds } from "./ComputeTimeBounds";
import { ComputeGroupedStats } from "./ComputeGroupedStats";
import { DoubleGroupStats } from "./ComputeGroupedStats";

export function CalculateFeatureStats(metadata, dataset) {
  var stats = {};

  metadata.map(function (item, index, array) {
    var name = item["name"];
    stats[name] = [];

    if (item["type"] === "number") {
      // Filter out entries where the value is null or undefined
      const validValues = dataset
        .map((entry) => entry[name])
        .filter((val) => val != null && !isNaN(val));

      var min = {
        name: "min",
        type: "number",
        value: validValues.length > 0 ? Math.min(...validValues) : 0,
      };
      var max = {
        name: "max",
        type: "number",
        value: validValues.length > 0 ? Math.max(...validValues) : 0,
      };

      var bins = bin().value((d) => d[name] ?? 0)(dataset);
      var bins = bins.map((entry) => {
        return {
          x0: entry["x0"],
          x1: entry["x1"],
          count: entry.length,
          range: entry["x0"] + "-" + entry["x1"],
        };
      });

      var bin_stat = {
        name: "bins",
        type: "bins",
        value: bins,
      };

      stats[name].push(min, max, bin_stat);
    }

    if (item["type"] === "list") {
      var counts = {};

      var options = new Set();
      dataset.map((entry) => {
        // Check if entry[name] exists and is an array before mapping
        if (entry && entry[name] && Array.isArray(entry[name])) {
          entry[name].map((option) => {
            if (counts[option]) {
              counts[option] += 1;
            } else {
              counts[option] = 1;
            }
            options.add(option);
          });
        }
      });

      var session_counts = [];
      for (var [key, value] of Object.entries(counts)) {
        //convert list of counts into {length: 7, name: 'nab'} format
        var entry = { length: value, name: key };
        session_counts.push(entry);
      }

      var count = {
        name: "count",
        type: "count",
        value: session_counts,
      };

      var options = {
        name: "options",
        type: "list",
        value: Array.from(options.values()),
      };

      stats[name].push(count, options);
    }

    if (item["type"] === "string" || item["type"] === "select") {
      var entry = {
        name: "count",
        type: "count",
        value: ComputeGroupedStats(dataset, name),
      };
      stats[name].push(entry);
    }

    if (item["type"] === "datetime") {
      var [earliest_datetime, latest_datetime] = ComputeTimeBounds(
        dataset,
        name
      );

      var earliest = {
        name: "earliest",
        type: "datetime",
        value: earliest_datetime,
      };
      var latest = {
        name: "latest",
        type: "datetime",
        value: latest_datetime,
      };

      stats[name].push(earliest, latest);

      if (item["stats"]) {
        //don't compute these time bins for time_created, time_updated
        dataset = dataset.map((item) => convert_dates(item, name));

        var daily = ComputeGroupedStats(dataset, name + "-day");
        daily = daily.sort(sort_dates("name"));

        var weekly = ComputeGroupedStats(dataset, name + "-week");
        weekly = weekly.sort(sort_dates("name"));

        var monthly = ComputeGroupedStats(dataset, name + "-month");
        monthly = monthly.sort(sort_dates("name"));

        var monthly_severity = DoubleGroupStats(
          dataset,
          name + "-month",
          "severity"
        );

        var stat_monthly_severity = {
          name: "monthly-severity",
          type: "count",
          value: monthly_severity,
        };

        var stat_daily = {
          name: "daily",
          type: "count",
          value: daily,
        };
        var stat_weekly = {
          name: "weekly",
          type: "count",
          value: weekly,
        };
        var stat_monthly = {
          name: "monthly",
          type: "count",
          value: monthly,
        };
        stats[name].push(
          stat_daily,
          stat_weekly,
          stat_monthly,
          stat_monthly_severity
        );
      }
    }
  });
  return stats;
}

function sort_dates(field) {
  return function (a, b) {
    return (
      (dayjs(a[field]) > dayjs(b[field])) - (dayjs(a[field]) < dayjs(b[field]))
    );
  };
}

function convert_dates(dataset, feature_name) {
  // console.log(item.end_time);
  dataset[feature_name + "-day"] = dayjs(dataset[feature_name]).format(
    "MMMM DD YYYY"
  );

  dataset[feature_name + "-week"] = dayjs(dataset[feature_name])
    .set("day", 0)
    .format("MMMM DD YYYY");

  dataset[feature_name + "-month"] = dayjs(dataset[feature_name]).format(
    "MMMM YYYY"
  );

  return dataset;
}
