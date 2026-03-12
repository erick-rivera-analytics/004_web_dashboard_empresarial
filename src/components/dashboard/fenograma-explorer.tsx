"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, RefreshCcw, Sprout } from "lucide-react";

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

function buildQueryString(filters: FenogramaFilters) {
  const params = new URLSearchParams();
  params.set("includeActive", String(filters.includeActive));
  params.set("includePlanned", String(filters.includePlanned));
  params.set("includeHistory", String(filters.includeHistory));
  params.set("area", filters.area);
  params.set("variety", filters.variety);
  params.set("spType", filters.spType);
  return params.toString();
}

function SelectField({ id, label, value, options, onChange }: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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
        <option value="all">Todos</option>
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
  const [data, setData] = useState<FenogramaDashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<FenogramaPivotRow | null>(null);
  const initialFilterKey = useRef(buildQueryString(initialData.filters));
  const filterKey = useMemo(() => buildQueryString(filters), [filters]);
  const blockModal = useBlockProfileModal(selectedRow);

  useEffect(() => {
    if (filterKey === initialFilterKey.current) {
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/fenograma/pivot?${filterKey}`, { signal: controller.signal });
        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo filtrar el fenograma.");
        }
        const nextData = (await response.json()) as FenogramaDashboardData;
        startTransition(() => {
          setData(nextData);
        });
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo filtrar el fenograma.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void load();
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [filterKey]);

  function updateFilter<Key extends keyof FenogramaFilters>(key: Key, value: FenogramaFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
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
                Default: Activos + Planificados / maximo 24 semanas visibles
              </Badge>
              <CardTitle className="text-2xl">Fenograma operativo</CardTitle>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SelectField id="fenograma-area" label="Area" value={filters.area} options={data.options.areas} onChange={(value) => updateFilter("area", value)} />
            <SelectField id="fenograma-variety" label="Variedad" value={filters.variety} options={data.options.varieties} onChange={(value) => updateFilter("variety", value)} />
            <SelectField id="fenograma-sp-type" label="SP" value={filters.spType} options={data.options.spTypes} onChange={(value) => updateFilter("spType", value)} />
            <div className="min-w-0 space-y-2">
              <Label>Rango visible</Label>
              <div className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground">{data.summary.firstWeek ?? "-"} a {data.summary.lastWeek ?? "-"}</div>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                <RefreshCcw className="size-4" />
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

          {loading ? <div className="flex items-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Actualizando fenograma.</div> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
        </CardContent>
      </Card>

      <FenogramaPivotTable data={data} onRowSelect={setSelectedRow} />

      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/12 p-3 text-primary"><Sprout className="size-5" /></div>
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
        onOpenBeds={blockModal.openBeds}
        onCloseBeds={blockModal.closeBeds}
        onOpenValves={blockModal.openValves}
        onOpenValve={blockModal.openValve}
        onOpenCurve={blockModal.openCurve}
        onCloseCurve={blockModal.closeCurve}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}
