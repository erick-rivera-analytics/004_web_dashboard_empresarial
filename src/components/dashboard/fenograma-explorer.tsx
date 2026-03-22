"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { LoaderCircle, RefreshCcw, Sprout } from "lucide-react";
import useSWR from "swr";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { FenogramaPivotTable } from "@/components/dashboard/fenograma-pivot-table";
import { FenogramaWeeklyBarsPanel } from "@/components/dashboard/fenograma-weekly-bars-panel";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { fetchJson } from "@/lib/fetch-json";
import type {
  FenogramaDashboardData,
  FenogramaFilters,
  FenogramaLifecycle,
  FenogramaPivotRow,
} from "@/lib/fenograma";

const lifecycleLabels: Record<FenogramaLifecycle, string> = {
  active: "Activos",
  planned: "Planificados",
  history: "Historia",
};

const fenogramaFetcher = (url: string) =>
  fetchJson<FenogramaDashboardData>(url, "No se pudo filtrar el fenograma.");

function buildQueryString(filters: FenogramaFilters) {
  const params = new URLSearchParams();
  params.set("includeActive", String(filters.includeActive));
  params.set("includePlanned", String(filters.includePlanned));
  params.set("includeHistory", String(filters.includeHistory));
  params.set("area", filters.area);
  params.set("variety", filters.variety);
  params.set("spType", filters.spType);
  params.set("startWeek", filters.startWeek);
  params.set("endWeek", filters.endWeek);
  return params.toString();
}

