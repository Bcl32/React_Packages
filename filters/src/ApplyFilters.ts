import type { Filters } from "./types";

interface DataEntry {
  [key: string]: unknown;
}

interface NumberFilterValue {
  min: number;
  max: number;
}

interface DatetimeFilterValue {
  timespan_begin: string;
  timespan_end: string;
}

export function ApplyFilters(data: unknown[], filters: Filters): DataEntry[] {
  // Always filter out null/undefined entries first
  let filteredData: DataEntry[] = Array.isArray(data)
    ? (data.filter(entry => entry != null && typeof entry === 'object') as DataEntry[])
    : [];

  for (const key in filters) {
    const filter = filters[key];
    switch (filter["type"]) {
      case "string":
        if (filter["rule"] === "equals") {
          filteredData = filteredData.filter((entry) => {
            return entry && entry[key] === filter["value"];
          });
          break;
        }

        if (filter["rule"] === "contains") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[key];
            return entry && typeof entryValue === "string" && entryValue.includes(filter["value"] as string);
          });
          break;
        }
        break;

      case "number": {
        const numValue = filter["value"] as NumberFilterValue;
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[key] as number | null | undefined;
          return entry && entryValue != null && entryValue - numValue["min"] >= 0;
        });
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[key] as number | null | undefined;
          return entry && entryValue != null && numValue["max"] - entryValue >= 0;
        });
        break;
      }

      case "select": {
        const selectValue = filter["value"] as string[];
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[key];
          return entry && entryValue != null && selectValue.includes(entryValue as string);
        });
        break;
      }

      case "list": {
        const listValue = filter["value"] as string[];
        if (filter["rule"] === "any") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[key];
            return entry && entryValue && Array.isArray(entryValue) && listValue.some((r) => entryValue.includes(r));
          });
          break;
        }

        if (filter["rule"] === "all") {
          filteredData = filteredData.filter((entry) => {
            const entryValue = entry?.[key];
            return entry && entryValue && Array.isArray(entryValue) && listValue.every((r) => entryValue.includes(r));
          });
          break;
        }
        break;
      }

      case "datetime": {
        const dtValue = filter["value"] as DatetimeFilterValue;
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[key];
          return (
            entry &&
            entryValue &&
            new Date(entryValue as string).getTime() -
              new Date(dtValue["timespan_begin"]).getTime() >=
            0
          );
        });
        filteredData = filteredData.filter((entry) => {
          const entryValue = entry?.[key];
          return (
            entry &&
            entryValue &&
            new Date(dtValue["timespan_end"]).getTime() - new Date(entryValue as string).getTime() >=
            0
          );
        });
        break;
      }
    }
  }
  return filteredData;
}
