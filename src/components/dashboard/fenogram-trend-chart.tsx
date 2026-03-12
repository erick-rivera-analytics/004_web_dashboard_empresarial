"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type FenogramTrendPoint = {
  week: string;
  total: number;
};

type FenogramTrendChartProps = {
  data: FenogramTrendPoint[];
};

export function FenogramTrendChart({ data }: FenogramTrendChartProps) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={260} minWidth={320}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fenogramFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="week"
            tickLine={false}
            tickMargin={10}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-primary)", strokeDasharray: "4 4" }}
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
            }}
          />
          <Area
            dataKey="total"
            fill="url(#fenogramFill)"
            stroke="var(--color-primary)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
