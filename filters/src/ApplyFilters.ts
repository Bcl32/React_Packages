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

/** A colour token, as opposed to an identity token (an id never starts with #). */
const isColourToken = (v: string) => v.startsWith("#");

/** `#RRGGBB` and `#RRGGBBAA` denote the same colour; compare them as one key. */
function normHex(v: string): string {
  const h = v.replace("#", "").toUpperCase();
  return h.length === 6 ? `${h}FF` : h;
}

export function ApplyFilters(data: unknown[], filters: Filters): DataEntry[] {
  // Always filter out null/undefined entries first
  let filteredData: DataEntry[] = Array.isArray(data)
    ? (data.filter(entry => entry != null && typeof entry === 'object') as DataEntry[])
    : [];

  for (const key in filters) {
    const filter = filters[key];
    // The map key is the filter's identity, NOT necessarily the data column:
    // user-added instances use a synthetic key ("weight_g#2") and point at the
    // real column through `field`. Schema-declared filters leave field unset,
    // where key and column are the same thing.
    const column = filter["field"] ?? key;
    switch (filter["type"]) {
      case "string": {
        const strVal = ((filter["value"] as string) ?? "").toLowerCase();
        if (!strVal) break;
        if (filter["rule"] === "equals") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[column];
            return typeof entryValue === "string" && entryValue.toLowerCase() === strVal;
          });
          break;
        }
        if (filter["rule"] === "contains") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[column];
            return typeof entryValue === "string" && entryValue.toLowerCase().includes(strVal);
          });
          break;
        }
        break;
      }

      case "number": {
        const numValue = filter["value"] as NumberRange;
        const isArray = filter["source_kind"] === "scalar-array";
        filteredData = filteredData.filter((entry) => {
          const raw = entry?.[column];
          if (raw == null) return false;
          if (isArray) {
            // scalar-array (e.g. per-axis units): match when ANY element is in
            // range — the "any axis" semantics as a slider.
            if (!Array.isArray(raw)) return false;
            return raw.some((v) => {
              const n = typeof v === "number" ? v : Number(v);
              return isFinite(n) && n >= numValue.min && n <= numValue.max;
            });
          }
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
        // With `match_field` set, a selection is the option's id rather than
        // its colour: several presets can share one hex, so a colour match
        // would return all of them. Colour tokens are still honoured — the
        // custom colour input and a board/group lane drill-in both produce one
        // — and match the filter's own column as before.
        const matchField = filter["colour_presets"]?.match_field;
        filteredData = filteredData.filter((entry) => {
          const rowValues = extractRowValues(entry?.[column], filter["source_kind"], value_key);
          const rowHexes = rowValues.map(normHex);
          const rowIds = matchField
            ? extractRowValues(entry?.[matchField], "scalar-array", value_key)
            : [];
          const hit = (token: string) =>
            matchField && !isColourToken(token)
              ? rowIds.includes(token)
              : isColourToken(token)
                ? rowHexes.includes(normHex(token))
                : rowValues.includes(token);
          if (rule === "equals") {
            return selected.length === 1 && hit(selected[0]);
          }
          if (rule === "all") {
            return selected.every(hit);
          }
          return selected.some(hit);
        });
        break;
      }

      case "datetime": {
        const dtValue = filter["value"] as DatetimeFilterValue;
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[column];
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
