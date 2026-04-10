"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Clock, ChevronDown, ChevronRight, LoaderCircle, RefreshCcw } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchJson } from "@/lib/fetch-json";
import type { BlockModalRow } from "@/lib/fenograma";
import type {
  HorasDashboardData,
  HorasEtapa,
  HorasFilters,
  HorasRow,
} from "@/lib/horas";

// ── Fetcher ───────────────────────────────────────────────────────────────────
const horasFetcher = (url: string) =>
  fetchJson<HorasDashboardData>(url, "No se pudo cargar el dashboard de horas.");

// ── Query string ──────────────────────────────────────────────────────────────
function buildQueryString(filters: HorasFilters): string {
  const params = new URLSearchParams();
  params.set("year", filters.year);
  params.set("month", filters.month);
  params.set("spType", filters.spType);
  params.set("variety", filters.variety);
  params.set("costArea", filters.costArea);
  return params.toString();
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(value: number | null, decimals = 2, suffix = ""): string {
  if (value === null) return "—";
  return value.toLocaleString("es-EC", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) + suffix;
}

// ── BlockModalRow builder ─────────────────────────────────────────────────────
function buildBlockModalRow(row: HorasRow): BlockModalRow {
  return {
    block: row.block || row.cycleKey,
    cycleKey: row.cycleKey,
    area: row.area,
    variety: row.variety,
    spType: row.spType,
    spDate: row.spDate,
    harvestStartDate: row.harvestStartDate,
    harvestEndDate: row.harvestEndDate,
    totalStems: row.totalStems ?? 0,
    primaryMetricLabel: "Hora / Caja",
    primaryMetricText: fmt(row.horaCaja, 2, " h"),
  };
}

// ── Grouping logic ────────────────────────────────────────────────────────────
type SubCenterGroup = {
  subCostCenter: string;
  rows: HorasRow[];
  effectiveHours: number;
  unitsProduced: number;
  horaCaja: number | null;
};

type CycleGroup = {
  cycleKey: string;
  block: string;
  area: string;
  variety: string;
  spType: string;
  representative: HorasRow;
  etapaGroups: EtapaGroup[];
  totalEffectiveHours: number;
  totalUnitsProduced: number;
  horaCaja: number | null;
  cajaCama: number | null;
  tallosPlanta: number | null;
  pesoTalloGramos: number | null;
};

type EtapaGroup = {
  etapaLabel: string;
  costArea: string;
  subCenters: SubCenterGroup[];
  effectiveHours: number;
  unitsProduced: number;
  horaCaja: number | null;
};

type YearGroup = {
  year: string;
  cycles: CycleGroup[];
  totalEffectiveHours: number;
  totalUnitsProduced: number;
};

function groupRows(rows: HorasRow[]): YearGroup[] {
  // Collect unique cycles first
  const cycleMap = new Map<string, CycleGroup>();

  for (const row of rows) {
    const key = row.cycleKey;
    if (!cycleMap.has(key)) {
      cycleMap.set(key, {
        cycleKey: row.cycleKey,
        block: row.block,
        area: row.area,
        variety: row.variety,
        spType: row.spType,
        representative: row,
        etapaGroups: [],
        totalEffectiveHours: 0,
        totalUnitsProduced: 0,
        horaCaja: null,
        cajaCama: row.cajaCama,
        tallosPlanta: row.tallosPlanta,
        pesoTalloGramos: row.pesoTalloGramos,
      });
    }
    const cycle = cycleMap.get(key)!;
    cycle.totalEffectiveHours += row.effectiveHours ?? 0;
    cycle.totalUnitsProduced += row.unitsProduced ?? 0;
  }

  // Build etapa + sub_center groups per cycle
  for (const [cycleKey, cycle] of cycleMap) {
    const etapaMap = new Map<string, EtapaGroup>();

    for (const row of rows.filter((r) => r.cycleKey === cycleKey)) {
      const etapaKey = row.costArea;
      if (!etapaMap.has(etapaKey)) {
        etapaMap.set(etapaKey, {
          etapaLabel: row.etapaLabel,
          costArea: row.costArea,
          subCenters: [],
          effectiveHours: 0,
          unitsProduced: 0,
          horaCaja: null,
        });
      }
      const etapa = etapaMap.get(etapaKey)!;
      etapa.effectiveHours += row.effectiveHours ?? 0;
      etapa.unitsProduced += row.unitsProduced ?? 0;

      etapa.subCenters.push({
        subCostCenter: row.subCostCenter,
        rows: [row],
        effectiveHours: row.effectiveHours ?? 0,
        unitsProduced: row.unitsProduced ?? 0,
        horaCaja: row.horaCaja,
      });
    }

    // Compute etapa horaCaja
    for (const etapa of etapaMap.values()) {
      etapa.horaCaja = etapa.unitsProduced > 0
        ? etapa.effectiveHours / etapa.unitsProduced
        : null;
    }

    cycle.etapaGroups = Array.from(etapaMap.values()).sort((a, b) =>
      a.etapaLabel.localeCompare(b.etapaLabel),
    );

    cycle.horaCaja = cycle.totalUnitsProduced > 0
      ? cycle.totalEffectiveHours / cycle.totalUnitsProduced
      : null;
  }

  // Group cycles by year
  const yearMap = new Map<string, YearGroup>();
  const collator = new Intl.Collator("es-EC", { numeric: true });

  for (const cycle of cycleMap.values()) {
    const year = String(cycle.representative.harvestYear ?? "Sin año");
    if (!yearMap.has(year)) {
      yearMap.set(year, { year, cycles: [], totalEffectiveHours: 0, totalUnitsProduced: 0 });
    }
    const yg = yearMap.get(year)!;
    yg.cycles.push(cycle);
    yg.totalEffectiveHours += cycle.totalEffectiveHours;
    yg.totalUnitsProduced += cycle.totalUnitsProduced;
  }

  return Array.from(yearMap.values())
    .sort((a, b) => collator.compare(b.year, a.year))
    .map((yg) => ({
      ...yg,
      cycles: yg.cycles.sort((a, b) => collator.compare(a.block, b.block)),
    }));
}

// ── SelectField ───────────────────────────────────────────────────────────────
function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">Todos</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

// ── MetricPill ────────────────────────────────────────────────────────────────
function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/80 px-4 py-3 text-left">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

// ── Table header cell ─────────────────────────────────────────────────────────
function TH({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`border-b border-border/60 bg-background/95 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

// ── Table data cell ───────────────────────────────────────────────────────────
function TD({
  children,
  right = false,
  muted = false,
  className = "",
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-b border-border/40 px-3 py-2 text-sm whitespace-nowrap ${right ? "text-right" : ""} ${muted ? "text-muted-foreground" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

// ── HorasTable ────────────────────────────────────────────────────────────────
function HorasTable({
  yearGroups,
  onCycleClick,
}: {
  yearGroups: YearGroup[];
  onCycleClick: (row: HorasRow) => void;
}) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    () => new Set(yearGroups.map((yg) => yg.year)),
  );
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  function toggleYear(year: string) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  function toggleCycle(cycleKey: string) {
    setExpandedCycles((prev) => {
      const next = new Set(prev);
      next.has(cycleKey) ? next.delete(cycleKey) : next.add(cycleKey);
      return next;
    });
  }

  if (!yearGroups.length) {
    return (
      <div className="rounded-[24px] border border-border/60 bg-background/72 px-4 py-8 text-center text-sm text-muted-foreground">
        No hay datos disponibles para el filtro actual.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-border/60">
      <table className="min-w-[900px] w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <TH>Ciclo / Bloque</TH>
            <TH>Area</TH>
            <TH>Variedad</TH>
            <TH>Tipo SP</TH>
            <TH right>Hora / Caja</TH>
            <TH right>Caja / Cama</TH>
            <TH right>Tallos / Planta</TH>
            <TH right>Peso Tallo (g)</TH>
          </tr>
        </thead>
        <tbody>
          {yearGroups.map((yg) => {
            const yearOpen = expandedYears.has(yg.year);
            const yearHoraCaja = yg.totalUnitsProduced > 0
              ? yg.totalEffectiveHours / yg.totalUnitsProduced
              : null;

            return (
              <>
                {/* ── Year row ── */}
                <tr
                  key={`year-${yg.year}`}
                  className="cursor-pointer bg-muted/40 hover:bg-muted/60"
                  onClick={() => toggleYear(yg.year)}
                >
                  <TD className="font-semibold" colSpan={0}>
                    <div className="flex items-center gap-2">
                      {yearOpen
                        ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span>{yg.year}</span>
                      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                        {yg.cycles.length} ciclos
                      </Badge>
                    </div>
                  </TD>
                  <TD />
                  <TD />
                  <TD />
                  <TD right className="font-semibold">{fmt(yearHoraCaja)}</TD>
                  <TD />
                  <TD />
                  <TD />
                </tr>

                {yearOpen && yg.cycles.map((cycle) => {
                  const cycleOpen = expandedCycles.has(cycle.cycleKey);

                  return (
                    <>
                      {/* ── Cycle row ── */}
                      <tr
                        key={`cycle-${cycle.cycleKey}`}
                        className="cursor-pointer bg-background/60 hover:bg-primary/5 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Expand/collapse on left part, open modal on right part is handled by button
                          toggleCycle(cycle.cycleKey);
                        }}
                      >
                        <TD>
                          <div className="flex items-center gap-2">
                            <span className="ml-4 flex items-center gap-1.5">
                              {cycleOpen
                                ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                              <button
                                type="button"
                                className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCycleClick(cycle.representative);
                                }}
                                title="Ver ficha del bloque"
                              >
                                {cycle.cycleKey}
                              </button>
                            </span>
                            <span className="text-xs text-muted-foreground">{cycle.block}</span>
                          </div>
                        </TD>
                        <TD muted>{cycle.area}</TD>
                        <TD muted>{cycle.variety}</TD>
                        <TD muted>{cycle.spType}</TD>
                        <TD right className="font-medium">{fmt(cycle.horaCaja)}</TD>
                        <TD right muted>{fmt(cycle.cajaCama)}</TD>
                        <TD right muted>{fmt(cycle.tallosPlanta)}</TD>
                        <TD right muted>{fmt(cycle.pesoTalloGramos)}</TD>
                      </tr>

                      {/* ── Etapa + sub_center rows ── */}
                      {cycleOpen && cycle.etapaGroups.map((etapa) => (
                        <>
                          {/* Etapa row */}
                          <tr key={`etapa-${cycle.cycleKey}-${etapa.costArea}`} className="bg-muted/20">
                            <TD>
                              <span className="ml-10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {etapa.etapaLabel}
                              </span>
                            </TD>
                            <TD />
                            <TD />
                            <TD />
                            <TD right className="text-xs font-semibold">{fmt(etapa.horaCaja)}</TD>
                            <TD />
                            <TD />
                            <TD />
                          </tr>
                          {/* Sub center rows */}
                          {etapa.subCenters.map((sub) => (
                            <tr
                              key={`sub-${cycle.cycleKey}-${etapa.costArea}-${sub.subCostCenter}`}
                              className="bg-background/30"
                            >
                              <TD>
                                <span className="ml-16 text-xs text-muted-foreground">
                                  {sub.subCostCenter}
                                </span>
                              </TD>
                              <TD />
                              <TD />
                              <TD />
                              <TD right className="text-xs text-muted-foreground">{fmt(sub.horaCaja)}</TD>
                              <TD />
                              <TD />
                              <TD />
                            </tr>
                          ))}
                        </>
                      ))}
                    </>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Explorer ─────────────────────────────────────────────────────────────
export function HorasExplorer({ initialData }: { initialData: HorasDashboardData }) {
  const [filters, setFilters] = useState<HorasFilters>(initialData.filters);
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
  } = useSWR(`/api/horas?${filterKey}`, horasFetcher, {
    fallbackData: filterKey === initialFilterKey ? initialData : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 15000,
    onError: (err) => toast.error(err?.message || "Error al cargar horas"),
  });

  const data = dashboardData ?? initialData;

  const yearGroups = useMemo(() => groupRows(data.rows), [data.rows]);

  function updateFilter<K extends keyof HorasFilters>(key: K, value: HorasFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialData.filters);
  }

  const etapaOptions: { value: HorasEtapa; label: string }[] = [
    { value: "all", label: "Todas las etapas" },
    { value: "CAMPO", label: "Vegetativo (Campo)" },
    { value: "COSECHA", label: "Cosecha" },
  ];

  return (
    <div className="min-w-0 space-y-4">
      {/* ── Header + Filtros ── */}
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Dashboard / Indicadores / Campo
              </Badge>
              <CardTitle className="text-2xl">Horas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Productividad de mano de obra por ciclo y etapa operativa. Haz click en un ciclo para abrir su ficha completa.
              </p>
            </div>
            <div className="rounded-full bg-slate-900/10 p-4 text-slate-700 dark:bg-slate-900/20 dark:text-white">
              <Clock className="size-6" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <SelectField
              id="horas-year"
              label="Año"
              value={filters.year}
              options={data.options.years}
              onChange={(v) => updateFilter("year", v)}
            />
            <SelectField
              id="horas-month"
              label="Mes"
              value={filters.month}
              options={data.options.months}
              onChange={(v) => updateFilter("month", v)}
            />
            <SelectField
              id="horas-sp-type"
              label="Tipo SP"
              value={filters.spType}
              options={data.options.spTypes}
              onChange={(v) => updateFilter("spType", v)}
            />
            <SelectField
              id="horas-variety"
              label="Variedad"
              value={filters.variety}
              options={data.options.varieties}
              onChange={(v) => updateFilter("variety", v)}
            />
            {/* Etapa (select especial) */}
            <div className="space-y-1.5">
              <label htmlFor="horas-etapa" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Etapa
              </label>
              <select
                id="horas-etapa"
                value={filters.costArea}
                onChange={(e) => updateFilter("costArea", e.target.value as HorasEtapa)}
                className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {etapaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          {/* Summary tiles */}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricPill label="Ciclos" value={String(data.summary.totalCycles)} />
            <MetricPill label="Horas efectivas" value={fmt(data.summary.totalEffectiveHours, 1, " h")} />
            <MetricPill label="Unidades producidas" value={fmt(data.summary.totalUnitsProduced, 0)} />
            <MetricPill label="Hora / Caja promedio" value={fmt(data.summary.weightedHoraCaja, 2, " h")} />
          </div>

          {/* Loading / Error state */}
          {isValidating ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Actualizando dashboard de horas.
            </div>
          ) : null}
          {dashboardError ? (
            <div className="flex items-center gap-3 text-sm text-destructive">
              {dashboardError.message}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-destructive/80"
                onClick={() => mutate()}
              >
                Reintentar
              </button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Tabla ── */}
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardContent className="pt-6">
          <HorasTable
            yearGroups={yearGroups}
            onCycleClick={(row) => setSelectedBlockRow(buildBlockModalRow(row))}
          />
        </CardContent>
      </Card>

      {/* ── Block Profile Modal (reutiliza el existente de fenograma) ── */}
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
