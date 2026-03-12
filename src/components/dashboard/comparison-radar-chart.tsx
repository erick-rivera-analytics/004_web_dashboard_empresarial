"use client";

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
};

type ComparisonRadarChartProps = {
  data: RadarPoint[];
};

export function ComparisonRadarChart({ data }: ComparisonRadarChartProps) {
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
            name="2610"
            stroke="var(--color-primary)"
            strokeWidth={2}
          />
          <Radar
            dataKey="right"
            fill="var(--color-accent)"
            fillOpacity={0.12}
            name="2611"
            stroke="var(--color-accent)"
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
