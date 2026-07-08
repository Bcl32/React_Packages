import type { ChartConfig } from "@bcl32/charts/Charts";

export function extractLabels(items: (string | { label: string })[]): string[] {
  return items.map(item => typeof item === "string" ? item : item.label);
}

export function buildChartConfig(keys: string[]): ChartConfig {
  // Cycle the 5 chart tokens: --chart-6+ is undefined and renders nothing.
  return Object.fromEntries(
    keys.map((key, i) => [key, { label: key, color: `hsl(var(--chart-${(i % 5) + 1}))` }])
  );
}

export function capitalize(name: string): string {
  return name[0].toUpperCase() + name.slice(1);
}
