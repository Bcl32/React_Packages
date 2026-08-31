import type { ChartConfig } from "@bcl32/charts/Charts";
import type { ChartValueLabeller, ChartValueLabelling } from "./types";

export function extractLabels(items: (string | { label: string })[]): string[] {
  return items.map(item => typeof item === "string" ? item : item.label);
}

export function buildChartConfig(keys: string[]): ChartConfig {
  // Five categorical slots, assigned in fixed order and never cycled — a 6th
  // series repeating slot 1's colour would be indistinguishable from the 1st.
  // Overflow keys wear the muted ink; categorical charts fold overflow entries
  // into "Other" before they get here (see foldChartData).
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      {
        label: key,
        color: i < 5 ? `hsl(var(--chart-${i + 1}))` : "hsl(var(--muted-foreground))",
      },
    ])
  );
}

/** Legend/slice name for categories folded past the slot limit. */
export const OTHER_KEY = "Other";

/**
 * Cap categorical chart data at `limit` named entries; the tail is summed into
 * a single "Other" entry. Data arrives ordered by the stats pipeline, so the
 * kept entries are simply the first N — no re-sorting, which would make slice
 * colours jump between renders as counts shift.
 */
export function foldChartData<T extends { name: string; length?: number }>(
  entries: T[],
  limit = 5
): { entries: T[]; foldedNames: string[] } {
  if (entries.length <= limit) return { entries, foldedNames: [] };
  const kept = entries.slice(0, limit - 1);
  const folded = entries.slice(limit - 1);
  const other = {
    name: OTHER_KEY,
    length: folded.reduce((sum, e) => sum + (e.length ?? 0), 0),
  } as T;
  return { entries: [...kept, other], foldedNames: folded.map((e) => e.name) };
}

/**
 * Semantic colours for status-like category values, so "failed" is never
 * green: a slice whose (lowercased) name matches gets the same success /
 * warning / destructive tokens the dashboards use instead of a categorical
 * slot. Kept aligned with Security-Benchmarks' statChartConfig SEMANTIC_COLOURS
 * — the same statuses render one scroll away on the dashboards, so the two
 * maps must agree. tw-colors emits raw HSL channels, so every token must be
 * wrapped in hsl(...) to be a usable colour.
 */
const SEMANTIC_STATUS_COLOURS: Record<string, string> = {
  completed: "hsl(var(--success))",
  succeeded: "hsl(var(--success))",
  success: "hsl(var(--success))",
  passed: "hsl(var(--success))",
  pass: "hsl(var(--success))",
  failed: "hsl(var(--destructive))",
  fail: "hsl(var(--destructive))",
  error: "hsl(var(--destructive))",
  errored: "hsl(var(--destructive))",
  partial: "hsl(var(--warning))",
  pending: "hsl(var(--warning))",
  waiting: "hsl(var(--warning))",
  running: "hsl(var(--primary))",
  in_progress: "hsl(var(--primary))",
  active: "hsl(var(--primary))",
  provisioning: "hsl(var(--chart-5))",
  queued: "hsl(var(--muted-foreground))",
  cancelled: "hsl(var(--muted-foreground))",
  canceled: "hsl(var(--muted-foreground))",
  skipped: "hsl(var(--muted-foreground))",
};

/**
 * Colour for one categorical entry: semantic token when the name is a known
 * status value, muted ink for the "Other" fold, otherwise the next categorical
 * slot. `slotIndex` counts only the non-semantic entries so the categorical
 * sequence stays dense (a pie with 3 semantic + 2 generic values puts the
 * generics on slots 1 and 2, not 4 and 5).
 */
export function resolveCategoryColour(name: string, slotIndex: number): string {
  const semantic = SEMANTIC_STATUS_COLOURS[name.toLowerCase()];
  if (semantic) return semantic;
  if (name === OTHER_KEY) return "hsl(var(--muted-foreground))";
  return slotIndex < 5
    ? `hsl(var(--chart-${slotIndex + 1}))`
    : "hsl(var(--muted-foreground))";
}

export function isSemanticStatusName(name: string): boolean {
  return name.toLowerCase() in SEMANTIC_STATUS_COLOURS;
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

/**
 * Collapse a `labelFor` prop into the single function a chart draws with.
 *
 * `labelFor` is optional and may be either one labeller or a map keyed by
 * chart dimension name; both — and a map with no entry for `name` — resolve to
 * the same default, `prettyOptionLabel`. A labeller that returns an empty or
 * non-string result falls back to that default too, so a partial mapping never
 * blanks a category.
 *
 * Purely a display concern: nothing here reaches the click handlers, which
 * keep writing the raw category value into the filter.
 */
export function resolveChartLabeller(
  labelFor: ChartValueLabelling | undefined,
  name?: string
): ChartValueLabeller {
  let labeller: ChartValueLabeller | undefined;
  if (typeof labelFor === "function") {
    labeller = labelFor;
  } else if (labelFor && name) {
    labeller = labelFor[name];
  }
  if (!labeller) return prettyOptionLabel;
  return (rawValue: string) => {
    const label = labeller(rawValue);
    return typeof label === "string" && label !== ""
      ? label
      : prettyOptionLabel(rawValue);
  };
}

// Turn a raw snake_case field name into a readable filter label:
// "system_units" → "System units". Used as the fallback when a filter
// attribute has no explicit `title`.
export function humanizeFieldName(name: string): string {
  const spaced = name.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
