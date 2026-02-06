import dayjs from "dayjs";
import { bin } from "d3";
import { ComputeTimeBounds } from "./ComputeTimeBounds";
import { ComputeGroupedStats, DoubleGroupStats, type GroupCount, type DoubleGroupEntry } from "./ComputeGroupedStats";

type DataEntry = Record<string, unknown>;

interface FeatureMetadata {
  name: string;
  type: "number" | "list" | "string" | "select" | "datetime";
  stats?: boolean;
  groupBy?: string;
}

interface BinEntry {
  x0: number | undefined;
  x1: number | undefined;
  count: number;
  range: string;
}

interface StatEntry {
  name: string;
  type: string;
  value: number | string | BinEntry[] | GroupCount[] | DoubleGroupEntry[] | string[];
}

type FeatureStats = Record<string, StatEntry[]>;

export function CalculateFeatureStats(metadata: FeatureMetadata[], dataset: DataEntry[]): FeatureStats {
  const stats: FeatureStats = {};

  metadata.forEach((item) => {
    const name = item["name"];
    stats[name] = [];

    if (item["type"] === "number") {
      const validValues = dataset
        .map((entry) => entry[name])
        .filter((val): val is number => val != null && !isNaN(val as number)) as number[];

      const min: StatEntry = {
        name: "min",
        type: "number",
        value: validValues.length > 0 ? Math.min(...validValues) : 0,
      };
      const max: StatEntry = {
        name: "max",
        type: "number",
        value: validValues.length > 0 ? Math.max(...validValues) : 0,
      };

      const bins = bin<DataEntry, number>().value((d) => (d[name] as number) ?? 0)(dataset);
      const binEntries: BinEntry[] = bins.map((entry) => ({
        x0: entry.x0,
        x1: entry.x1,
        count: entry.length,
        range: entry.x0 + "-" + entry.x1,
      }));

      const bin_stat: StatEntry = {
        name: "bins",
        type: "bins",
        value: binEntries,
      };

      stats[name].push(min, max, bin_stat);
    }

    if (item["type"] === "list") {
      const counts: Record<string, number> = {};
      const options = new Set<string>();

      dataset.forEach((entry) => {
        if (entry && entry[name] && Array.isArray(entry[name])) {
          (entry[name] as string[]).forEach((option) => {
            if (counts[option]) {
              counts[option] += 1;
            } else {
              counts[option] = 1;
            }
            options.add(option);
          });
        }
      });

      const session_counts: GroupCount[] = [];
      for (const [key, value] of Object.entries(counts)) {
        const entry: GroupCount = { length: value, name: key };
        session_counts.push(entry);
      }

      const count: StatEntry = {
        name: "count",
        type: "count",
        value: session_counts,
      };

      const optionsStat: StatEntry = {
        name: "options",
        type: "list",
        value: Array.from(options.values()),
      };

      stats[name].push(count, optionsStat);
    }

    if (item["type"] === "string" || item["type"] === "select") {
      const entry: StatEntry = {
        name: "count",
        type: "count",
        value: ComputeGroupedStats(dataset, name),
      };
      stats[name].push(entry);
    }

    if (item["type"] === "datetime") {
      const [earliest_datetime, latest_datetime] = ComputeTimeBounds(dataset, name);

      const earliest: StatEntry = {
        name: "earliest",
        type: "datetime",
        value: earliest_datetime,
      };
      const latest: StatEntry = {
        name: "latest",
        type: "datetime",
        value: latest_datetime,
      };

      stats[name].push(earliest, latest);

      if (item["stats"]) {
        let processedDataset = dataset.map((dataItem) => convert_dates(dataItem, name));

        let daily = ComputeGroupedStats(processedDataset, name + "-day");
        daily = daily.sort(sort_dates("name"));

        let weekly = ComputeGroupedStats(processedDataset, name + "-week");
        weekly = weekly.sort(sort_dates("name"));

        let monthly = ComputeGroupedStats(processedDataset, name + "-month");
        monthly = monthly.sort(sort_dates("name"));

        const stat_daily: StatEntry = {
          name: "daily",
          type: "count",
          value: daily,
        };
        const stat_weekly: StatEntry = {
          name: "weekly",
          type: "count",
          value: weekly,
        };
        const stat_monthly: StatEntry = {
          name: "monthly",
          type: "count",
          value: monthly,
        };
        stats[name].push(stat_daily, stat_weekly, stat_monthly);

        if (item.groupBy) {
          const monthlyGrouped = DoubleGroupStats(processedDataset, name + "-month", item.groupBy);
          const stat_monthly_grouped: StatEntry = {
            name: "monthly-" + item.groupBy,
            type: "count",
            value: monthlyGrouped,
          };
          stats[name].push(stat_monthly_grouped);
        }
      }
    }
  });

  return stats;
}

function sort_dates(field: string) {
  return function (a: GroupCount, b: GroupCount): number {
    const dateA = dayjs(a[field as keyof GroupCount] as string);
    const dateB = dayjs(b[field as keyof GroupCount] as string);
    return dateA.isAfter(dateB) ? 1 : dateA.isBefore(dateB) ? -1 : 0;
  };
}

function convert_dates(dataset: DataEntry, feature_name: string): DataEntry {
  const result = { ...dataset };
  result[feature_name + "-day"] = dayjs(dataset[feature_name] as string).format("MMMM DD YYYY");
  result[feature_name + "-week"] = dayjs(dataset[feature_name] as string).set("day", 0).format("MMMM DD YYYY");
  result[feature_name + "-month"] = dayjs(dataset[feature_name] as string).format("MMMM YYYY");
  return result;
}
