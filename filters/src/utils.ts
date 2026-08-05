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

/**
 * Readable text for one option in a combobox/dropdown filter.
 *
 * Enum-backed options arrive with the raw member as their label
 * ("in_progress"), which reads badly in a dropdown the moment the toggle
 * buttons — which capitalised on the way out — are gone. Only labels that are
 * pure lowercase snake tokens are rewritten; anything carrying an uppercase
 * letter or a space is already a human label ("eSUN", "Black PLA") and is left
 * exactly as it is.
 */
export function prettyOptionLabel(label: string): string {
  if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(label)) return label;
  const spaced = label.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Turn a raw snake_case field name into a readable filter label:
// "system_units" → "System units". Used as the fallback when a filter
// attribute has no explicit `title`.
export function humanizeFieldName(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
