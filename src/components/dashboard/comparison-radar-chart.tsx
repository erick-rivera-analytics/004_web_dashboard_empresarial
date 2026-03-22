"use client";

import { memo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type RadarPoint = {
  label: string;
  left: number;
  right: number;
  leftDisplay?: string;
  rightDisplay?: string;
};

type ComparisonRadarChartProps = {
  data: RadarPoint[];
  leftLabel: string;
  rightLabel: string;
};

export const ComparisonRadarChart = memo(function ComparisonRadarChart({
  data,
  leftLabel,
  rightLabel,
}: ComparisonRadarChartProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={320} minWidth={320}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const point = item.payload as RadarPoint;

              if (item.dataKey === "left") {
                return [point.leftDisplay ?? value, leftLabel];
              }

              return [point.rightDisplay ?? value, rightLabel];
            }}
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
            }}
          />
          <Radar
            dataKey="left"
            fill="var(--color-primary)"
            fillOpacity={0.18}
            name={leftLabel}
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
          <Radar
            dataKey="right"
            fill="var(--color-accent)"
            fillOpacity={0.12}
            name={rightLabel}
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});
