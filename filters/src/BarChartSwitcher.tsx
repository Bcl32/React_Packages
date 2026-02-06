import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@bcl32/charts/Charts";
import type { ChartDataEntry } from "./types";

interface BarChartSwitcherProps {
  name: string;
  chart_data: ChartDataEntry[];
  subkeys: string[];
}

export function BarChartSwitcher({ chart_data, subkeys }: BarChartSwitcherProps): JSX.Element {
  const chartConfig: ChartConfig = {};
  let colour_idx = 1;

  subkeys.forEach((entry) => {
    const entryName = entry;
    chartConfig[entryName] = {
      label: entryName,
      color: "hsl(var(--chart-" + colour_idx + "))",
    };
    colour_idx = colour_idx + 1;
  });

  const [activeChart, setActiveChart] = React.useState(subkeys[0]);

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
            tickFormatter={(value: string) => {
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
                labelFormatter={(value: string | undefined) => {
                  if (!value) return "";
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
