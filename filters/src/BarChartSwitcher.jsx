import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";

export function BarChartSwitcher({ name, chart_data, subkeys }) {
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
  console.log(chartConfig);
  const [activeChart, setActiveChart] = React.useState(subkeys[0]);

  //   const total = React.useMemo(
  //     () => ({
  //       desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
  //       mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0),
  //     }),
  //     []
  //   );

  return (
    <div>
      <div className="flex">
        {subkeys.map((key) => {
          const chart = key;
          return (
            <button
              key={chart}
              data-active={activeChart === chart}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
              onClick={() => setActiveChart(chart)}
            >
              <span className="text-xs text-muted-foreground">
                {chartConfig[chart].label}
              </span>
              {/* <span className="text-lg font-bold leading-none sm:text-3xl">
                {total[key].toLocaleString()}
              </span> */}
            </button>
          );
        })}
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full"
      >
        <BarChart
          accessibilityLayer
          data={chart_data}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                className="w-[150px]"
                nameKey="views"
                labelFormatter={(value) => {
                  return new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                }}
              />
            }
          />
          <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
