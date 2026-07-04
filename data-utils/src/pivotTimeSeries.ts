export interface TimeSeriesPoint {
  bucket: string;
  value: number;
}

export interface TimeSeriesGroup {
  group: string | null;
  points: TimeSeriesPoint[];
}

export interface PivotedTimeSeries {
  /** Wide-format rows keyed by bucket, one property per series key. */
  data: Array<Record<string, number | string>>;
  /** Series keys in first-seen order (group=null collapses to "value"). */
  seriesKeys: string[];
}

/**
 * Bridge the grouped time-series backend contract to the wide format the
 * chart components consume. Pure: no date math, no React. Buckets are assumed
 * pre-zero-filled server-side, so pivoting is a plain per-bucket merge keyed on
 * the bucket string. Rows are emitted sorted by bucket string ascending (ISO
 * timestamps sort chronologically), which keeps the x-axis ordered even if the
 * input groups disagree on bucket ordering.
 *
 * A `group` of `null` collapses to the single series key `"value"`.
 */
export function pivotTimeSeries(series: TimeSeriesGroup[]): PivotedTimeSeries {
  const seriesKeys: string[] = [];
  const rowsByBucket = new Map<string, Record<string, number | string>>();

  for (const group of series) {
    const key = group.group == null ? "value" : group.group;
    if (!seriesKeys.includes(key)) {
      seriesKeys.push(key);
    }
    for (const point of group.points) {
      let row = rowsByBucket.get(point.bucket);
      if (!row) {
        row = { bucket: point.bucket };
        rowsByBucket.set(point.bucket, row);
      }
      row[key] = point.value;
    }
  }

  const data = Array.from(rowsByBucket.values()).sort((a, b) =>
    String(a.bucket) < String(b.bucket) ? -1 : String(a.bucket) > String(b.bucket) ? 1 : 0
  );

  return { data, seriesKeys };
}
