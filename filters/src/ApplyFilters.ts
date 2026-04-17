import type { Filters, NumberRange, DatetimeFilterValue } from "./types";

interface DataEntry {
  [key: string]: unknown;
}

function extractRowValues(
  raw: unknown,
  source_kind: string | undefined,
  value_key: string,
): string[] {
  switch (source_kind) {
    case "object-array":
      return Array.isArray(raw)
        ? raw
            .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>)[value_key] : undefined))
            .filter((v) => v != null)
            .map(String)
        : [];
    case "scalar-array":
      return Array.isArray(raw) ? raw.filter((v) => v != null).map(String) : [];
    case "scalar":
    default:
      return raw == null ? [] : [String(raw)];
  }
}

export function ApplyFilters(data: unknown[], filters: Filters): DataEntry[] {
  // Always filter out null/undefined entries first
  let filteredData: DataEntry[] = Array.isArray(data)
    ? (data.filter(entry => entry != null && typeof entry === 'object') as DataEntry[])
    : [];

  for (const key in filters) {
    const filter = filters[key];
    switch (filter["type"]) {
      case "string": {
        const strVal = ((filter["value"] as string) ?? "").toLowerCase();
        if (!strVal) break;
        if (filter["rule"] === "equals") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[key];
            return typeof entryValue === "string" && entryValue.toLowerCase() === strVal;
          });
          break;
        }
        if (filter["rule"] === "contains") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[key];
            return typeof entryValue === "string" && entryValue.toLowerCase().includes(strVal);
          });
          break;
        }
        break;
      }

      case "number": {
        const numValue = filter["value"] as NumberRange;
        filteredData = filteredData.filter((entry) => {
          const raw = entry?.[key];
          if (raw == null) return false;
          const entryValue = typeof raw === "number" ? raw : Number(raw);
          return isFinite(entryValue) && entryValue >= numValue.min && entryValue <= numValue.max;
        });
        break;
      }

      case "options": {
        const selected = (filter["value"] as string[]) ?? [];
        if (selected.length === 0) break;
        const value_key = filter["value_key"] ?? "value";
        const rule = filter["rule"] ?? "any";
        filteredData = filteredData.filter((entry) => {
          const rowValues = extractRowValues(entry?.[key], filter["source_kind"], value_key);
          if (rule === "equals") {
            return selected.length === 1 && rowValues.includes(selected[0]);
          }
          if (rule === "all") {
            return selected.every((s) => rowValues.includes(s));
          }
          return selected.some((s) => rowValues.includes(s));
        });
        break;
      }

      case "datetime": {
        const dtValue = filter["value"] as DatetimeFilterValue;
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[key];
          if (!entry || !entryValue) return false;
          const time = new Date(entryValue as string).getTime();
          return time >= new Date(dtValue.timespan_begin).getTime() &&
            time <= new Date(dtValue.timespan_end).getTime();
        });
        break;
      }
    }
  }
  return filteredData;
}
