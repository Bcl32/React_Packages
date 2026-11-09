// Number formatting for figures, ticks and tooltips. Pure, so it is tested on
// its own. One rule per kind, so a stat tile and its table twin never disagree
// about how "12,900" is spelled.

const MINUS = "−";

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** `1284` → `"1,284"`. Non-numbers → the dash. */
export function formatInt(n: number | null | undefined): string {
  return isNum(n) ? intFmt.format(Math.round(n)) : "—";
}

/**
 * Auto-compact, the stat-tile rule: in full under 10,000 (`1,284`), compact
 * past it (`12.9K`, `4.2M`, `1.1B`). One decimal, dropped when it is zero.
 */
export function compact(n: number | null | undefined): string {
  if (!isNum(n)) return "—";
  const abs = Math.abs(n);
  if (abs < 10_000) return formatInt(n);
  const units: [number, string][] = [
    [1e3, "K"],
    [1e6, "M"],
    [1e9, "B"],
  ];
  let i = units.findIndex((_unit, k) => k === units.length - 1 || abs < units[k + 1][0]);
  let v = Math.round((n / units[i][0]) * 10) / 10;
  // 999.96K rounds to 1000K — promote it to the next unit instead.
  if (Math.abs(v) >= 1000 && i < units.length - 1) {
    i += 1;
    v = Math.round((n / units[i][0]) * 10) / 10;
  }
  return `${String(v).replace(/\.0$/, "")}${units[i][1]}`;
}

/** A 0–1 fraction as a percent: `0.4123` → `"41%"`. */
export function formatPercent(frac: number | null | undefined, digits = 0): string {
  if (!isNum(frac)) return "—";
  return `${(frac * 100).toFixed(digits)}%`;
}

/** A signed figure with a real minus sign: `+5`, `−3`, `0`. */
export function signed(n: number, fmt: (v: number) => string = formatInt): string {
  if (!isNum(n)) return "—";
  if (n > 0) return `+${fmt(n)}`;
  if (n < 0) return `${MINUS}${fmt(-n)}`;
  return fmt(0);
}

/** Milliseconds → `"450 ms"`, `"12 s"`, `"3 m 20 s"`, `"1 h 5 m"`. */
export function formatDuration(ms: number | null | undefined): string {
  if (!isNum(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m} m ${s % 60} s` : `${m} m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} m` : `${h} h`;
}

/** Seconds remaining → `"~2 m 40 s"`; unknown → `"—"`. */
export function formatEta(sec: number | null | undefined): string {
  if (!isNum(sec) || sec < 0) return "—";
  return `~${formatDuration(sec * 1000)}`;
}

/** A per-second rate: `18.24` → `"18.2/s"`. */
export function formatRate(perSec: number | null | undefined, unit = "/s"): string {
  if (!isNum(perSec)) return "—";
  const v = perSec >= 100 ? Math.round(perSec) : Math.round(perSec * 10) / 10;
  return `${v}${unit}`;
}

/** Bytes → `"312 KB"`, `"4.1 MB"`. */
export function formatBytes(n: number | null | undefined): string {
  if (!isNum(n)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (Math.abs(v) >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${i === 0 ? Math.round(v) : Math.round(v * 10) / 10} ${units[i]}`;
}

export type ValueFormat = "int" | "compact" | "percent" | "duration" | "ms" | "bytes" | "rate";

/**
 * The formats a server-computed metric names (`metric.format` in a ToolCard).
 * `percent` takes a 0–1 fraction; `duration`/`ms` take milliseconds. An
 * unknown format falls back to `compact`.
 */
export function formatValue(value: number | null | undefined, format: ValueFormat | string = "compact"): string {
  switch (format) {
    case "int":
      return formatInt(value);
    case "percent":
      return formatPercent(value);
    case "duration":
    case "ms":
      return formatDuration(value);
    case "bytes":
      return formatBytes(value);
    case "rate":
      return formatRate(value);
    default:
      return compact(value);
  }
}

export type GoodWhen = "up" | "down" | "neutral";
export type DeltaSense = "good" | "bad" | "flat";

/**
 * Whether a change is good news: direction × which way is good. A zero change,
 * or a measure with no good direction, is `flat` and takes no colour.
 */
export function deltaSense(value: number, goodWhen: GoodWhen = "up"): DeltaSense {
  if (!isNum(value) || value === 0 || goodWhen === "neutral") return "flat";
  const up = value > 0;
  return up === (goodWhen === "up") ? "good" : "bad";
}
