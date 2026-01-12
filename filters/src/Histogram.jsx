import React from "react";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
export function Histogram({ name, chart_data }) {
  console.log(chart_data);
  const chartConfig = {
    count: {
      label: "Count",
      //color: "#2563eb",
      color: "hsl(var(--chart-3))",
    },
    label: {
      color: "white",
    },
  };

  return (
    <ChartContainer config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={chart_data}
        onClick={(data) => {
          if (data && data.activePayload && data.activePayload.length > 0) {
            console.log(data.activePayload[0]);
            var value = data.activePayload[0]["payload"]["name"];
            //   bar_click(value);
          }
        }}
      >
        <CartesianGrid vertical={false} />

        <Bar dataKey="count" fill="var(--color-count)" radius={4}></Bar>

        <XAxis dataKey="range" hide />
        {/* legend for actual bars */}

        <XAxis
          dataKey="x0"
          scale="band"
          xAxisId="ticks"
          tickCount={chart_data.length}
        />
        {/* legend for ticks between bars */}

        {/* <XAxis dataKey="count" hide />
        <XAxis
          xAxisId="ticks"
          type="number"
          domain={[0, chart_data.length]}
          tickCount={chart_data.length}
        /> */}

        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}
