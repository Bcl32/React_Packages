import React from "react";
//context
import { FilterContext } from "./FilterContext";

//MONOREPO PACKAGE IMPORTS
import { Button } from "@bcl32/utils/Button";
import { LabelList, Pie, PieChart, Legend } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@bcl32/charts/Charts";

export function PieChartFilter({ name, chart_data }) {
  var { filters, change_filters } = React.useContext(FilterContext);

  function filter_on_click(value) {
    if (filters[name]["type"] == "select") {
      value = [value];
    }
    change_filters(name, "value", value);
  }

  var chartConfig = {};
  var colour_idx = 1;
  chart_data.map((entry) => {
    var name = entry["name"];
    chartConfig[name] = {};
    chartConfig[name]["label"] = name;
    chartConfig[name]["color"] = "hsl(var(--chart-" + colour_idx + "))";
    colour_idx = colour_idx + 1;

    entry["fill"] = "var(--color-" + name + ")";
  });

  return (
    <div>
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[350px] [&_.recharts-text]:fill-background"
      >
        <PieChart
          onClick={(data) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              var value = data.activePayload[0]["payload"]["name"];
              filter_on_click(value);
            }
          }}
        >
          <ChartTooltip
            content={<ChartTooltipContent nameKey="visitors" hideLabel />}
          />
          <Pie
            data={chart_data}
            animationDuration={700}
            dataKey="length"
            // labelLine={false}
            label={({ payload, ...props }) => {
              return (
                <text
                  className={"text-base"}
                  cx={props.cx}
                  cy={props.cy}
                  x={props.x}
                  y={props.y}
                  textAnchor={props.textAnchor}
                  dominantBaseline={props.dominantBaseline}
                  fill="hsla(var(--foreground))"
                >
                  {payload.length}
                </text>
              );
            }}
          >
            {/* labels printed on pie slices */}
            {/* <LabelList
              dataKey="name"
              className="fill-background"
              stroke="none"
              fill="#8884d8"
              fontSize={12}
              formatter={(value) => chartConfig[value]?.label}
            /> */}
          </Pie>
          <Legend
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "20px" }}
            className="text-xl -translate-y-2 flex-wrap gap-2"
            onClick={(props) => {
              var value = props["payload"]["name"];
              filter_on_click(value);
            }}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
