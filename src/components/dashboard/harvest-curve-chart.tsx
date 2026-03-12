"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { HarvestCurvePoint } from "@/lib/fenograma";

type HarvestCurveChartProps = {
  data: HarvestCurvePoint[];
  projectionStartDay: number | null;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

export function HarvestCurveChart({
  data,
  projectionStartDay,
}: HarvestCurveChartProps) {
  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={360}>
        <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="harvestCurveFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.26} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
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
            tickFormatter={(value) => formatNumber(Number(value))}
          />
          <Tooltip
            formatter={(value, name, item) => {
              if (name === "Corte diario") {
                return [formatNumber(Number(value)), name];
              }

              if (name === "Acumulado real") {
                return [formatNumber(Number(value)), name];
              }

              if (name === "Acumulado proyectado") {
                return [formatNumber(Number(value)), name];
              }

              return [formatNumber(Number(value)), item.dataKey as string];
            }}
            labelFormatter={(label, payload) => {
              const point = payload?.[0]?.payload as HarvestCurvePoint | undefined;
              return point ? `Dia ${label} / ${point.eventDate}` : `Dia ${label}`;
            }}
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            dataKey="dailyStems"
            fill="url(#harvestCurveFill)"
            name="Corte diario"
            stroke="transparent"
            type="monotone"
            yAxisId={0}
          />
          <Line
            dataKey="observedCumulativeStems"
            dot={false}
            name="Acumulado real"
            stroke="var(--color-primary)"
            strokeLinecap="round"
            strokeWidth={3}
            type="monotone"
            yAxisId={0}
          />
          <Line
            dataKey="projectedCumulativeStems"
            dot={false}
            name="Acumulado proyectado"
            stroke="var(--color-accent)"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeWidth={3}
            type="monotone"
            yAxisId={0}
          />
          {projectionStartDay ? (
            <ReferenceLine
              ifOverflow="extendDomain"
              label={{
                fill: "var(--color-muted-foreground)",
                fontSize: 11,
                position: "top",
                value: "Inicio proyeccion",
              }}
              stroke="var(--color-foreground)"
              strokeDasharray="4 4"
              x={projectionStartDay}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
