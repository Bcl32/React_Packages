//THIRD PARTY LIBRARIES
import React from "react";

import { BarChartFilter } from "./BarChartFilter";
import { LineChartFilter } from "./LineChartFilter";
import { PieChartFilter } from "./PieChartFilter";
import { BarChartSwitcher } from "./BarChartSwitcher";
import { StackedBarChart } from "./StackedBarChart";
import { Histogram } from "./Histogram";

export function ChartFilter({ chart_metadata, chart_data }) {
  var name = chart_metadata["name"];
  var chart_type = chart_metadata["type"];
  switch (chart_type) {
    case "line":
      return (
        <LineChartFilter name={name} chart_data={chart_data}></LineChartFilter>
      );
    case "pie":
      return (
        <PieChartFilter name={name} chart_data={chart_data}></PieChartFilter>
      );
    case "bar":
      return (
        <BarChartFilter name={name} chart_data={chart_data}></BarChartFilter>
      );
    case "bar-switcher":
      return (
        <BarChartSwitcher
          name={name}
          subkeys={chart_metadata["subkeys"]}
          chart_data={chart_data}
        ></BarChartSwitcher>
      );
    case "stacked_bar":
      return (
        <StackedBarChart
          name={name}
          subkeys={chart_metadata["subkeys"]}
          chart_data={chart_data}
        ></StackedBarChart>
      );
    case "histogram":
      return (
        <Histogram
          name={name}
          subkeys={chart_metadata["subkeys"]}
          chart_data={chart_data}
        ></Histogram>
      );
    default:
      return <p>No filter</p>;
  }
}
