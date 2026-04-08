"use client";

import { useEffect, useDeferredValue, useMemo, useState } from "react";
import { Activity, LoaderCircle, RefreshCcw } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { MortalityCurvePanel } from "@/components/dashboard/mortality-curve-panel";
import { MortalityTable } from "@/components/dashboard/mortality-table";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { fetchJson } from "@/lib/fetch-json";
import type { BlockModalRow } from "@/lib/fenograma";
import type {
  MortalityCurvePayload,
  MortalityDashboardData,
  MortalityDashboardRow,
  MortalityFilters,
} from "@/lib/mortality";

const mortalityDashboardFetcher = (url: string) =>
  fetchJson<MortalityDashboardData>(url, "No se pudo cargar el dashboard de mortandades.");

const mortalityCurveFetcher = (url: string) =>
  fetchJson<MortalityCurvePayload>(url, "No se pudo cargar la curva de mortandad.");

function buildQueryString(filters: MortalityFilters) {
  const params = new URLSearchParams();
  params.set("area", filters.area);
  params.set("spType", filters.spType);
  params.set("variety", filters.variety);
  params.set("parentBlock", filters.parentBlock);
  params.set("block", filters.block);
  return params.toString();
}

function formatNumber(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function formatPercent(value: number | null) {
  return value === null ? "-" : `${value.toFixed(2)}%`;
}

function MetricPill({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "bad" | "warn" | "good" | "neutral";
}) {
  const accentClass =
    accent === "bad"
      ? "border-l-4 border-l-destructive/60 pl-3"
      : accent === "warn"
        ? "border-l-4 border-l-amber-500/60 pl-3"
        : accent === "good"
          ? "border-l-4 border-l-emerald-500/60 pl-3"
          : "";

  return (
    <div className={`rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function buildBlockModalRow(row: MortalityDashboardRow): BlockModalRow {
  return {
    block: row.parentBlock || row.block,
    cycleKey: null,
    area: row.area,
    variety: row.variety,
    spType: row.spType,
    spDate: row.validFrom,
    harvestStartDate: null,
    harvestEndDate: row.validTo,
    totalStems: 0,
    primaryMetricLabel: "Mortandad del ciclo",
    primaryMetricText: formatPercent(row.mortalityPct),
  };
}

export function MortalityExplorer({ initialData }: { initialData: MortalityDashboardData }) {
  const [filters, setFilters] = useState<MortalityFilters>(initialData.filters);
  const [selectedBlockRow, setSelectedBlockRow] = useState<BlockModalRow | null>(null);
  const deferredFilters = useDeferredValue(filters);
  const initialFilterKey = useMemo(() => buildQueryString(initialData.filters), [initialData.filters]);
  const filterKey = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);
  const blockModal = useBlockProfileModal(selectedBlockRow);
  const {
    data: dashboardData,
    error: dashboardError,
    isValidating,
    mutate,
  } = useSWR(
    `/api/mortality?${filterKey}`,
    mortalityDashboardFetcher,
    {
      fallbackData: filterKey === initialFilterKey ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );
  const data = dashboardData ?? initialData;

  useEffect(() => { if (dashboardError) toast.error(dashboardError.message || "Error al cargar datos"); }, [dashboardError]);

  const {
    data: curveData,
    error: curveError,
    isLoading: curveLoading,
  } = useSWR(
    `/api/mortality/curve?${filterKey}`,
    mortalityCurveFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );

  function updateFilter<Key extends keyof MortalityFilters>(key: Key, value: MortalityFilters[Key]) {
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
                Indicadores / Produccion / Campo
              </Badge>
              <CardTitle className="text-2xl">Mortandades</CardTitle>
              <p className="text-sm text-muted-foreground">
                Curva agregada ponderada por filtros y tabla de ciclos con apertura al historial completo del bloque.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {data.summary.totalCycles} ciclos
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MultiSelectField id="mortality-area" label="Area" value={filters.area} options={data.options.areas} onChange={(value) => updateFilter("area", value)} />
            <MultiSelectField id="mortality-sp-type" label="Tipo SP" value={filters.spType} options={data.options.spTypes} onChange={(value) => updateFilter("spType", value)} />
            <MultiSelectField id="mortality-variety" label="Variedad" value={filters.variety} options={data.options.varieties} onChange={(value) => updateFilter("variety", value)} />
            <MultiSelectField id="mortality-parent-block" label="Bloque padre" value={filters.parentBlock} options={data.options.parentBlocks} onChange={(value) => updateFilter("parentBlock", value)} />
            <MultiSelectField id="mortality-block" label="Bloque" value={filters.block} options={data.options.blocks} onChange={(value) => updateFilter("block", value)} />
            <div className="flex items-end">
              <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricPill label="Mortandad ponderada" value={formatPercent(data.summary.weightedMortalityPct)} accent="bad" />
            <MetricPill label="Bajas" value={formatNumber(data.summary.totalDeadPlants)} accent="bad" />
            <MetricPill label="Resiembras" value={formatNumber(data.summary.totalReseededPlants)} accent="warn" />
            <MetricPill label="Plantas finales" value={formatNumber(data.summary.totalFinalPlants)} accent="good" />
          </div>

          {isValidating ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Actualizando dashboard de mortandades.
            </div>
          ) : null}
          {dashboardError ? <div className="flex items-center gap-3 text-sm text-destructive">{dashboardError.message}<button type="button" className="underline underline-offset-2 hover:text-destructive/80" onClick={() => mutate()}>Reintentar</button></div> : null}
        </CardContent>
      </Card>

      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-900/10 dark:bg-slate-800/20 p-3 text-slate-700 dark:text-slate-400">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle>Curva de mortandades</CardTitle>
              <p className="text-sm text-muted-foreground">
                Promedio ponderado diario y acumulado segun los filtros activos.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.rows.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricPill label="Ciclos visibles" value={`${data.summary.totalCycles}`} />
                <MetricPill label="Mortandad acumulada actual" value={curveData ? formatPercent(curveData.summary.lastCumulativeMortalityPct) : "-"} />
                <MetricPill label="Mortandad diaria actual" value={curveData ? formatPercent(curveData.summary.lastDailyMortalityPct) : "-"} />
                <MetricPill label="Bajas acumuladas" value={curveData ? formatNumber(curveData.summary.totalDeadPlants) : formatNumber(data.summary.totalDeadPlants)} />
                <MetricPill label="Resiembras acumuladas" value={curveData ? formatNumber(curveData.summary.totalReseededPlants) : formatNumber(data.summary.totalReseededPlants)} />
              </div>

              {curveLoading ? (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Cargando curva agregada.
                </div>
              ) : curveError ? (
                <div className="text-sm text-destructive">{curveError.message}</div>
              ) : curveData?.points.length ? (
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                  <MortalityCurvePanel data={curveData.points} />
                </div>
              ) : (
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-6 text-sm text-muted-foreground">
                  No hay datos diarios para el corte actual.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[24px] border border-border/70 bg-background/72 p-6 text-sm text-muted-foreground">
              No hay ciclos disponibles para el filtro actual.
            </div>
          )}
        </CardContent>
      </Card>

      <MortalityTable
        rows={data.rows}
        onOpenHistory={(row) => setSelectedBlockRow(buildBlockModalRow(row))}
      />

      <BlockProfileModal
        row={selectedBlockRow}
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
        onClose={() => setSelectedBlockRow(null)}
      />
    </div>
  );
}
