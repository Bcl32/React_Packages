import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts";

import dayjs from "dayjs";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
import type { ChartDataEntry } from "./types";
import { capitalize } from "./utils";

interface LineChartFilterProps {
  name: string;
  chart_data: ChartDataEntry[];
}

export function LineChartFilter({ name, chart_data }: LineChartFilterProps): JSX.Element {
  const chartConfig = {
    length: {
      label: "Count",
      color: "hsl(var(--chart-3))",
    },
    label: {
      color: "white",
    },
  };

  return (
    <div>
      <h1 className="inline-block justify-center text-2xl text-blue-600 dark:text-blue-500">
        {capitalize(name)}
      </h1>

      <ChartContainer config={chartConfig}>
        <LineChart
          accessibilityLayer
          data={chart_data}
          margin={{
            top: 20,
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
            minTickGap={52}
            tickFormatter={(value: string) => dayjs(value).format("MMM, YYYY")}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Line
            dataKey="length"
            animationDuration={1000}
            type="natural"
            stroke="var(--color-length)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-length)",
            }}
            activeDot={{
              r: 6,
            }}
          >
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
            />
          </Line>
        </LineChart>
      </ChartContainer>
    </div>
  );
}