function SelectField({ id, label, value, options, onChange, emptyLabel = "Todos" }: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <option value={emptyLabel === "Todos" ? "all" : ""}>{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function LifecycleChip({ active, label, onClick }: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? "inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
        : "inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"}
    >
      {label}
    </button>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function FenogramaExplorer({ initialData }: { initialData: FenogramaDashboardData }) {
  const [filters, setFilters] = useState<FenogramaFilters>(initialData.filters);
  const [selectedRow, setSelectedRow] = useState<FenogramaPivotRow | null>(null);
  const deferredFilters = useDeferredValue(filters);
  const initialFilterKey = useMemo(() => buildQueryString(initialData.filters), [initialData.filters]);
  const filterKey = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);
  const {
    data: dashboardData,
    error: dashboardError,
    isValidating,
    mutate,
  } = useSWR(
    `/api/fenograma/pivot?${filterKey}`,
    fenogramaFetcher,
    {
      fallbackData: filterKey === initialFilterKey ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );
  const data = dashboardData ?? initialData;
  const blockModal = useBlockProfileModal(selectedRow);

  function updateFilter<Key extends keyof FenogramaFilters>(key: Key, value: FenogramaFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateWeekRange(boundary: "startWeek" | "endWeek", value: string) {
    setFilters((current) => {
      const nextFilters = {
        ...current,
        [boundary]: value,
      };

      if (
        nextFilters.startWeek
        && nextFilters.endWeek
        && Number(nextFilters.startWeek) > Number(nextFilters.endWeek)
      ) {
        if (boundary === "startWeek") {
          nextFilters.endWeek = value;
        } else {
          nextFilters.startWeek = value;
        }
      }

      return nextFilters;
    });
  }

  function resetFilters() {
    setFilters(initialData.filters);
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Pivot semanal por dimensiones y rango manual
              </Badge>
              <CardTitle className="text-2xl">Fenograma</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">{data.summary.rowCount} filas</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">{data.summary.weekCount} semanas</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">{data.summary.totalStems.toLocaleString("en-US")} tallos</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(lifecycleLabels) as FenogramaLifecycle[]).map((status) => {
              const key = status === "active" ? "includeActive" : status === "planned" ? "includePlanned" : "includeHistory";
              return <LifecycleChip key={status} active={filters[key]} label={lifecycleLabels[status]} onClick={() => updateFilter(key, !filters[key])} />;
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MultiSelectField id="fenograma-area" label="Areas" value={filters.area} options={data.options.areas} onChange={(value) => updateFilter("area", value)} />
            <MultiSelectField id="fenograma-variety" label="Variedades" value={filters.variety} options={data.options.varieties} onChange={(value) => updateFilter("variety", value)} />
            <MultiSelectField id="fenograma-sp-type" label="Tipos SP" value={filters.spType} options={data.options.spTypes} onChange={(value) => updateFilter("spType", value)} />
            <SelectField
              id="fenograma-start-week"
              label="Semana desde"
              value={filters.startWeek}
              options={data.availableWeeks}
              emptyLabel="Inicio disponible"
              onChange={(value) => updateWeekRange("startWeek", value)}
            />
            <SelectField
              id="fenograma-end-week"
              label="Semana hasta"
              value={filters.endWeek}
              options={data.availableWeeks}
              emptyLabel="Fin disponible"
              onChange={(value) => updateWeekRange("endWeek", value)}
            />
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium leading-none">Rango visible</p>
              <div className="rounded-2xl border border-border/70 bg-background/72 px-4 py-3 text-sm text-muted-foreground">
                <p>
                  {data.summary.firstWeek ?? "-"} a {data.summary.lastWeek ?? "-"}
                </p>
                <p className="mt-1 text-xs">
                  {data.availableWeeks.length} semanas disponibles en el dataset.
                </p>
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricPill label="Activos" value={`${data.summary.activeRows}`} />
            <MetricPill label="Planificados" value={`${data.summary.plannedRows}`} />
            <MetricPill label="Historia" value={`${data.summary.historyRows}`} />
            <MetricPill label="Hoy" value={formatDate(data.today)} />
          </div>

          {isValidating ? <div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Actualizando fenograma.</div> : null}
          {dashboardError ? <div className="flex items-center gap-3 text-sm text-destructive">{dashboardError.message}<button type="button" className="underline underline-offset-2 hover:text-destructive/80" onClick={() => mutate()}>Reintentar</button></div> : null}
        </CardContent>
      </Card>

      <FenogramaPivotTable data={data} onRowSelect={setSelectedRow} />

      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/12 p-3 text-primary"><Sprout className="size-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <CardTitle>Acumulado semanal</CardTitle>
              <p className="text-sm text-muted-foreground">Tallos por semana para el rango visible actual.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FenogramaWeeklyBarsPanel data={data.weeklyTotals} />
        </CardContent>
      </Card>

      <BlockProfileModal
        row={selectedRow}
        data={blockModal.blockData}
        loading={blockModal.blockLoading}
        error={blockModal.blockError}
        selectedCycleKey={blockModal.selectedCycleKey}
        bedData={blockModal.bedData}
        bedLoading={blockModal.bedLoading}
        bedError={blockModal.bedError}
        selectedValveCycleKey={blockModal.selectedValveCycleKey}
        valvesData={blockModal.valvesData}
        valvesLoading={blockModal.valvesLoading}
        valvesError={blockModal.valvesError}
        selectedValve={blockModal.selectedValve}
        valveData={blockModal.valveData}
        valveLoading={blockModal.valveLoading}
        valveError={blockModal.valveError}
        selectedCurveCycleKey={blockModal.selectedCurveCycleKey}
        curveData={blockModal.curveData}
        curveLoading={blockModal.curveLoading}
        curveError={blockModal.curveError}
        selectedMortalityCurve={blockModal.selectedMortalityCurve}
        mortalityCurveData={blockModal.mortalityCurveData}
        mortalityCurveLoading={blockModal.mortalityCurveLoading}
        mortalityCurveError={blockModal.mortalityCurveError}
        onOpenBeds={blockModal.openBeds}
        onCloseBeds={blockModal.closeBeds}
        onOpenValves={blockModal.openValves}
        onCloseValves={blockModal.closeValves}
        onOpenValve={blockModal.openValve}
        onOpenCurve={blockModal.openCurve}
        onCloseCurve={blockModal.closeCurve}
        onOpenCycleMortalityCurve={blockModal.openCycleMortalityCurve}
        onOpenValveMortalityCurve={blockModal.openValveMortalityCurve}
        onOpenBedMortalityCurve={blockModal.openBedMortalityCurve}
        onCloseMortalityCurve={blockModal.closeMortalityCurve}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}
