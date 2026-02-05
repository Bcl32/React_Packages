type DataEntry = Record<string, unknown>;

export interface GroupCount {
  name: string;
  length: number;
}

export interface DoubleGroupEntry {
  name: string;
  [key: string]: string | number;
}

export function ComputeGroupedStats(filteredData: DataEntry[], feature: string, sort = true): GroupCount[] {
  const grouped_data = groupByKey(filteredData, feature);
  const counts = get_group_counts(grouped_data);

  if (sort) {
    counts.sort((a, b) => a.length - b.length);
    counts.reverse();
  }
  return counts;
}

export function DoubleGroupStats(filteredData: DataEntry[], feature: string, sub_feature: string): DoubleGroupEntry[] {
  const grouped_data = groupByKey(filteredData, feature);

  const stats: DoubleGroupEntry[] = [];
  for (const [key] of Object.entries(grouped_data)) {
    const subgroups = groupByKey(grouped_data[key] as DataEntry[], sub_feature);

    const entry: DoubleGroupEntry = { name: key };
    for (const [sub_key] of Object.entries(subgroups)) {
      entry[sub_key] = (subgroups[sub_key] as DataEntry[]).length;
    }
    stats.push(entry);
  }

  return stats;
}

function groupByKey(data: DataEntry[], key: string): Record<string, DataEntry[]> {
  const validData = data.filter(entry => entry && entry[key] != null);

  return Object.groupBy(
    validData,
    (entry) => String(entry[key])
  ) as Record<string, DataEntry[]>;
}

function get_group_counts(input_data: Record<string, DataEntry[]>): GroupCount[] {
  const session_counts: GroupCount[] = [];
  for (const [key] of Object.entries(input_data)) {
    const entry: GroupCount = { length: input_data[key].length, name: key };
    session_counts.push(entry);
  }

  return session_counts;
}
