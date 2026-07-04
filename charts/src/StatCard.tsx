"use client";
import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "@bcl32/utils/Card";
import { cn } from "@bcl32/utils/cn";

export type DeltaDirection = "up" | "down" | "flat";

export interface StatDelta {
  /** pre-formatted delta text, e.g. "+12%" or "-3.4" */
  value: string;
  direction: DeltaDirection;
  /** whether an "up" movement is a good thing (default: true) */
  positiveIsGood?: boolean;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  /** leading glyph (lucide-react node supplied by the consumer) */
  icon?: React.ReactNode;
  delta?: StatDelta;
  /** mini trend series rendered as an axis-less sparkline */
  sparkline?: number[];
  /** theme-token colour for the sparkline (default: chart-1) */
  sparklineColor?: string;
  footer?: React.ReactNode;
  className?: string;
}

const DIRECTION_GLYPH: Record<DeltaDirection, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

function deltaColorClass(delta: StatDelta): string {
  if (delta.direction === "flat") {
    return "text-muted-foreground";
  }
  const positiveIsGood = delta.positiveIsGood ?? true;
  const isGood = delta.direction === "up" ? positiveIsGood : !positiveIsGood;
  return isGood ? "text-success" : "text-destructive";
}

export function StatCard({
  label,
  value,
  unit,
  icon,
  delta,
  sparkline,
  sparklineColor = "hsl(var(--chart-1))",
  footer,
  className,
}: StatCardProps): JSX.Element {
  const sparklineData = React.useMemo(
    () => (sparkline ?? []).map((v, i) => ({ i, v })),
    [sparkline]
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          {icon ? (
            <span className="[&>svg]:h-4 [&>svg]:w-4 text-muted-foreground">{icon}</span>
          ) : null}
        </div>

        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </span>
          {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
        </div>

        {delta ? (
          <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium", deltaColorClass(delta))}>
            <span aria-hidden>{DIRECTION_GLYPH[delta.direction]}</span>
            <span className="tabular-nums">{delta.value}</span>
          </div>
        ) : null}

        {sparklineData.length > 0 ? (
          <div className="mt-2 h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <Area
                  dataKey="v"
                  type="monotone"
                  stroke={sparklineColor}
                  strokeWidth={1.5}
                  fill={sparklineColor}
                  fillOpacity={0.15}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {footer ? (
          <div className="mt-2 text-xs text-muted-foreground">{footer}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
