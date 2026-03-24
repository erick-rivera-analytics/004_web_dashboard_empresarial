"use client";

import { memo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HarvestCurvePoint, HarvestCurvePayload } from "@/lib/fenograma";

type HarvestCurveSummary = HarvestCurvePayload["summary"];

type HarvestCurveChartProps = {
  data: HarvestCurvePoint[];
  projectionStartDay: number | null;
  summary?: HarvestCurveSummary | null;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function HarvestTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: HarvestCurvePoint }>; label?: string | number }) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as HarvestCurvePoint | undefined;
  if (!point) return null;

  const accumulated = point.observedCumulativeStems ?? point.projectedCumulativeStems ?? null;

  const stemRows: { label: string; value: string }[] = [
    { label: "Tallos acumulados", value: accumulated !== null ? formatNumber(accumulated) : "—" },
    { label: "Tallos día", value: formatNumber(point.dailyStems) },
  ];

  const hasWeight = point.dailyGreenKg > 0;
  const weightRows: { label: string; value: string }[] = hasWeight ? [
    { label: "Kg acumulado", value: formatNumber(point.cumulativeGreenKg) },
    { label: "Kg día", value: formatNumber(point.dailyGreenKg) },
    { label: "Peso / tallo acum.", value: point.cumulativeWeightPerStemG !== null ? `${formatNumber(point.cumulativeWeightPerStemG)} g` : "—" },
    { label: "Peso / tallo día", value: point.dailyWeightPerStemG !== null ? `${formatNumber(point.dailyWeightPerStemG)} g` : "—" },
  ] : [];

  const renderRow = (row: { label: string; value: string }) => (
    <div
      key={row.label}
      style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, lineHeight: "1.65" }}
    >
      <span style={{ color: "var(--color-muted-foreground)" }}>{row.label}</span>
      <span style={{ fontWeight: 500, color: "var(--color-foreground)" }}>{row.value}</span>
    </div>
  );

  return (
    <div
      style={{
        borderRadius: "14px",
        border: "1px solid var(--color-border)",
        background: "var(--color-card)",
        boxShadow: "0 8px 32px -8px rgba(15,23,42,0.28), 0 2px 8px -2px rgba(15,23,42,0.12)",
        padding: "10px 14px",
        minWidth: "210px",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 7, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Día {label}{point.eventDate ? ` · ${point.eventDate}` : ""}
      </p>
      {stemRows.map(renderRow)}
      {hasWeight ? (
        <>
          <div style={{ borderTop: "1px solid var(--color-border)", margin: "6px 0" }} />
          {weightRows.map(renderRow)}
        </>
      ) : null}
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

export const HarvestCurveChart = memo(function HarvestCurveChart({
  data,
  projectionStartDay,
  summary,
}: HarvestCurveChartProps) {
  const projectionEndDay = data[data.length - 1]?.eventDay ?? null;

  const showWeightBar = summary && (summary.totalGreenWeightKg > 0 || summary.totalPostWeightKg > 0);

  return (
    <div className="w-full space-y-3">
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={420}>
        <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="harvestCurveFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.34} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="harvestProjectionFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.18} />
              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.02} />
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
          <Tooltip content={<HarvestTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {projectionStartDay && projectionEndDay ? (
            <ReferenceArea
              fill="url(#harvestProjectionFill)"
              fillOpacity={1}
              ifOverflow="extendDomain"
              x1={projectionStartDay}
              x2={projectionEndDay}
            />
          ) : null}
          <Area
            dataKey="dailyStems"
            fill="url(#harvestCurveFill)"
            name="Corte diario"
            stroke="transparent"
            type="monotone"
            yAxisId={0}
          />
          <Line
            activeDot={{ fill: "var(--color-primary)", r: 4.5, strokeWidth: 0 }}
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
            activeDot={{ fill: "var(--color-accent)", r: 4.5, strokeWidth: 0 }}
            dataKey="projectedCumulativeStems"
            dot={false}
            name="Acumulado proyectado"
            stroke="color-mix(in oklab, var(--color-accent) 68%, var(--color-foreground) 32%)"
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
              stroke="color-mix(in oklab, var(--color-foreground) 58%, var(--color-accent) 42%)"
              strokeDasharray="6 4"
              strokeWidth={2}
              x={projectionStartDay}
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      {showWeightBar ? (
        <div className="flex flex-wrap gap-2 px-1">
          <SummaryPill label="Cajas verde:" value={formatNumber(summary.greenBoxes)} />
          <SummaryPill label="Cajas blanco:" value={formatNumber(summary.postBoxes)} />
          {summary.weightPerStemG !== null ? (
            <SummaryPill label="Peso/tallo:" value={`${formatNumber(summary.weightPerStemG)} g`} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
