import dayjs from "dayjs";

import { humanizeFieldName, prettyOptionLabel } from "./utils";
import type {
  DatetimeFilterValue,
  FilterOption,
  FilterValue,
  NumberRange,
} from "./types";

/**
 * The text a filter is described with: the toolbar chip (chipLabel) and the
 * FiltersSummary row (summaryValue). Pure, so the strings are testable.
 *
 * The two formats differ today (separator, date format, option prettifying);
 * filterText.test.ts pins both. Unifying them is a deliberate, visible change
 * for R5, not a side effect of moving the code.
 *
 * Internal to the package: not re-exported from the barrel.
 */

function chipOptionsLabel(value: string[], options: FilterOption[] | undefined): string {
  // Same prettifying the control itself applies, so the summary chip and the
  // dropdown never disagree about how a status is spelled.
  if (!options || options.length === 0) return value.map(prettyOptionLabel).join(", ");
  const map = new Map(options.map((o) => [o.value, prettyOptionLabel(o.label)]));
  return value.map((v) => map.get(v) ?? prettyOptionLabel(v)).join(", ");
}

/** The toolbar chip for one active filter, e.g. `Weight (g): 10 – 50`. */
export function chipLabel(name: string, filter: FilterValue): string {
  // Prefer the schema title ("Size (mm)") over the raw key — a dynamic instance's
  // key is synthetic ("weight_g#2"), so the key alone reads badly in a chip.
  const label = filter.title ?? humanizeFieldName(filter.field ?? name);
  switch (filter.type) {
    case "string":
      return `${label} ${filter.rule} "${filter.value}"`;
    case "number": {
      const v = filter.value as { min: number; max: number };
      return `${label}: ${v.min} – ${v.max}`;
    }
    case "options": {
      const vals = filter.value as string[];
      const rule = filter.rule === "all" ? " (all)" : "";
      if (filter.display === "swatch-grid") {
        return `${label}: ${vals.length} colour${vals.length !== 1 ? "s" : ""}`;
      }
      return `${label}${rule}: ${chipOptionsLabel(vals, filter.options)}`;
    }
    case "datetime": {
      const v = filter.value as { timespan_begin: string; timespan_end: string };
      const start = dayjs(v.timespan_begin).format("MMM D, YYYY");
      const end = dayjs(v.timespan_end).format("MMM D, YYYY");
      return `${label}: ${start} → ${end}`;
    }
    default:
      return label;
  }
}

function summaryOptionsValue(value: string[], options: FilterOption[] | undefined): string {
  if (!options || options.length === 0) return value.join(", ");
  const map = new Map(options.map((o) => [o.value, o.label]));
  return value.map((v) => map.get(v) ?? v).join(", ");
}

/** The value text of one FiltersSummary row. */
export function summaryValue(filter: FilterValue): string {
  if (filter["type"] === "datetime") {
    const dtValue = filter["value"] as DatetimeFilterValue;
    return (
      "Start: " +
      dayjs(dtValue["timespan_begin"]).format("MMM, D YYYY - h:mma") +
      "\n End: " +
      dayjs(dtValue["timespan_end"]).format("MMM, D YYYY - h:mma")
    );
  }
  if (filter["type"] === "number") {
    const numValue = filter["value"] as NumberRange;
    return numValue["min"] + " - " + numValue["max"];
  }
  if (filter["type"] === "options") {
    const arrValue = filter["value"] as string[];
    const ruleHint = filter["rule"] === "all" ? " (all)" : "";
    if (filter["display"] === "swatch-grid") {
      // Swatch picks may be stored as option ids (see `match_field`), and the
      // summary has no preset list to resolve them against — a raw id list is
      // worse than a count. Matches the toolbar chip.
      const n = arrValue.length;
      return `${ruleHint}${n} colour${n === 1 ? "" : "s"}`;
    }
    return ruleHint + summaryOptionsValue(arrValue, filter["options"]);
  }
  return filter["rule"] + " " + filter["value"];
}
