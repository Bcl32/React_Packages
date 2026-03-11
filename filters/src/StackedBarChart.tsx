import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@bcl32/charts/Charts";
import type { ChartDataEntry } from "./types";
import { buildChartConfig } from "./utils";

interface StackedBarChartProps {
  name: string;
  chart_data: ChartDataEntry[];
  subkeys: string[];
}

export function StackedBarChart({ chart_data, subkeys }: StackedBarChartProps): JSX.Element {
  const chartConfig = buildChartConfig(subkeys);

  const bars: React.ReactElement[] = [];
  Object.entries(chartConfig).forEach(([key]) => {
    bars.push(
      <Bar
        key={chartConfig[key].label}
        dataKey={chartConfig[key].label as string}
        stackId="a"
        fill={chartConfig[key].color}
        radius={[0, 0, 0, 0]}
      />
    );
  });

  return (
    <ChartContainer config={chartConfig}>
      <BarChart accessibilityLayer data={chart_data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => value.slice(0, 3)}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
        {bars}
      </BarChart>
    </ChartContainer>
  );
}
