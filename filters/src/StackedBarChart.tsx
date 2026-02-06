import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartLegend,
  ChartLegendContent,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@bcl32/charts/Charts";
import type { ChartDataEntry } from "./types";

interface StackedBarChartProps {
  name: string;
  chart_data: ChartDataEntry[];
  subkeys: string[];
}

export function StackedBarChart({ chart_data, subkeys }: StackedBarChartProps): JSX.Element {
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
