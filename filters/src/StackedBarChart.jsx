import React from "react";
//context
import { FilterContext } from "./FilterContext";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";

export function StackedBarChart({ name, chart_data, subkeys }) {
  var chartConfig = {};
  var colour_idx = 1;
  subkeys.map((entry) => {
    var name = entry;
    chartConfig[name] = {};
    chartConfig[name]["label"] = name;
    chartConfig[name]["color"] = "hsl(var(--chart-" + colour_idx + "))";
    colour_idx = colour_idx + 1;

    // entry["fill"] = "var(--color-" + name + ")";
  });

  var bars = [];
  Object.entries(chartConfig).map(([key, entry]) => {
    bars.push(
      <Bar
        key={chartConfig[key]["label"]}
        dataKey={chartConfig[key]["label"]}
        stackId="a"
        fill={chartConfig[key]["color"]}
        radius={[0, 0, 0, 0]}
      />
    );
  });
  console.log(chartConfig);
  return (
    <ChartContainer config={chartConfig}>
      <BarChart accessibilityLayer data={chart_data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
        {bars}
      </BarChart>
    </ChartContainer>
  );
}
