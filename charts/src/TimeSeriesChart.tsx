"use client";
import * as React from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Brush,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  Label,
} from "recharts";

import { Button } from "@bcl32/utils/Button";
import { cn } from "@bcl32/utils/cn";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  colorVarKey,
} from "./Charts";
import type { ChartConfig } from "./Charts";

export type MarkedPointVariant = "warning" | "danger" | "info";

export interface MarkedPoint {
  /** bucket (x) value to mark */
  x: string;
  /** which series the marker sits on (default: first series) */
  seriesKey?: string;
  /** annotation text rendered next to the marker */
  label?: string;
  /** semantic-token colour bucket (default: "warning") */
  variant?: MarkedPointVariant;
}

/** A shaded span between two x (bucket) values — e.g. a print run or downtime
 *  window. x1/x2 must be x values present on the categorical axis. */
export interface ReferenceAreaSpec {
  x1: string;
  x2: string;
  /** semantic-token colour bucket (default: "info") */
  variant?: MarkedPointVariant;
  label?: string;
}

/** A vertical line at one x (bucket) value — e.g. an event moment. */
export interface ReferenceLineSpec {
  x: string;
  /** semantic-token colour bucket (default: "info") */
  variant?: MarkedPointVariant;
  label?: string;
}

export interface TimeSeriesChartProps {
  /** one entry per series key (label + color) */
  config: ChartConfig;
  /** wide-format rows, e.g. [{ bucket: "2026-04-01T…", PETG: 132.5, PLA: 80 }] */
  data: Array<Record<string, number | string>>;
  /** keys of config/data to plot */
  series: string[];
  /** row property holding the x value (default: "bucket") */
  xKey?: string;
  /** line or area rendering (default: "line") */
  type?: "line" | "area";
  /** stack the areas (area type only) */
  stacked?: boolean;
  /** Recharts <Brush> range-scrubbing control */
  showBrush?: boolean;
  /** box-zoom via drag-select (ReferenceArea) with a Reset control */
  enableDragZoom?: boolean;
  /** anomaly / marker overlays rendered as ReferenceDots */
  markedPoints?: MarkedPoint[];
  /** shaded span overlays (behind the series), e.g. print runs / downtime */
  referenceAreas?: ReferenceAreaSpec[];
  /** vertical line overlays (behind the series), e.g. event moments */
  referenceLines?: ReferenceLineSpec[];
  /** crosshair-synced chart group id */
  syncId?: string;
  /** format the x-axis ticks (caller owns date formatting via dayjs) */
  xTickFormatter?: (v: string) => string;
  /** format the y-axis ticks */
  yTickFormatter?: (v: number) => string;
  /**
   * Applied to the chart container itself. Defaults to a 16:9 aspect box;
   * pass an explicit height (e.g. "h-[280px] w-full") to override it —
   * an explicit height disables the aspect-ratio sizing.
   */
  className?: string;
}

const VARIANT_TOKEN: Record<MarkedPointVariant, string> = {
  warning: "hsl(var(--warning))",
  danger: "hsl(var(--destructive))",
  // no dedicated `info` theme token — reuse the neutral-active `primary` slot
  info: "hsl(var(--primary))",
};

/** Minimal shape of the recharts categorical mouse-event state we consume. */
interface ChartMouseState {
  activeLabel?: string | number;
}

