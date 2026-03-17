"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MortalityCurvePoint } from "@/lib/mortality";

type MortalityCurveChartProps = {
  data: MortalityCurvePoint[];
};

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

export function MortalityCurveChart({ data }: MortalityCurveChartProps) {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={420}>
        <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="mortalityCumulativeFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="eventDay"
            tickLine={false}
            tickMargin={10}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickFormatter={(value) => formatPercent(Number(value))}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === "Mortandad diaria" || name === "Mortandad acumulada") {
                return [formatPercent(Number(value)), name];
              }

              return [formatNumber(Number(value)), name];
            }}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as MortalityCurvePoint | undefined;
              return point ? `Dia ${label} / ${point.calendarDate}` : `Dia ${label}`;
            }}
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              boxShadow: "0 22px 60px -28px rgba(15,23,42,0.35)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            dataKey="cumulativeMortalityPct"
            fill="url(#mortalityCumulativeFill)"
            name="Mortandad acumulada"
            stroke="transparent"
            type="monotone"
          />
          <Line
            activeDot={{ fill: "#1d4ed8", r: 4.5, strokeWidth: 0 }}
            dataKey="cumulativeMortalityPct"
            dot={false}
            name="Mortandad acumulada"
            stroke="#1d4ed8"
            strokeLinecap="round"
            strokeWidth={3}
            type="monotone"
          />
          <Line
            activeDot={{ fill: "#312e81", r: 4, strokeWidth: 0 }}
            dataKey="dailyMortalityPct"
            dot={false}
            name="Mortandad diaria"
            stroke="#312e81"
            strokeDasharray="7 5"
            strokeLinecap="round"
            strokeWidth={2.4}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
