// A sparkline's path, pure so a test can check the arithmetic directly: no
// NaN from an empty input, every point inside the box. Ported unchanged from
// the dev dashboard's `components/viz/sparkline.ts`.

export interface SparkPath {
  /** `M…L…` through every point. */
  line: string;
  /** The line closed down to the baseline, for a filled area. */
  area: string;
  points: [number, number][];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A sparkline through `ys` (evenly spaced) or `[x, y]` pairs already on the
 * axis, scaled into `w × h` with `pad` above and below. No point: `null`. One
 * point: a flat line across at its height, so a single sample still reads as
 * a level rather than a dot lost in the corner. Every number is finite.
 */
export function sparkline(
  data: readonly (number | readonly [number, number])[],
  w: number,
  h: number,
  pad = 2,
): SparkPath | null {
  const pts = data
    .map((d, i): [number, number] => (typeof d === "number" ? [i, d] : [d[0], d[1]]))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (!pts.length || !(w > 0) || !(h > 0)) return null;
  const evenly = data.every((d) => typeof d === "number");
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [xmin, xmax] = [Math.min(...xs), Math.max(...xs)];
  const ymax = Math.max(...ys, 0);
  const ymin = Math.min(...ys, 0);
  const sy = (y: number) => (ymax > ymin ? h - pad - ((y - ymin) / (ymax - ymin)) * (h - 2 * pad) : h / 2);
  const sx = (x: number) =>
    evenly ? (xmax > xmin ? ((x - xmin) / (xmax - xmin)) * w : 0) : Math.min(w, Math.max(0, x));
  let points: [number, number][] = pts.map(([x, y]) => [r1(sx(x)), r1(sy(y))]);
  if (points.length === 1) points = [[0, points[0][1]], [w, points[0][1]]];
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${points[points.length - 1][0]},${h} L${points[0][0]},${h} Z`;
  return { line, area, points };
}

/** The last `n` finite values of a series — a stat tile's 12-point trend. */
export function lastN(data: readonly (number | null | undefined)[] | null | undefined, n = 12): number[] {
  return (data ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v)).slice(-n);
}