export function TimeSeriesChart({
  config,
  data,
  series,
  xKey = "bucket",
  type = "line",
  stacked = false,
  showBrush = false,
  enableDragZoom = false,
  markedPoints,
  referenceAreas,
  referenceLines,
  syncId,
  xTickFormatter,
  yTickFormatter,
  className,
}: TimeSeriesChartProps): JSX.Element {
  // Drag-zoom state: refArea* track the in-flight selection; zoomRange holds the
  // committed [startIndex, endIndex] slice into `data`. Index-based slicing keeps
  // this working for category (string bucket) axes where domain-zoom does not.
  const [refAreaLeft, setRefAreaLeft] = React.useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = React.useState<string | null>(null);
  const [zoomRange, setZoomRange] = React.useState<[number, number] | null>(null);

  const visibleData = React.useMemo(() => {
    if (!zoomRange) {
      return data;
    }
    const [start, end] = zoomRange;
    return data.slice(start, end + 1);
  }, [data, zoomRange]);

  const handleMouseDown = React.useCallback(
    (state: ChartMouseState | null) => {
      if (!enableDragZoom || state?.activeLabel == null) {
        return;
      }
      setRefAreaLeft(String(state.activeLabel));
      setRefAreaRight(null);
    },
    [enableDragZoom]
  );

  const handleMouseMove = React.useCallback(
    (state: ChartMouseState | null) => {
      if (!enableDragZoom || refAreaLeft == null || state?.activeLabel == null) {
        return;
      }
      setRefAreaRight(String(state.activeLabel));
    },
    [enableDragZoom, refAreaLeft]
  );

  const handleMouseUp = React.useCallback(() => {
    if (!enableDragZoom) {
      return;
    }
    if (refAreaLeft != null && refAreaRight != null && refAreaLeft !== refAreaRight) {
      let leftIdx = data.findIndex((row) => String(row[xKey]) === refAreaLeft);
      let rightIdx = data.findIndex((row) => String(row[xKey]) === refAreaRight);
      if (leftIdx >= 0 && rightIdx >= 0) {
        if (leftIdx > rightIdx) {
          [leftIdx, rightIdx] = [rightIdx, leftIdx];
        }
        setZoomRange([leftIdx, rightIdx]);
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [enableDragZoom, refAreaLeft, refAreaRight, data, xKey]);

  const resetZoom = React.useCallback(() => setZoomRange(null), []);

  // Resolve each marked point to its y value on the visible data, so the
  // ReferenceDot lands on the series line. Points outside the zoom slice drop out.
  const resolvedMarks = React.useMemo(() => {
    if (!markedPoints?.length) {
      return [];
    }
    return markedPoints
      .map((mark) => {
        const seriesKey = mark.seriesKey ?? series[0];
        const row = visibleData.find((r) => String(r[xKey]) === mark.x);
        if (!row || typeof row[seriesKey] !== "number") {
          return null;
        }
        return {
          ...mark,
          seriesKey,
          y: row[seriesKey] as number,
          color: VARIANT_TOKEN[mark.variant ?? "warning"],
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [markedPoints, series, visibleData, xKey]);

  const isArea = type === "area";
  const ChartComponent = isArea ? AreaChart : LineChart;

  const chartInteractionProps = enableDragZoom
    ? {
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
      }
    : {};

  return (
    <div>
      {enableDragZoom && zoomRange && (
        <div className="mb-2 flex justify-end">
          <Button onClick={resetZoom} variant="outline" size="sm">
            Reset zoom
          </Button>
        </div>
      )}
      {/* className must land on the ChartContainer: its base aspect-video only
          yields when the consumer sets an explicit height on the same element,
          and ResponsiveContainer measures this element for the SVG size. */}
      <ChartContainer config={config} className={cn("w-full", className)}>
        <ChartComponent
          accessibilityLayer
          data={visibleData}
          syncId={syncId}
          margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
          {...chartInteractionProps}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            allowDataOverflow
            tickFormatter={
              xTickFormatter ? (value: string) => xTickFormatter(value) : undefined
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
            tickFormatter={
              yTickFormatter ? (value: number) => yTickFormatter(value) : undefined
            }
          />
          <ChartTooltip
            cursor={!enableDragZoom}
            content={<ChartTooltipContent />}
          />
          <ChartLegend content={<ChartLegendContent />} />

          {/* Overlays rendered before the series so they sit behind the lines. */}
          {referenceAreas?.map((area, index) => (
            <ReferenceArea
              key={`ref-area-${area.x1}-${area.x2}-${index}`}
              x1={area.x1}
              x2={area.x2}
              fill={VARIANT_TOKEN[area.variant ?? "info"]}
              fillOpacity={0.1}
              stroke="none"
              ifOverflow="hidden"
              label={
                area.label
                  ? {
                      value: area.label,
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: VARIANT_TOKEN[area.variant ?? "info"],
                    }
                  : undefined
              }
            />
          ))}
          {referenceLines?.map((line, index) => (
            <ReferenceLine
              key={`ref-line-${line.x}-${index}`}
              x={line.x}
              stroke={VARIANT_TOKEN[line.variant ?? "info"]}
              strokeDasharray="4 4"
              label={
                line.label
                  ? {
                      value: line.label,
                      position: "top",
                      fontSize: 10,
                      fill: VARIANT_TOKEN[line.variant ?? "info"],
                    }
                  : undefined
              }
            />
          ))}

          {series.map((key) =>
            isArea ? (
              <Area
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${colorVarKey(key)})`}
                fill={`var(--color-${colorVarKey(key)})`}
                fillOpacity={0.2}
                stackId={stacked ? "stack" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={key}
                dataKey={key}
                type="monotone"
                stroke={`var(--color-${colorVarKey(key)})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )
          )}

          {resolvedMarks.map((mark, index) => (
            <ReferenceDot
              key={`${mark.x}-${mark.seriesKey}-${index}`}
              x={mark.x}
              y={mark.y}
              r={5}
              fill={mark.color}
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              isFront
            >
              {mark.label ? (
                <Label
                  value={mark.label}
                  position="top"
                  fill={mark.color}
                  fontSize={11}
                  fontWeight={600}
                />
              ) : null}
            </ReferenceDot>
          ))}

          {enableDragZoom && refAreaLeft != null && refAreaRight != null && (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.15}
            />
          )}

          {showBrush && (
            <Brush
              dataKey={xKey}
              height={24}
              travellerWidth={8}
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted))"
              tickFormatter={
                xTickFormatter ? (value: string) => xTickFormatter(value) : undefined
              }
            />
          )}
        </ChartComponent>
      </ChartContainer>
    </div>
  );
}
