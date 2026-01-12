import React from "react";
//context
import { FilterContext } from "./FilterContext";

import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";

//MONOREPO PACKAGE IMPORTS
import { Button } from "@bcl32/utils/Button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";

export function BarChartFilter({ name, chart_data }) {
  var { filters, change_filters } = React.useContext(FilterContext);

  function bar_click(value) {
    if (
      filters[name]["type"] === "select" ||
      filters[name]["type"] === "list"
    ) {
      value = [value];
    }
    change_filters(name, "value", value);
  }

  const chartConfig = {
    length: {
      label: "Count",
      //color: "#2563eb",
      color: "hsl(var(--chart-3))",
    },
    label: {
      color: "white",
    },
  };

  return (
    <div>
      <div className="flex flex-row justify-between">
        <div></div>
        <h1 className="inline-block justify-center text-2xl text-blue-600 dark:text-blue-500">
          {name[0].toUpperCase() + name.slice(1)}
        </h1>

        <Button
          onClick={() =>
            change_filters(name, "value", filters[name]["filter_empty"])
          }
          variant="default"
          size="lg"
        >
          Reset
        </Button>
      </div>

      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart
          accessibilityLayer
          data={chart_data}
          layout="vertical"
          margin={{
            right: 30,
          }}
          onClick={(data) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              console.log(data.activePayload[0]);
              var value = data.activePayload[0]["payload"]["name"];
              bar_click(value);
            }
          }}
        >
          <CartesianGrid horizontal={false} />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
            hide
          />
          <XAxis dataKey="length" type="number" hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />

          <Bar dataKey="length" fill="var(--color-length)" radius={4}>
            <LabelList
              dataKey="name"
              position="insideLeft"
              offset={1}
              className="fill-[--color-label] font-bold"
              fontSize={14}
            />
            <LabelList
              dataKey="length"
              position="right"
              offset={8}
              className="fill-foreground font-bold"
              fontSize={14}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
