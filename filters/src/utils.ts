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

// Turn a raw snake_case field name into a readable filter label:
// "system_units" → "System units". Used as the fallback when a filter
// attribute has no explicit `title`.
export function humanizeFieldName(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
