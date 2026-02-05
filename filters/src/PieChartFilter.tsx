import * as React from "react";
import { FilterContext } from "./FilterContext";

import { Pie, PieChart, Legend } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@bcl32/charts/Charts";
import type { FilterContextValue, ChartDataEntry } from "./types";

interface PieChartFilterProps {
  name: string;
  chart_data: ChartDataEntry[];
}

interface ClickPayload {
  payload: {
    name: string;
    [key: string]: unknown;
  };
}

interface ChartClickEvent {
  activePayload?: ClickPayload[];
}

interface LegendPayload {
  payload?: {
    name?: string;
    [key: string]: unknown;
  };
}

interface LabelProps {
  cx: number;
  cy: number;
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end" | "inherit";
  dominantBaseline: "auto" | "middle" | "hanging" | "mathematical" | "alphabetic" | "ideographic" | "central" | "inherit";
}

export function PieChartFilter({ name, chart_data }: PieChartFilterProps): JSX.Element {
  const context = React.useContext(FilterContext) as FilterContextValue | null;

  function filter_on_click(value: string) {
    if (context?.filters[name]["type"] === "select") {
      context?.change_filters(name, "value", [value]);
    } else {
      context?.change_filters(name, "value", value);
    }
  }

  const chartConfig: ChartConfig = {};
  let colour_idx = 1;

  chart_data.forEach((entry) => {
    const entryName = entry["name"];
    chartConfig[entryName] = {
      label: entryName,
      color: "hsl(var(--chart-" + colour_idx + "))",
    };
    colour_idx = colour_idx + 1;

    entry["fill"] = "var(--color-" + entryName + ")";
  });

  return (
    <div>
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[350px] [&_.recharts-text]:fill-background"
      >
        <PieChart
          onClick={(data: ChartClickEvent) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              const value = data.activePayload[0]["payload"]["name"];
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
            label={({ payload, ...props }: { payload: ChartDataEntry } & LabelProps) => {
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
          />
          <Legend
            height={36}
            iconType="circle"
            wrapperStyle={{ fontSize: "20px" }}
            className="text-xl -translate-y-2 flex-wrap gap-2"
            onClick={(props: LegendPayload) => {
              const value = props.payload?.name;
              if (value) {
                filter_on_click(value);
              }
            }}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}
