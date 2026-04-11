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
  CycleLaborHoursPayload,
  CycleLaborCostAreaSummary,
  CycleLaborSubCostCenterSummary,
  CycleLaborActivityTypeSummary,
  CycleLaborActivitySummary,
  CycleLaborPersonSummary,
} from "@/lib/fenograma";
import type {
  ProductividadDashboardData,
  ProductividadEtapa,
  ProductividadFilters,
  ProductividadRow,
} from "@/lib/productividad";

// ── Fetcher ───────────────────────────────────────────────────────────────────
const prodFetcher = (url: string) =>
  fetchJson<ProductividadDashboardData>(url, "No se pudo cargar el dashboard de productividad.");

const detailFetcher = (url: string) =>
  fetchJson<CycleLaborHoursPayload>(url, "No se pudo cargar el detalle del ciclo.");

// ── Query string ──────────────────────────────────────────────────────────────
function buildQueryString(filters: ProductividadFilters): string {
  const params = new URLSearchParams();
  params.set("year", filters.year);
  params.set("month", filters.month);
  params.set("spType", filters.spType);
  params.set("variety", filters.variety);
  params.set("area", filters.area);
  params.set("status", filters.status);
  params.set("costArea", filters.costArea);
  return params.toString();
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(value: number | null, decimals = 2, suffix = ""): string {
  if (value === null) return "\u2014";
  return value.toLocaleString("es-EC", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) + suffix;
}

function fmtPct(value: number | null): string {
  if (value === null) return "\u2014";
  return value.toLocaleString("es-EC", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "%";
}

// ── BlockModalRow builder ─────────────────────────────────────────────────────
function buildBlockModalRow(row: ProductividadRow): BlockModalRow {
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

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  Abierto:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  Cerrado:     "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  Planificado: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
};

function StatusBadge({ status }: { status: "Planificado" | "Abierto" | "Cerrado" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

// ── Cycle-level grouping (for summary metrics) ───────────────────────────────
type CycleGroup = {
  cycleKey: string;
  block: string;
  area: string;
  variety: string;
  spType: string;
  cycleStatus: "Planificado" | "Abierto" | "Cerrado";
  pctMortality: number | null;
  representative: ProductividadRow;
  totalEffectiveHours: number;
  cajas: number | null;
  camas30: number | null;
  horaCaja: number | null;
  cajaCama: number | null;
  horaCama: number | null;
  tallosPlanta: number | null;
  pesoTalloGramos: number | null;
};

type YearGroup = {
  year: string;
  cycles: CycleGroup[];
  totalEffectiveHours: number;
};

function groupRows(rows: ProductividadRow[]): YearGroup[] {
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
        cycleStatus: row.cycleStatus,
        pctMortality: row.pctMortality,
        representative: row,
        totalEffectiveHours: 0,
        cajas: row.cajas,
        camas30: row.camas30,
        horaCaja: null,
        cajaCama: row.cajaCama,
        horaCama: null,
        tallosPlanta: row.tallosPlanta,
        pesoTalloGramos: row.pesoTalloGramos,
      });
    }
    cycleMap.get(key)!.totalEffectiveHours += row.effectiveHours ?? 0;
  }

  for (const cycle of cycleMap.values()) {
    const cajas = cycle.cajas;
    cycle.horaCaja = cajas !== null && cajas > 0 ? cycle.totalEffectiveHours / cajas : null;
    cycle.horaCama = (cycle.horaCaja !== null && cycle.cajaCama !== null)
      ? cycle.horaCaja * cycle.cajaCama : null;
  }

  const yearMap = new Map<string, YearGroup>();
  const collator = new Intl.Collator("es-EC", { numeric: true });

  for (const cycle of cycleMap.values()) {
    const year = String(cycle.representative.harvestYear ?? "Sin ano");
    if (!yearMap.has(year)) {
      yearMap.set(year, { year, cycles: [], totalEffectiveHours: 0 });
    }
    const yg = yearMap.get(year)!;
    yg.cycles.push(cycle);
    yg.totalEffectiveHours += cycle.totalEffectiveHours;
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
  id, label, value, options, onChange,
}: {
  id: string; label: string; value: string; options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <select
        id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">Todos</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
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

// ── Table helpers ─────────────────────────────────────────────────────────────
function TH({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={`border-b border-border/60 bg-background/95 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function TD({
  children, right = false, muted = false, className = "", colSpan,
}: {
  children?: React.ReactNode; right?: boolean; muted?: boolean;
  className?: string; colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`border-b border-border/40 px-3 py-2 text-sm whitespace-nowrap ${right ? "text-right" : ""} ${muted ? "text-muted-foreground" : ""} ${className}`}>
      {children}
    </td>
  );
}

// ── CycleDetailRows: lazy-loaded person-level drill-down ─────────────────────
function CycleDetailRows({
  cycleKey, cajas, camas30,
}: {
  cycleKey: string; cajas: number | null; camas30: number | null;
}) {
  const { data, error, isLoading } = useSWR(
    `/api/productividad/${encodeURIComponent(cycleKey)}/detail`,
    detailFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const hCaja = (hours: number) => (cajas !== null && cajas > 0 ? hours / cajas : null);
  const hCama = (hours: number) => (camas30 !== null && camas30 > 0 ? hours / camas30 : null);

  if (isLoading) {
    return (
      <tr><TD colSpan={11}>
        <div className="ml-10 flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" /> Cargando detalle...
        </div>
      </TD></tr>
    );
  }
  if (error || !data) {
    return (
      <tr><TD colSpan={11}>
        <div className="ml-10 py-2 text-xs text-destructive">
          {error?.message || "Error al cargar detalle"}
        </div>
      </TD></tr>
    );
  }

  return (
    <>
      {data.costAreas.map((ca: CycleLaborCostAreaSummary) => {
        const caKey = `ca|${cycleKey}|${ca.costArea}`;
        const caOpen = expanded.has(caKey);
        return (
          <>
            <tr key={caKey} className="cursor-pointer bg-muted/20 hover:bg-muted/30" onClick={() => toggle(caKey)}>
              <TD>
                <span className="ml-10 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {caOpen ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
                  {ca.costArea}
                  <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[9px] font-normal">{ca.subCostCenters.length} sub</Badge>
                </span>
              </TD>
              <TD /><TD /><TD /><TD /><TD />
              <TD right className="text-xs font-semibold">{fmt(hCaja(ca.effectiveHours))}</TD>
              <TD />
              <TD right className="text-xs font-semibold">{fmt(hCama(ca.effectiveHours))}</TD>
              <TD /><TD />
            </tr>

            {caOpen && ca.subCostCenters.map((sub: CycleLaborSubCostCenterSummary) => {
              const subKey = `sub|${caKey}|${sub.subCostCenter}`;
              const subOpen = expanded.has(subKey);
              return (
                <>
                  <tr key={subKey} className="cursor-pointer bg-background/30 hover:bg-muted/15" onClick={() => toggle(subKey)}>
                    <TD>
                      <span className="ml-16 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {subOpen ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
                        <Badge variant="outline" className="rounded px-1 py-0 text-[9px] font-normal">SUB</Badge>
                        {sub.subCostCenter}
                        <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[9px] font-normal">{sub.activityTypes.length} tipos</Badge>
                      </span>
                    </TD>
                    <TD /><TD /><TD /><TD /><TD />
                    <TD right className="text-xs text-muted-foreground">{fmt(hCaja(sub.effectiveHours))}</TD>
                    <TD />
                    <TD right className="text-xs text-muted-foreground">{fmt(hCama(sub.effectiveHours))}</TD>
                    <TD /><TD />
                  </tr>

                  {subOpen && sub.activityTypes.map((at: CycleLaborActivityTypeSummary) => {
                    const atKey = `at|${subKey}|${at.activityType}`;
                    const atOpen = expanded.has(atKey);
                    return (
                      <>
                        <tr key={atKey} className="cursor-pointer bg-background/20 hover:bg-muted/10" onClick={() => toggle(atKey)}>
                          <TD>
                            <span className="ml-[88px] flex items-center gap-1.5 text-xs text-muted-foreground/80">
                              {atOpen ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
                              {at.activityType}
                              <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[9px] font-normal">{at.activities.length} act.</Badge>
                            </span>
                          </TD>
                          <TD /><TD /><TD /><TD /><TD />
                          <TD right className="text-[11px] text-muted-foreground/70">{fmt(hCaja(at.effectiveHours))}</TD>
                          <TD />
                          <TD right className="text-[11px] text-muted-foreground/70">{fmt(hCama(at.effectiveHours))}</TD>
                          <TD /><TD />
                        </tr>

                        {atOpen && at.activities.map((act: CycleLaborActivitySummary) => {
                          const actKey = `act|${atKey}|${act.activityId}`;
                          const actOpen = expanded.has(actKey);
                          return (
                            <>
                              <tr key={actKey} className={`bg-background/10 ${act.people.length > 0 ? "cursor-pointer hover:bg-muted/10" : ""}`} onClick={act.people.length > 0 ? () => toggle(actKey) : undefined}>
                                <TD>
                                  <span className="ml-[112px] flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                                    {act.people.length > 0 && (actOpen
                                      ? <ChevronDown className="size-2.5 shrink-0" />
                                      : <ChevronRight className="size-2.5 shrink-0" />)}
                                    {act.activityName}
                                  </span>
                                </TD>
                                <TD className="text-[10px] text-muted-foreground/60">{act.unitOfMeasure}</TD>
                                <TD right className="text-[11px] text-muted-foreground/60">{fmt(act.unitsProduced, 1)}</TD>
                                <TD right className="text-[11px] text-muted-foreground/60">{fmt(act.actualHours, 1)}</TD>
                                <TD right className="text-[11px] text-muted-foreground/60">{fmt(act.effectiveHours, 1)}</TD>
                                <TD />
                                <TD right className="text-[11px] text-muted-foreground/70">{fmt(hCaja(act.effectiveHours))}</TD>
                                <TD />
                                <TD right className="text-[11px] text-muted-foreground/70">{fmt(hCama(act.effectiveHours))}</TD>
                                <TD right className="text-[11px] text-muted-foreground/60">{fmt(act.productivity, 2)}</TD>
                                <TD right className="text-[11px] text-muted-foreground/60">{fmtPct(act.rendimientoPct)}</TD>
                              </tr>

                              {/* Person rows */}
                              {actOpen && act.people.map((p: CycleLaborPersonSummary) => (
                                <tr key={`p|${actKey}|${p.personId}`} className="bg-background/5">
                                  <TD>
                                    <span className="ml-[136px] text-[11px] text-muted-foreground/60">
                                      {p.personName || "Sin nombre"}{" "}
                                      <span className="text-[10px] text-muted-foreground/40">[{p.personId}]</span>
                                    </span>
                                  </TD>
                                  <TD className="text-[10px] text-muted-foreground/50">{p.unitOfMeasure}</TD>
                                  <TD right className="text-[11px] text-muted-foreground/50">{fmt(p.unitsProduced, 1)}</TD>
                                  <TD right className="text-[11px] text-muted-foreground/50">{fmt(p.actualHours, 2)}</TD>
                                  <TD right className="text-[11px] text-muted-foreground/50">{fmt(p.effectiveHours, 2)}</TD>
                                  <TD />
                                  <TD />
                                  <TD />
                                  <TD />
                                  <TD right className="text-[11px] text-muted-foreground/50">{fmt(p.productivity, 2)}</TD>
                                  <TD right className="text-[11px] text-muted-foreground/50">{fmtPct(p.rendimientoPct)}</TD>
                                </tr>
                              ))}
                            </>
                          );
                        })}
                      </>
                    );
                  })}
                </>
              );
            })}
          </>
        );
      })}
    </>
  );
}

// ── ProductividadTable ────────────────────────────────────────────────────────
function ProductividadTable({
  yearGroups,
  onCycleClick,
}: {
  yearGroups: YearGroup[];
  onCycleClick: (row: ProductividadRow) => void;
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
      <table className="min-w-[1200px] w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <TH>Ciclo / Bloque</TH>
            <TH>Area</TH>
            <TH>Variedad</TH>
            <TH>Tipo SP</TH>
            <TH>Estado</TH>
            <TH right>Mort. %</TH>
            <TH right>Hora / Caja</TH>
            <TH right>Caja / Cama</TH>
            <TH right>Hora / Cama</TH>
            <TH right>Tallos / Planta</TH>
            <TH right>Peso Tallo (g)</TH>
          </tr>
        </thead>
        <tbody>
          {yearGroups.map((yg) => {
            const yearOpen = expandedYears.has(yg.year);
            const yearCajas = yg.cycles.reduce((s, c) => s + (c.cajas ?? 0), 0);
            const yearHoraCaja = yearCajas > 0 ? yg.totalEffectiveHours / yearCajas : null;

            return (
              <>
                {/* ── Year row ── */}
                <tr key={`year-${yg.year}`} className="cursor-pointer bg-muted/40 hover:bg-muted/60" onClick={() => toggleYear(yg.year)}>
                  <TD className="font-semibold">
                    <div className="flex items-center gap-2">
                      {yearOpen ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                      <span>{yg.year}</span>
                      <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">{yg.cycles.length} ciclos</Badge>
                    </div>
                  </TD>
                  <TD /><TD /><TD /><TD /><TD />
                  <TD right className="font-semibold">{fmt(yearHoraCaja)}</TD>
                  <TD /><TD /><TD /><TD />
                </tr>

                {yearOpen && yg.cycles.map((cycle) => {
                  const cycleOpen = expandedCycles.has(cycle.cycleKey);

                  return (
                    <>
                      {/* ── Cycle row ── */}
                      <tr key={`cycle-${cycle.cycleKey}`} className="cursor-pointer bg-background/60 hover:bg-primary/5 transition-colors" onClick={(e) => { e.stopPropagation(); toggleCycle(cycle.cycleKey); }}>
                        <TD>
                          <div className="flex items-center gap-2">
                            <span className="ml-4 flex items-center gap-1.5">
                              {cycleOpen ? <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                              <button type="button" className="font-medium text-foreground hover:text-primary hover:underline underline-offset-2" onClick={(e) => { e.stopPropagation(); onCycleClick(cycle.representative); }} title="Ver ficha del bloque">
                                {cycle.cycleKey}
                              </button>
                            </span>
                            <span className="text-xs text-muted-foreground">{cycle.block}</span>
                          </div>
                        </TD>
                        <TD muted>{cycle.area}</TD>
                        <TD muted>{cycle.variety}</TD>
                        <TD muted>{cycle.spType}</TD>
                        <TD><StatusBadge status={cycle.cycleStatus} /></TD>
                        <TD right muted>{fmtPct(cycle.pctMortality)}</TD>
                        <TD right className="font-medium">{fmt(cycle.horaCaja)}</TD>
                        <TD right muted>{fmt(cycle.cajaCama)}</TD>
                        <TD right muted>{fmt(cycle.horaCama)}</TD>
                        <TD right muted>{fmt(cycle.tallosPlanta)}</TD>
                        <TD right muted>{fmt(cycle.pesoTalloGramos)}</TD>
                      </tr>

                      {/* ── Detail drill-down (lazy-loaded) ── */}
                      {cycleOpen && (
                        <CycleDetailRows
                          cycleKey={cycle.cycleKey}
                          cajas={cycle.cajas}
                          camas30={cycle.camas30}
                        />
                      )}
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
export function ProductividadExplorer({ initialData }: { initialData: ProductividadDashboardData }) {
  const [filters, setFilters] = useState<ProductividadFilters>(initialData.filters);
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
  } = useSWR(`/api/productividad?${filterKey}`, prodFetcher, {
    fallbackData: filterKey === initialFilterKey ? initialData : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 15000,
    onError: (err) => toast.error(err?.message || "Error al cargar productividad"),
  });

  const data = dashboardData ?? initialData;
  const yearGroups = useMemo(() => groupRows(data.rows), [data.rows]);

  function updateFilter<K extends keyof ProductividadFilters>(key: K, value: ProductividadFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialData.filters);
  }

  const etapaOptions: { value: ProductividadEtapa; label: string }[] = [
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
              <CardTitle className="text-2xl">Productividad</CardTitle>
              <p className="text-sm text-muted-foreground">
                Productividad de mano de obra por ciclo y etapa operativa. Haz click en un ciclo para abrir su ficha completa. Expande para ver el detalle por persona.
              </p>
            </div>
            <div className="rounded-full bg-slate-900/10 p-4 text-slate-700 dark:bg-slate-900/20 dark:text-white">
              <Clock className="size-6" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Filtros */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
            <SelectField id="prod-year" label="Ano" value={filters.year} options={data.options.years} onChange={(v) => updateFilter("year", v)} />
            <SelectField id="prod-month" label="Mes" value={filters.month} options={data.options.months} onChange={(v) => updateFilter("month", v)} />
            <SelectField id="prod-area" label="Area" value={filters.area} options={data.options.areas} onChange={(v) => updateFilter("area", v)} />
            <SelectField id="prod-sp-type" label="Tipo SP" value={filters.spType} options={data.options.spTypes} onChange={(v) => updateFilter("spType", v)} />
            <SelectField id="prod-variety" label="Variedad" value={filters.variety} options={data.options.varieties} onChange={(v) => updateFilter("variety", v)} />
            <SelectField id="prod-status" label="Estado" value={filters.status} options={data.options.statuses} onChange={(v) => updateFilter("status", v)} />
            {/* Etapa (select especial) */}
            <div className="space-y-1.5">
              <label htmlFor="prod-etapa" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Etapa
              </label>
              <select
                id="prod-etapa" value={filters.costArea}
                onChange={(e) => updateFilter("costArea", e.target.value as ProductividadEtapa)}
                className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {etapaOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
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
              Actualizando dashboard de productividad.
            </div>
          ) : null}
          {dashboardError ? (
            <div className="flex items-center gap-3 text-sm text-destructive">
              {dashboardError.message}
              <button type="button" className="underline underline-offset-2 hover:text-destructive/80" onClick={() => mutate()}>Reintentar</button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Tabla ── */}
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardContent className="pt-6">
          <ProductividadTable
            yearGroups={yearGroups}
            onCycleClick={(row) => setSelectedBlockRow(buildBlockModalRow(row))}
          />
        </CardContent>
      </Card>

      {/* ── Block Profile Modal ── */}
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
