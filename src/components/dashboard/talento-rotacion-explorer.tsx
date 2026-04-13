"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { fetchJson } from "@/lib/fetch-json";
import { formatWeekLabel } from "@/lib/talento-humano-utils";
import type {
  TalentoFilters,
  TalentoPersonRecord,
  TalentoRotacionData,
  TalentoRotacionWeekRow,
} from "@/lib/talento-humano";
import {
  BAR_COLORS,
  EmptyState,
  MetricPill,
  PersonListModal,
  WeekSelect,
  buildTalentoQueryString,
} from "@/components/dashboard/talento-shared";

const rotacionFetcher = (url: string) =>
  fetchJson<TalentoRotacionData>(url, "No se pudo cargar rotacion laboral.");

const ROTACION_CLIENT_VERSION = "2";

type SelectedGroup = { title: string; people: TalentoPersonRecord[] };

export function TalentoRotacionExplorer({ initialData }: { initialData: TalentoRotacionData }) {
  const [filters, setFilters] = useState<TalentoFilters>(initialData.filters);
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const deferredFilters = useDeferredValue(filters);

  const initialQuery = useMemo(() => buildTalentoQueryString(initialData.filters), [initialData.filters]);
  const queryString = useMemo(() => buildTalentoQueryString(deferredFilters), [deferredFilters]);

  const { data, isValidating, mutate } = useSWR(
    `/api/talento-humano/rotacion?v=${ROTACION_CLIENT_VERSION}&${queryString}`,
    rotacionFetcher,
    {
      fallbackData: queryString === initialQuery ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
      onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar rotacion laboral."),
    },
  );

  const current = data ?? initialData;
  const ingresos = current.ingresos ?? [];
  const salidas = current.salidas ?? [];
  const options = current.options;
  const summary = {
    totalIngresos: current.summary.totalIngresos ?? ingresos.length,
    totalSalidas: current.summary.totalSalidas ?? salidas.length,
    avgActivos: current.summary.avgActivos ?? 0,
    rotationRate: current.summary.rotationRate ?? null,
  };

  function setFilter<K extends keyof TalentoFilters>(key: K, value: TalentoFilters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function selectWeek(week: TalentoRotacionWeekRow, kind: "ingresos" | "salidas") {
    const people = kind === "ingresos"
      ? ingresos.filter((person) => person.isoWeekId === week.isoWeekId)
      : salidas.filter((person) => person.isoWeekId === week.isoWeekId);
    setSelectedGroup({
      people,
      title: `${formatWeekLabel(week.isoWeekId)} - ${kind}`,
    });
  }

  const rotationRate = summary.rotationRate === null
    ? "-"
    : `${summary.rotationRate.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <WeekSelect label="Semana desde" value={filters.weekFrom} onChange={(value) => setFilter("weekFrom", value)} />
          <WeekSelect label="Semana hasta" value={filters.weekTo} onChange={(value) => setFilter("weekTo", value)} />
          <MultiSelectField id="talento-rot-area-general" label="Area general" value={filters.areaGeneral} options={options.areaGenerals} onChange={(value) => setFilter("areaGeneral", value)} />
          <MultiSelectField id="talento-rot-area" label="Area" value={filters.area} options={options.areas} onChange={(value) => setFilter("area", value)} />
          <MultiSelectField id="talento-rot-cargo" label="Cargo" value={filters.jobTitle} options={options.jobTitles} onChange={(value) => setFilter("jobTitle", value)} />
          <MultiSelectField id="talento-rot-genero" label="Genero" value={filters.gender} options={options.genders} onChange={(value) => setFilter("gender", value)} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => setFilters(initialData.filters)}>
            <RefreshCcw className="size-3.5" />
            Restablecer
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`size-3.5 ${isValidating ? "animate-spin" : ""}`} />
            {isValidating ? "Cargando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricPill label="Total ingresos" value={summary.totalIngresos.toLocaleString("en-US")} />
        <MetricPill label="Total salidas" value={summary.totalSalidas.toLocaleString("en-US")} />
        <MetricPill label="Promedio activos" value={summary.avgActivos.toLocaleString("en-US")} />
        <MetricPill label="Tasa de rotacion" value={rotationRate} />
      </div>

      {current.weeklyEvolution.length ? (
        <WeeklyEvolutionChart data={current.weeklyEvolution} onSelect={selectWeek} />
      ) : (
        <EmptyState label="No hay semanas disponibles para el rango seleccionado." />
      )}

      {selectedGroup ? (
        <PersonListModal
          title={selectedGroup.title}
          people={selectedGroup.people}
          onClose={() => setSelectedGroup(null)}
        />
      ) : null}
    </div>
  );
}

function WeeklyEvolutionChart({
  data,
  onSelect,
}: {
  data: TalentoRotacionWeekRow[];
  onSelect: (week: TalentoRotacionWeekRow, kind: "ingresos" | "salidas") => void;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
      <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground/70">Evolucion semanal</p>
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={360}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="isoWeekId"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => formatWeekLabel(value)}
              minTickGap={18}
            />
            <YAxis
              yAxisId="salidas"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="activos"
              orientation="right"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.25 }}
              labelFormatter={(value) => formatWeekLabel(String(value))}
              contentStyle={{
                fontSize: 12,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="entries"
              name="Ingresos"
              yAxisId="salidas"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              fill="var(--color-chart-success-bold)"
              fillOpacity={0.72}
              onClick={(entry: unknown) => {
                const week = (entry as { payload?: TalentoRotacionWeekRow }).payload;
                if (week) onSelect(week, "ingresos");
              }}
            />
            <Bar
              dataKey="exits"
              name="Salidas"
              yAxisId="salidas"
              radius={[6, 6, 0, 0]}
              cursor="pointer"
              onClick={(entry: unknown) => {
                const week = (entry as { payload?: TalentoRotacionWeekRow }).payload;
                if (week) onSelect(week, "salidas");
              }}
            >
              {data.map((entry, index) => (
                <Cell key={entry.isoWeekId} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.88} />
              ))}
            </Bar>
            <Line
              dataKey="activos"
              name="Activos"
              yAxisId="activos"
              type="monotone"
              dot={false}
              stroke="var(--chart-line-secondary)"
              strokeWidth={2.5}
              activeDot={{ r: 4, strokeWidth: 0, fill: "var(--chart-line-secondary)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
