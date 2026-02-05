import type { ChartMetadata, DatasetStats } from "./types";

interface CountEntry {
  name: string;
  [key: string]: unknown;
}

export function GetSubkeyValues(chart_metadata: ChartMetadata, stats: DatasetStats): string[] {
  const subkeyStats = stats[chart_metadata["subkey"] as string];
  const countStat = subkeyStats.find((obj) => {
    return obj.name === "count";
  });

  const subkey_data = countStat?.["value"] as CountEntry[];

  const subkeys = subkey_data.map((entry) => {
    return entry["name"];
  });

  chart_metadata["subkeys"] = subkeys;

  return subkeys;
}
