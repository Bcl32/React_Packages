// ── Meters: a hero score over a same-ramp bar, and a progress bar ────────────
// The dataviz rule is meters, never rings. A meter's fill carries severity
// (accent → warning → critical) and its unfilled track is a LIGHTER STEP OF THE
// SAME RAMP (`trackFor`), so blue sits on pale blue and red on pale red and
// the state reads across the whole bar, in either mode. When the fill is a
// status colour the band's icon and label are printed beside it — the colour
// never says "poor" on its own.

import type { ReactNode } from "react";

import { cx } from "./_cx";
import { formatInt } from "./format";
import { MUTED, seriesColor, statusColor, trackFor, type StatusTone } from "./palette";
import { StatusIcon } from "./StatusIcon";

export type MeterTone = "accent" | StatusTone;

export interface MeterBand {
  /** The band holds scores at or above this (bands are checked top-down). */
  min: number;
  tone: MeterTone;
  label: string;
  /** The status icon shown beside the label; defaults to the tone (accent → good). */
  icon?: StatusTone;
}

/** The default health bands: 80+ good (accent), 50–79 needs work, below 50 poor. */
export const SCORE_BANDS: readonly MeterBand[] = [
  { min: 80, tone: "accent", label: "Good", icon: "good" },
  { min: 50, tone: "warning", label: "Needs work" },
  { min: 0, tone: "critical", label: "Poor" },
];

/** The band a score falls in; the lowest band for anything below every `min`. */
export function scoreBand(score: number, bands: readonly MeterBand[] = SCORE_BANDS): MeterBand {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => score >= b.min) ?? sorted[sorted.length - 1];
}

/** `value / (max - min)` clamped to 0–1; `null` when it cannot be computed. */
export function meterFraction(value: number | null | undefined, max: number | null | undefined, min = 0): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (typeof max !== "number" || !Number.isFinite(max) || max <= min) return null;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export const toneFill = (tone: MeterTone): string => (tone === "accent" ? seriesColor(1) : statusColor(tone));

export interface MeterProps {
  value: number | null | undefined;
  /** The bar's full length. For a progress bar whose total is still growing, the current estimate. */
  max: number | null | undefined;
  min?: number;
  /**
   * `meter` for a measurement (a score), `progressbar` for work under way.
   * A progress bar whose total is not yet `exact` gets NO aria-valuemax (and so
   * no aria-valuenow, which would be read against a default of 100) — its
   * `valueText` says "1,240 of about 3,000" instead.
   */
  role?: "meter" | "progressbar";
  exact?: boolean;
  /** The accessible name. */
  label: string;
  /** `aria-valuetext` — the value in words. */
  valueText?: string;
  tone?: MeterTone;
  /** An explicit fill colour; wins over `tone`. */
  fill?: string;
  /** Bar height in px: 8 by default, 4 in dense rows. */
  height?: number;
  className?: string;
}

/** The bar alone. Fully rounded: a meter is a figure, it has no baseline. */
export function Meter({
  value,
  max,
  min = 0,
  role = "meter",
  exact = true,
  label,
  valueText,
  tone = "accent",
  fill,
  height = 8,
  className,
}: MeterProps) {
  const frac = meterFraction(value, max, min) ?? 0;
  const color = fill ?? toneFill(tone);
  const aria: Record<string, string | number | undefined> = {
    role,
    "aria-label": label,
    "aria-valuetext": valueText,
  };
  if (exact && typeof value === "number" && typeof max === "number" && Number.isFinite(max)) {
    aria["aria-valuenow"] = value;
    aria["aria-valuemin"] = min;
    aria["aria-valuemax"] = max;
  } else if (role === "meter" && typeof value === "number") {
    aria["aria-valuenow"] = value;
  }
  return (
    <div
      {...aria}
      className={cx("w-full overflow-hidden", className)}
      style={{ height, borderRadius: height, background: trackFor(color) }}
    >
      <div
        data-meter-fill=""
        style={{
          height,
          width: `${frac * 100}%`,
          background: color,
          borderRadius: height,
          transition: "width 300ms ease-out",
        }}
      />
    </div>
  );
}

export interface ScoreMeterProps {
  score: number | null | undefined;
  max?: number;
  /** What the score is — "Health score". Sentence case, no colon. */
  label: string;
  /** `hero` is the one ≥48 px figure a view leads with; `md`/`sm` for cards. */
  size?: "hero" | "md" | "sm";
  bands?: readonly MeterBand[];
  /** A line under the meter: a delta, the crawl it came from. */
  sub?: ReactNode;
  /** Shown instead of the figure when there is no score yet. */
  empty?: string;
  className?: string;
}

const FIGURE: Record<NonNullable<ScoreMeterProps["size"]>, string> = {
  hero: "text-5xl",
  md: "text-3xl",
  sm: "text-xl",
};

/** A hero figure and its meter on the same ramp, with the band's icon + label. */
export function ScoreMeter({
  score,
  max = 100,
  label,
  size = "md",
  bands = SCORE_BANDS,
  sub,
  empty = "No score yet",
  className,
}: ScoreMeterProps) {
  const has = typeof score === "number" && Number.isFinite(score);
  const band = has ? scoreBand(score as number, bands) : null;
  const icon: StatusTone | undefined = band ? band.icon ?? (band.tone === "accent" ? "good" : band.tone) : undefined;
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="text-xs font-medium" style={{ color: MUTED }}>
        {label}
      </div>
      {has ? (
        <div className="flex items-baseline gap-2">
          <span className={cx(FIGURE[size], "font-semibold leading-none tracking-tight")}>{formatInt(score)}</span>
          <span className="text-sm" style={{ color: MUTED }}>
            /{formatInt(max)}
          </span>
          {band && icon && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium">
              <StatusIcon tone={icon} />
              {band.label}
            </span>
          )}
        </div>
      ) : (
        <div className="text-sm" style={{ color: MUTED }}>
          {empty}
        </div>
      )}
      <Meter
        value={has ? (score as number) : null}
        max={max}
        role="meter"
        exact={has}
        label={label}
        valueText={has ? `${formatInt(score)} of ${formatInt(max)}${band ? `, ${band.label}` : ""}` : empty}
        tone={band?.tone ?? "accent"}
        height={size === "sm" ? 6 : 8}
      />
      {sub != null && <div className="text-xs" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}
