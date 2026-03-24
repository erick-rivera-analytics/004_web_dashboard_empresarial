"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { LineChart, LoaderCircle, Rows3, Sprout, X } from "lucide-react";

import { HarvestCurvePanel } from "@/components/dashboard/harvest-curve-panel";
import { MortalityCurvePanel } from "@/components/dashboard/mortality-curve-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ProcessViewerOverlay = dynamic(
  () =>
    import("@/components/dashboard/process-viewer-overlay").then(
      (mod) => mod.ProcessViewerOverlay,
    ),
  { ssr: false },
);
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  BedProfileCard,
  BedProfilePayload,
  BlockModalRow,
  CycleProfileBlockPayload,
  CycleProfileCard,
  HarvestCurvePayload,
  ValveProfilePayload,
  ValveProfilesByCyclePayload,
} from "@/lib/fenograma";
import type { MortalityCurvePayload } from "@/lib/mortality";
import type { SelectedMortalityCurveState } from "@/hooks/use-block-profile-modal";

function formatDate(value: string | null) {
  if (!value || value.startsWith("9999-")) {
    return "-";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
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
  if (value === null) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

function getTrailingSegment(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "-";
  }

  const parts = normalized.split("-");
  return parts[parts.length - 1] || normalized;
}

function getValveDisplayName(valveName: string | null | undefined, valveId: string | null | undefined) {
  const normalizedName = valveName?.trim();

  if (normalizedName) {
    return normalizedName;
  }

  return getTrailingSegment(valveId ?? "");
}

/**
 * Deriva el estado operativo del ciclo desde isCurrent + isValid + status.
 * Mapping:
 * - isCurrent && isValid → Activo
 * - !isCurrent && isValid → Cerrado
 * - !isValid → Planificado
 * Si el status raw es "planned" o similar, se fuerza Planificado.
 */
function deriveCycleOperationalStatus(cycle: CycleProfileCard): string {
  const rawStatus = cycle.status?.toLowerCase().trim() ?? "";

  if (rawStatus === "planned" || rawStatus === "planificado") {
    return "Planificado";
  }

  if (cycle.isCurrent && cycle.isValid) {
    return "Activo";
  }

  if (!cycle.isCurrent && cycle.isValid) {
    return "Cerrado";
  }

  return "Planificado";
}

/**
 * Traduce el estado raw a Fase en español.
 * Mapping aplicado:
 * - active / activo / harvesting → Vegetativo (ciclo vivo pre-cosecha o en cosecha)
 * - closed / cerrado → Cerrado
 * - planned / planificado → Planificado
 * - harvest / cosecha → Cosecha
 * Si no coincide, se devuelve capitalizado.
 */
function deriveCyclePhase(cycle: CycleProfileCard): string {
  const rawStatus = cycle.status?.toLowerCase().trim() ?? "";

  if (rawStatus.includes("harvest") || rawStatus.includes("cosecha")) {
    return "Cosecha";
  }

  if (rawStatus === "active" || rawStatus === "activo") {
    return "Vegetativo";
  }

  if (rawStatus === "closed" || rawStatus === "cerrado") {
    return "Cerrado";
  }

  if (rawStatus === "planned" || rawStatus === "planificado") {
    return "Planificado";
  }

  if (cycle.isCurrent) {
    return "Vegetativo";
  }

  if (!cycle.isCurrent && cycle.isValid) {
    return "Cerrado";
  }

  return "Planificado";
}

/** Camas 30 m² = superficie / 30. Retorna null si no hay superficie confiable. */
function computeCamas30(bedArea: number | null): number | null {
  if (bedArea === null || bedArea <= 0) {
    return null;
  }

  return Math.round((bedArea / 30) * 100) / 100;
}

/**
 * Plantas del programa: macro-ponderado sobre todos los ciclos visibles.
 * Suma programmedPlants de todos los ciclos.
 */
function computeProgrammedPlantsAcrossCycles(cycles: CycleProfileCard[]): number | null {
  const values = cycles.map((c) => c.programmedPlants).filter((v): v is number => v !== null);

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, v) => sum + v, 0);
}

/**
 * Resuelve el "Estado actual" agregado más útil del bloque/modal.
 * Prioridad: Activo > Cosecha > Vegetativo > Planificado > Cerrado.
 */
function resolveAggregatedOperationalStatus(cycles: CycleProfileCard[]): string {
  if (!cycles.length) {
    return "-";
  }

  const statuses = cycles.map(deriveCycleOperationalStatus);

  if (statuses.includes("Activo")) {
    return "Activo";
  }

  if (statuses.includes("Planificado")) {
    return "Planificado";
  }

  return "Cerrado";
}

function getBedSortValue(bedId: string) {
  const trailingSegment = getTrailingSegment(bedId);
  const numericValue = Number(trailingSegment);
  return Number.isFinite(numericValue) ? numericValue : Number.MAX_SAFE_INTEGER;
}

function MetricPill({
  label,
  value,
  onClick,
  hint,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  hint?: string;
}) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border/60 bg-card px-4 py-3.5 text-left",
        onClick && "cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.985]",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-1.5 break-words text-base font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</p> : null}
    </Comp>
  );
}

function DetailBadges({
  items,
}: {
  items: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="rounded-full px-3 py-1">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function BedsTable({
  beds,
  selectedValveId,
  onOpenValve,
  onOpenMortalityCurve,
}: {
  beds: BedProfileCard[];
  selectedValveId?: string | null;
  onOpenValve?: (valveId: string) => void;
  onOpenMortalityCurve?: (bedId: string) => void;
}) {
  const sortedBeds = [...beds].sort((left, right) => {
    const leftSortValue = getBedSortValue(left.bedId);
    const rightSortValue = getBedSortValue(right.bedId);

    if (leftSortValue !== rightSortValue) {
      return leftSortValue - rightSortValue;
    }

    return left.bedId.localeCompare(right.bedId, "en-US", { numeric: true });
  });

  return (
    <div className="overflow-auto rounded-2xl border border-border/70">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead className="bg-card/95">
          <tr>
            {[
              "Cama",
              "Valvula",
              "Programadas",
              "Inicio ciclo",
              "Vigentes",
              "Bajas",
              "Resiembras",
              "Disp. vs prog.",
              "Mortandad",
              "Pambiles",
              "Camas 30 m²",
              "Variedad",
              "SP",
              "Vigencia",
              "Acciones",
            ].map((label) => (
              <th
                key={label}
                className="border-b border-r border-border/70 px-3 py-2.5 text-left font-semibold text-foreground last:border-r-0"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedBeds.map((bed, index) => {
            const isActiveValve = Boolean(selectedValveId && selectedValveId === bed.valveId);

            return (
              <tr
                key={bed.recordId}
                className={cn(
                  index % 2 === 0 ? "bg-background/82" : "bg-background/68",
                  isActiveValve && "bg-primary/6",
                )}
              >
                <td className="border-b border-r border-border/60 px-3 py-2.5 font-medium">{getTrailingSegment(bed.bedId)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">
                  {bed.valveId && onOpenValve ? (
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => onOpenValve(bed.valveId)}
                    >
                      {getValveDisplayName(null, bed.valveId)}
                    </button>
                  ) : (
                    getValveDisplayName(null, bed.valveId)
                  )}
                </td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.programmedPlants)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.cycleStartPlants)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.currentPlants)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.deadPlants)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.reseededPlants)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatPercent(bed.availabilityVsScheduledPct)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatPercent(bed.mortalityPct)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.pambilesCount)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(computeCamas30(bed.bedArea))}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{bed.variety || "-"}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{bed.spType || "-"}</td>
                <td className="border-b border-border/60 px-3 py-2.5">
                  {formatDate(bed.validFrom)} / {formatDate(bed.validTo)}
                </td>
                <td className="border-b border-border/60 px-3 py-2.5">
                  {onOpenMortalityCurve ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => onOpenMortalityCurve(bed.bedId)}
                    >
                      <LineChart className="size-4" aria-hidden="true" />
                      Curva de mortandad
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BedsOverlay({
  cycleKey,
  data,
  loading,
  error,
  selectedValve,
  valveData,
  valveLoading,
  valveError,
  onOpenValve,
  onOpenValveBedsOverlay,
  onOpenBedMortalityCurve,
  onOpenValveMortalityCurve,
  onClose,
}: {
  cycleKey: string;
  data: BedProfilePayload | null;
  loading: boolean;
  error: string | null;
  selectedValve: { cycleKey: string; valveId: string } | null;
  valveData: ValveProfilePayload | null;
  valveLoading: boolean;
  valveError: string | null;
  onOpenValve: (cycleKey: string, valveId: string) => void;
  onOpenValveBedsOverlay: (cycleKey: string, valveId: string) => void;
  onOpenBedMortalityCurve: (cycleKey: string, bedId: string) => void;
  onOpenValveMortalityCurve: (cycleKey: string, valveId: string) => void;
  onClose: () => void;
}) {
  const selectedValveId = selectedValve?.cycleKey === cycleKey ? selectedValve.valveId : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/46 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-title-beds">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar detalle de camas" />
      <div className="starter-panel relative z-10 flex max-h-[90vh] w-[min(1480px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/22 sm:w-[min(1480px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Tabla de camas
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {cycleKey}
              </Badge>
            </div>
            <div className="min-w-0">
              <h3 id="modal-title-beds" className="text-2xl font-semibold tracking-tight">Detalle de camas</h3>
              <p className="break-words text-sm text-muted-foreground">
                Vista completa del ciclo con acceso directo al detalle de valvulas por cama.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Cargando detalle de camas.
            </div>
          ) : error ? (
            <div className="py-8 text-sm text-destructive">{error}</div>
          ) : data && data.cycleKey === cycleKey ? (
            data.beds.length ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DetailBadges
                    items={[
                      `${data.summary.totalBeds} camas`,
                      `${formatNumber(data.summary.totalProgrammedPlants)} programadas`,
                      `${formatNumber(data.summary.totalCurrentPlants)} vigentes`,
                      `${formatNumber(data.summary.totalBedArea)} superficie`,
                    ]}
                  />
                </div>

                <div className="max-h-[54vh] overflow-auto rounded-[24px] border border-border/70 bg-background/72 p-3">
                  <BedsTable
                    beds={data.beds}
                    selectedValveId={selectedValveId}
                    onOpenValve={(valveId) => onOpenValve(cycleKey, valveId)}
                    onOpenMortalityCurve={(bedId) => onOpenBedMortalityCurve(cycleKey, bedId)}
                  />
                </div>

                {selectedValveId ? (
                  <div className="rounded-[22px] border border-border/70 bg-card/90 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Detalle de valvula
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {valveData?.valve
                            ? `${getValveDisplayName(valveData.valve.valveName, valveData.valve.valveId)} / Bloque ${valveData.valve.blockId || valveData.valve.parentBlock || "-"}`
                            : getValveDisplayName(null, selectedValveId)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => onOpenValveBedsOverlay(cycleKey, selectedValveId)}
                        >
                          <Rows3 className="size-4" aria-hidden="true" />
                          Abrir tabla flotante de camas
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => onOpenValve(cycleKey, selectedValveId)}>
                          Ocultar detalle
                        </Button>
                      </div>
                    </div>
                    <ValveDetailPanel
                      data={valveData}
                      loading={valveLoading}
                      error={valveError}
                      onOpenBedsOverlay={() => onOpenValveBedsOverlay(cycleKey, selectedValveId)}
                      onOpenMortalityCurve={() => onOpenValveMortalityCurve(cycleKey, selectedValveId)}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <Rows3 className="size-5 opacity-40" aria-hidden="true" />
                No hay detalle de camas para este ciclo.
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <Rows3 className="size-5 opacity-40" aria-hidden="true" />
              No hay detalle de camas disponible para esta seleccion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ValveBedsOverlay({
  data,
  loading,
  error,
  onOpenBedMortalityCurve,
  onClose,
}: {
  data: ValveProfilePayload | null;
  loading: boolean;
  error: string | null;
  onOpenBedMortalityCurve: (cycleKey: string, bedId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-title-valve-beds">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar camas de la valvula" />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1420px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1420px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Camas de la valvula
              </Badge>
              {data?.valve ? (
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  {getValveDisplayName(data.valve.valveName, data.valve.valveId)}
                </Badge>
              ) : null}
            </div>
            <div className="min-w-0">
              <h3 id="modal-title-valve-beds" className="text-2xl font-semibold tracking-tight">Tabla flotante de camas</h3>
              <p className="break-words text-sm text-muted-foreground">
                Solo las camas asignadas a la valvula seleccionada del bloque {data?.valve?.blockId || data?.valve?.parentBlock || "-"}.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Cargando camas de la valvula.
            </div>
          ) : error ? (
            <div className="py-8 text-sm text-destructive">{error}</div>
          ) : data?.valve ? (
            data.beds.length ? (
              <div className="space-y-5">
                <DetailBadges
                  items={[
                    `${data.summary.totalBeds} camas`,
                    `${formatNumber(data.summary.totalProgrammedPlants)} programadas`,
                    `${formatNumber(data.summary.totalCurrentPlants)} vigentes`,
                  ]}
                />
                <div className="max-h-[56vh] overflow-auto rounded-[24px] border border-border/70 bg-background/72 p-3">
                  <BedsTable
                    beds={data.beds}
                    selectedValveId={data.valve.valveId}
                    onOpenMortalityCurve={(bedId) => onOpenBedMortalityCurve(data.cycleKey, bedId)}
                  />
                </div>
              </div>
            ) : (
              <div className="py-8 text-sm text-muted-foreground">
                No hay camas relacionadas con esta valvula.
              </div>
            )
          ) : (
            <div className="py-8 text-sm text-muted-foreground">
              No hay detalle de valvula disponible.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HarvestCurveOverlay({
  cycleKey,
  data,
  loading,
  error,
  onClose,
}: {
  cycleKey: string;
  data: HarvestCurvePayload | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-title-harvest-curve">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar curva de cosecha" />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1420px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1420px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Curva de cosecha por ciclo
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {cycleKey}
              </Badge>
            </div>
            <div className="min-w-0">
              <h3 id="modal-title-harvest-curve" className="text-2xl font-semibold tracking-tight">Curva de cosecha por ciclo</h3>
              <p className="break-words text-sm text-muted-foreground">
                Acumulado diario de tallos con separacion visual entre dato real y proyectado.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Cargando curva de cosecha.
            </div>
          ) : error ? (
            <div className="py-8 text-sm text-destructive">{error}</div>
          ) : data && data.cycleKey === cycleKey ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricPill label="Tallos ciclo" value={formatNumber(data.summary.totalStems)} />
                <MetricPill label="Tallos reales" value={formatNumber(data.summary.observedStems)} />
                <MetricPill label="Tallos proyectados" value={formatNumber(data.summary.projectedStems)} />
                <MetricPill
                  label="% avance"
                  value={
                    data.summary.totalStems > 0
                      ? formatPercent(
                        Math.round((data.summary.observedStems / data.summary.totalStems) * 10000) / 100,
                      )
                      : "-"
                  }
                  hint="Reales / tallos ciclo"
                />
                <MetricPill
                  label="Inicio proyeccion"
                  value={data.projectionStartDay ? `Dia ${data.projectionStartDay}` : "Sin proyeccion"}
                  hint={data.projectionStartDate ? formatDate(data.projectionStartDate) : undefined}
                />
                {/*
                  Métricas de peso: ahora conectadas desde productivity_green_cur / post_cur.
                */}
                <MetricPill
                  label="Peso ciclo"
                  value={
                    data.summary.totalGreenWeightKg > 0
                      ? `${formatNumber(data.summary.totalGreenWeightKg)} kg`
                      : "-"
                  }
                  hint={data.summary.totalGreenWeightKg > 0 ? "Peso verde acumulado" : "Sin datos de peso"}
                />
                <MetricPill
                  label="Peso / tallo ciclo"
                  value={
                    data.summary.weightPerStemG !== null
                      ? `${formatNumber(data.summary.weightPerStemG)} g`
                      : "-"
                  }
                  hint={data.summary.weightPerStemG !== null ? "Peso verde / tallos" : "Sin datos de peso"}
                />
              </div>

              {data.points.length ? (
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                  <HarvestCurvePanel
                    data={data.points}
                    projectionStartDay={data.projectionStartDay}
                    summary={data.summary}
                  />
                </div>
              ) : (
                <div className="rounded-[22px] border border-border/70 bg-background/72 p-6 text-sm text-muted-foreground">
                  No hay datos diarios para graficar este ciclo.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <LineChart className="size-5 opacity-40" aria-hidden="true" />
              No hay curva disponible para esta seleccion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildMortalityBadge(data: MortalityCurvePayload | null, selectedCurve: SelectedMortalityCurveState) {
  if (data?.label) {
    return data.label;
  }

  if (selectedCurve.entityType === "valve") {
    return selectedCurve.valveId;
  }

  if (selectedCurve.entityType === "bed") {
    return selectedCurve.bedId;
  }

  return selectedCurve.cycleKey;
}

function MortalityCurveOverlay({
  selectedCurve,
  data,
  loading,
  error,
  onClose,
}: {
  selectedCurve: SelectedMortalityCurveState;
  data: MortalityCurvePayload | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const badgeLabel = buildMortalityBadge(data, selectedCurve);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-title-mortality">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar curva de mortandad" />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1420px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1420px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Curva de mortandad
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {badgeLabel}
              </Badge>
            </div>
            <div className="min-w-0">
              <h3 id="modal-title-mortality" className="text-2xl font-semibold tracking-tight">Tendencia diaria de mortandad</h3>
              <p className="break-words text-sm text-muted-foreground">
                Mortandad diaria y acumulada segun bajas, resiembras y plantas iniciales del ciclo.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Cargando curva de mortandad.
            </div>
          ) : error ? (
            <div className="py-8 text-sm text-destructive">{error}</div>
          ) : data ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricPill label="Plantas programadas" value={formatNumber(data.summary.programmedPlants)} />
                <MetricPill label="Plantas inicio ciclo" value={formatNumber(data.summary.initialPlantsCycle)} />
                <MetricPill label="Resiembras" value={formatNumber(data.summary.totalReseededPlants)} />
                <MetricPill label="Plantas muertas" value={formatNumber(data.summary.totalDeadPlants)} />
                <MetricPill
                  label="Plantas vigentes"
                  value={
                    data.summary.initialPlantsCycle > 0
                      ? formatNumber(
                        data.summary.initialPlantsCycle
                          - data.summary.totalDeadPlants
                          + data.summary.totalReseededPlants,
                      )
                      : "-"
                  }
                />
                <MetricPill label="Mortandad" value={formatPercent(data.summary.lastCumulativeMortalityPct)} />
                <MetricPill label="Mortandad diaria actual" value={formatPercent(data.summary.lastDailyMortalityPct)} />
                <MetricPill label="Pico diario" value={formatPercent(data.summary.maxDailyMortalityPct)} />
                <MetricPill
                  label="Disp. vs programadas"
                  value={
                    data.summary.programmedPlants && data.summary.programmedPlants > 0
                      ? formatPercent(
                        Math.round(
                          (((data.summary.initialPlantsCycle - data.summary.totalDeadPlants + data.summary.totalReseededPlants) / data.summary.programmedPlants) * 100) * 100,
                        ) / 100,
                      )
                      : "-"
                  }
                  hint="Plantas vigentes / plantas programadas"
                />
              </div>

              {data.points.length ? (
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                  <MortalityCurvePanel data={data.points} />
                </div>
              ) : (
                <div className="rounded-[22px] border border-border/70 bg-background/72 p-6 text-sm text-muted-foreground">
                  No hay datos diarios de mortandad para esta seleccion.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <LineChart className="size-5 opacity-40" aria-hidden="true" />
              No hay curva de mortandad disponible para esta seleccion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CycleSelector({
  cycles,
  selectedCycleKey,
  onSelect,
}: {
  cycles: CycleProfileCard[];
  selectedCycleKey: string | null;
  onSelect: (cycleKey: string) => void;
}) {
  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => {
      const dateA = a.validFrom ?? "";
      const dateB = b.validFrom ?? "";
      return dateB.localeCompare(dateA);
    }),
    [cycles],
  );

  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-2xl border border-border/70 bg-background/80 px-4 py-3 pr-10 text-sm font-medium focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={selectedCycleKey ?? ""}
        onChange={(event) => onSelect(event.target.value)}
      >
        {sortedCycles.map((cycle) => (
          <option key={cycle.cycleKey} value={cycle.cycleKey}>
            {cycle.cycleKey} — {deriveCycleOperationalStatus(cycle)}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
        <svg className="size-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function ModalContent({
  data,
  filteredCycleKey,
  selectedValveCycleKey,
  selectedCurveCycleKey,
  selectedMortalityCurve,
  onOpenBeds,
  onOpenValves,
  onOpenCurve,
  onOpenCycleMortalityCurve,
}: {
  data: CycleProfileBlockPayload;
  filteredCycleKey: string | null;
  selectedValveCycleKey: string | null;
  selectedCurveCycleKey: string | null;
  selectedMortalityCurve: SelectedMortalityCurveState | null;
  onOpenBeds: (cycleKey: string) => void;
  onOpenValves: (cycleKey: string) => void;
  onOpenCurve: (cycleKey: string) => void;
  onOpenCycleMortalityCurve: (cycleKey: string) => void;
}) {
  const initialCycleKey = filteredCycleKey ?? data.cycles[0]?.cycleKey ?? null;
  const [activeCycleKey, setActiveCycleKey] = useState<string | null>(initialCycleKey);
  const [showProcessViewer, setShowProcessViewer] = useState(false);

  const cycle = useMemo(
    () => data.cycles.find((c) => c.cycleKey === activeCycleKey) ?? null,
    [data.cycles, activeCycleKey],
  );

  const aggregatedStatus = useMemo(
    () => resolveAggregatedOperationalStatus(data.cycles),
    [data.cycles],
  );

  const programmedPlantsTotal = useMemo(
    () => computeProgrammedPlantsAcrossCycles(data.cycles),
    [data.cycles],
  );

  const blockAggregates = useMemo(() => {
    let totalStems = 0;
    let totalCurrentPlants = 0;
    let totalGreenKg = 0;
    let totalBedArea = 0;
    for (const c of data.cycles) {
      totalStems += c.totalStems ?? 0;
      totalCurrentPlants += c.currentPlants ?? 0;
      totalGreenKg += c.greenWeightKg ?? 0;
      totalBedArea += c.bedArea ?? 0;
    }
    const camas30 = totalBedArea > 0 ? totalBedArea / 30 : null;
    const cajasVerde = totalGreenKg > 0 ? totalGreenKg / 10 : null;
    return {
      tallosPlanta: totalStems > 0 && totalCurrentPlants > 0 ? Math.round((totalStems / totalCurrentPlants) * 100) / 100 : null,
      cajasCama: cajasVerde && camas30 ? Math.round((cajasVerde / camas30) * 100) / 100 : null,
    };
  }, [data.cycles]);

  const showValvesActive = selectedValveCycleKey === activeCycleKey;
  const showCurveActive = selectedCurveCycleKey === activeCycleKey;
  const showMortalityCurveActive = selectedMortalityCurve?.entityType === "cycle"
    && selectedMortalityCurve.cycleKey === activeCycleKey;

  return (
    <div className="space-y-6">
      {/* B1: Summary row — Estado actual + new KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricPill
          label="Estado actual"
          value={aggregatedStatus}
          hint="Click para ver macroproceso"
          onClick={() => setShowProcessViewer(true)}
        />
        <MetricPill label="Tallos planta" value={formatNumber(blockAggregates.tallosPlanta)} hint="Tallos / plantas vigentes (todos ciclos)" />
        <MetricPill label="Cajas cama" value={formatNumber(blockAggregates.cajasCama)} hint="Cajas verde / camas 30m² (todos ciclos)" />
        <MetricPill label="Horas cama" value="-" hint="Sin fuente conectada" />
        <MetricPill label="Costo cama" value="-" hint="Sin fuente conectada" />
        <MetricPill
          label="Plantas del programa"
          value={formatNumber(programmedPlantsTotal)}
          hint="Macro-ponderado de todos los ciclos"
        />
      </div>

      {/* B2: Cycle selector */}
      {data.cycles.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Seleccionar ciclo</p>
          <CycleSelector
            cycles={data.cycles}
            selectedCycleKey={activeCycleKey}
            onSelect={setActiveCycleKey}
          />
        </div>
      ) : null}

      {/* B3: Selected cycle detail */}
      {cycle ? (
        <Card className="rounded-[24px] border-border/70 bg-background/80">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full px-3 py-1">{cycle.cycleKey}</Badge>
              <Badge
                variant={deriveCycleOperationalStatus(cycle) === "Activo" ? "secondary" : "outline"}
                className="rounded-full px-3 py-1"
              >
                {deriveCycleOperationalStatus(cycle)}
              </Badge>
            </div>
            <CardTitle className="text-base">
              Bloque {cycle.blockId || cycle.parentBlock}
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricPill label="Variedad" value={cycle.variety || "-"} />
            <MetricPill label="Tipo SP" value={cycle.spType || "-"} />
            <MetricPill label="Fase" value={deriveCyclePhase(cycle)} />
            <MetricPill label="Invernadero" value={cycle.greenhouse ? "Si" : "No"} />
            <MetricPill label="Luz" value={cycle.lightType && cycle.lightType.toLowerCase() !== "unknown" ? cycle.lightType : "-"} />
            <MetricPill
              label="Camas fisicas"
              value={formatNumber(cycle.bedCount)}
              hint="Abrir tabla flotante de camas"
              onClick={() => onOpenBeds(cycle.cycleKey)}
            />
            <MetricPill
              label="Valvulas"
              value={formatNumber(cycle.valveCount)}
              hint="Abrir ventana flotante de valvulas"
              onClick={() => onOpenValves(cycle.cycleKey)}
            />
            <MetricPill label="Pambiles" value={formatNumber(cycle.pambilesCount)} />
            <MetricPill label="Camas 30 m²" value={formatNumber(computeCamas30(cycle.bedArea))} />
            <MetricPill label="Plantas programadas" value={formatNumber(cycle.programmedPlants)} />
            <MetricPill label="Plantas vigentes" value={formatNumber(cycle.currentPlants)} />
            <MetricPill label="Disp. vs programadas" value={formatPercent(cycle.availabilityVsScheduledPct)} />
            <MetricPill label="Fecha inicio cosecha" value={formatDate(cycle.harvestStartDate)} />
            <MetricPill
              label="Tallos planta"
              value={cycle.totalStems && cycle.currentPlants ? formatNumber(Math.round((cycle.totalStems / cycle.currentPlants) * 100) / 100) : "-"}
            />
            <MetricPill
              label="Cajas en verde"
              value={cycle.greenWeightKg ? formatNumber(Math.round((cycle.greenWeightKg / 10) * 100) / 100) : "-"}
            />
            <MetricPill
              label="Cajas en blanco"
              value={cycle.postWeightKg ? formatNumber(Math.round((cycle.postWeightKg / 10) * 100) / 100) : "-"}
              hint="Estimado proporcional"
            />
            <MetricPill
              label="Cajas cama"
              value={cycle.greenWeightKg && cycle.bedArea ? formatNumber(Math.round(((cycle.greenWeightKg / 10) / computeCamas30(cycle.bedArea)!) * 100) / 100) : "-"}
              hint="Cajas verde / camas 30m²"
            />
            <MetricPill
              label="PESO / TALLO"
              value={cycle.greenWeightKg && cycle.totalStems ? `${formatNumber(Math.round((cycle.greenWeightKg / cycle.totalStems) * 1000 * 100) / 100)} g` : "-"}
            />
            <MetricPill
              label="Mortandad"
              value={formatPercent(cycle.mortalityPct)}
              hint="Click para ver curva de mortandad"
              onClick={() => onOpenCycleMortalityCurve(cycle.cycleKey)}
            />
            <MetricPill label="Desde" value={formatDate(cycle.validFrom)} />
            <MetricPill label="Hasta" value={formatDate(cycle.validTo)} />
          </CardContent>

          <CardContent className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button
              variant={showCurveActive ? "secondary" : "outline"}
              className="rounded-xl"
              onClick={() => onOpenCurve(cycle.cycleKey)}
            >
              <LineChart className="size-4" aria-hidden="true" />
              Curva de cosecha por ciclo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border border-border/70 bg-background/72 p-6 text-center text-sm text-muted-foreground">
          <Sprout className="size-5 opacity-40" aria-hidden="true" />
          No hay ciclos disponibles para este bloque con el criterio actual.
        </div>
      )}

      {/*
        BPMN del macroproceso de campo.
        Asset esperado: public/processes/campo-macroproceso-es.bpmn
        Si el archivo no existe, el visor mostrará un error informativo.
        Para conectar: crear el archivo BPMN y colocarlo en public/processes/.
      */}
      {showProcessViewer ? (
        <ProcessViewerOverlay
          title="Macroproceso de campo"
          subtitle="Flujo operativo del ciclo productivo. El asset BPMN debe colocarse en public/processes/campo-macroproceso-es.bpmn"
          assetPath="/processes/campo-macroproceso-es.bpmn"
          onClose={() => setShowProcessViewer(false)}
        />
      ) : null}
    </div>
  );
}

function ValveDetailPanel({
  data,
  loading,
  error,
  onOpenBedsOverlay,
  onOpenMortalityCurve,
}: {
  data: ValveProfilePayload | null;
  loading: boolean;
  error: string | null;
  onOpenBedsOverlay?: () => void;
  onOpenMortalityCurve?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Cargando detalle de la valvula.
      </div>
    );
  }

  if (error) {
    return <div className="py-4 text-sm text-destructive">{error}</div>;
  }

  if (!data || !data.valve) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
        <Rows3 className="size-5 opacity-40" aria-hidden="true" />
        No hay detalle de valvula disponible para esta seleccion.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricPill label="Valvula" value={getValveDisplayName(data.valve.valveName, data.valve.valveId)} />
        <MetricPill label="Bloque" value={data.valve.blockId || data.valve.parentBlock || "-"} />
        <MetricPill label="Camas 30 m²" value={formatNumber(computeCamas30(data.summary.totalBedArea))} />
        <MetricPill label="Camas fisicas" value={formatNumber(data.valve.bedCount)} />
        <MetricPill label="Pambiles" value={formatNumber(data.valve.pambilesCount)} />
        <MetricPill label="Plantas programadas" value={formatNumber(data.valve.programmedPlants)} />
        <MetricPill label="Inicio de ciclo" value={formatNumber(data.valve.cycleStartPlants)} />
        <MetricPill label="Plantas vigentes" value={formatNumber(data.valve.currentPlants)} />
        <MetricPill label="Bajas acumuladas" value={formatNumber(data.valve.deadPlants)} />
        <MetricPill label="Resiembras" value={formatNumber(data.valve.reseededPlants)} />
        <MetricPill label="Disp. vs programadas" value={formatPercent(data.valve.availabilityVsScheduledPct)} />
        <MetricPill
          label="Mortandad"
          value={formatPercent(data.valve.mortalityPct)}
          hint="Click para ver curva de mortandad"
          onClick={onOpenMortalityCurve}
        />
      </div>

      <div className="rounded-[20px] border border-border/70 bg-background/72 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Camas de la valvula
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {getValveDisplayName(data.valve.valveName, data.valve.valveId)} / Bloque {data.valve.blockId || data.valve.parentBlock || "-"}
            </p>
          </div>
          <DetailBadges
            items={[
              `${data.summary.totalBeds} camas fisicas`,
              `${formatNumber(data.summary.totalProgrammedPlants)} programadas`,
              `${formatNumber(data.summary.totalCurrentPlants)} vigentes`,
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function ValvesSection({
  cycleKey,
  data,
  loading,
  error,
  selectedValve,
  valveData,
  valveLoading,
  valveError,
  onOpenValve,
  onOpenValveBedsOverlay,
  onOpenValveMortalityCurve,
}: {
  cycleKey: string;
  data: ValveProfilesByCyclePayload | null;
  loading: boolean;
  error: string | null;
  selectedValve: { cycleKey: string; valveId: string } | null;
  valveData: ValveProfilePayload | null;
  valveLoading: boolean;
  valveError: string | null;
  onOpenValve: (cycleKey: string, valveId: string) => void;
  onOpenValveBedsOverlay: (cycleKey: string, valveId: string) => void;
  onOpenValveMortalityCurve: (cycleKey: string, valveId: string) => void;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-card/88 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Detalle de valvulas
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{cycleKey}</p>
        </div>
        {data && data.cycleKey === cycleKey ? (
          <DetailBadges
            items={[
              `${data.summary.totalValves} valvulas`,
              `${formatNumber(data.summary.totalProgrammedPlants)} programadas`,
              `${formatNumber(data.summary.totalCurrentPlants)} vigentes`,
            ]}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Cargando detalle de valvulas.
        </div>
      ) : error ? (
        <div className="py-6 text-sm text-destructive">{error}</div>
      ) : data && data.cycleKey === cycleKey ? (
        data.valves.length ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {data.valves.map((valve) => {
              const isSelected =
                selectedValve?.cycleKey === cycleKey && selectedValve?.valveId === valve.valveId;

              return (
                <div
                  key={valve.recordId}
                  className={cn(
                    "rounded-2xl border border-border/70 bg-background/82 p-4",
                    isSelected && "border-primary/30",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge className="rounded-full px-3 py-1">
                      {getValveDisplayName(valve.valveName, valve.valveId)}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {(valve.blockId || valve.parentBlock) ? (
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Bloque {valve.blockId || valve.parentBlock}
                        </Badge>
                      ) : null}
                      <Badge
                        variant={valve.isCurrent && valve.isValid ? "secondary" : "outline"}
                        className="rounded-full px-3 py-1"
                      >
                        {valve.isCurrent && valve.isValid
                          ? "Activo"
                          : !valve.isCurrent && valve.isValid
                            ? "Cerrado"
                            : "Planificado"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MetricPill label="Pambiles" value={formatNumber(valve.pambilesCount)} />
                    <MetricPill label="Plantas programadas" value={formatNumber(valve.programmedPlants)} />
                    <MetricPill label="Plantas vigentes" value={formatNumber(valve.currentPlants)} />
                    <MetricPill label="Inicio de ciclo" value={formatNumber(valve.cycleStartPlants)} />
                    <MetricPill label="Bajas acumuladas" value={formatNumber(valve.deadPlants)} />
                    <MetricPill label="Resiembras" value={formatNumber(valve.reseededPlants)} />
                    <MetricPill label="Disp. vs prog." value={formatPercent(valve.availabilityVsScheduledPct)} />
                    <MetricPill
                      label="Mortandad"
                      value={formatPercent(valve.mortalityPct)}
                      hint="Click para ver curva"
                      onClick={() => onOpenValveMortalityCurve(cycleKey, valve.valveId)}
                    />
                    <MetricPill label="Camas 30 m²" value={formatNumber(computeCamas30(valve.bedArea))} />
                    <MetricPill
                      label="Camas fisicas"
                      value={formatNumber(valve.bedCount)}
                      hint="Click para ver camas"
                      onClick={() => onOpenValveBedsOverlay(cycleKey, valve.valveId)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <Rows3 className="size-5 opacity-40" aria-hidden="true" />
            No hay valvulas registradas para este ciclo.
          </div>
        )
      ) : null}
    </div>
  );
}

function ValvesOverlay({
  cycleKey,
  data,
  loading,
  error,
  selectedValve,
  valveData,
  valveLoading,
  valveError,
  onOpenValve,
  onOpenValveBedsOverlay,
  onOpenValveMortalityCurve,
  onClose,
}: {
  cycleKey: string;
  data: ValveProfilesByCyclePayload | null;
  loading: boolean;
  error: string | null;
  selectedValve: { cycleKey: string; valveId: string } | null;
  valveData: ValveProfilePayload | null;
  valveLoading: boolean;
  valveError: string | null;
  onOpenValve: (cycleKey: string, valveId: string) => void;
  onOpenValveBedsOverlay: (cycleKey: string, valveId: string) => void;
  onOpenValveMortalityCurve: (cycleKey: string, valveId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-title-valves">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar valvulas del ciclo" />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1480px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1480px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Valvulas del ciclo
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {cycleKey}
              </Badge>
            </div>
            <div className="min-w-0">
              <h3 id="modal-title-valves" className="text-2xl font-semibold tracking-tight">Ventana flotante de valvulas</h3>
              <p className="break-words text-sm text-muted-foreground">
                Vista completa del ciclo con apertura de detalle y camas asociadas por valvula.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          <ValvesSection
            cycleKey={cycleKey}
            data={data}
            loading={loading}
            error={error}
            selectedValve={selectedValve}
            valveData={valveData}
            valveLoading={valveLoading}
            valveError={valveError}
            onOpenValve={onOpenValve}
            onOpenValveBedsOverlay={onOpenValveBedsOverlay}
            onOpenValveMortalityCurve={onOpenValveMortalityCurve}
          />
        </div>
      </div>
    </div>
  );
}

export function BlockProfileModal({
  row,
  data,
  loading,
  error,
  selectedCycleKey,
  bedData,
  bedLoading,
  bedError,
  selectedValveCycleKey,
  valvesData,
  valvesLoading,
  valvesError,
  selectedValve,
  valveData,
  valveLoading,
  valveError,
  selectedCurveCycleKey,
  curveData,
  curveLoading,
  curveError,
  selectedMortalityCurve,
  mortalityCurveData,
  mortalityCurveLoading,
  mortalityCurveError,
  onOpenBeds,
  onCloseBeds,
  onOpenValves,
  onCloseValves,
  onOpenValve,
  onOpenCurve,
  onCloseCurve,
  onOpenCycleMortalityCurve,
  onOpenValveMortalityCurve,
  onOpenBedMortalityCurve,
  onCloseMortalityCurve,
  onClose,
  directMode = false,
}: {
  row: BlockModalRow | null;
  data: CycleProfileBlockPayload | null;
  loading: boolean;
  error: string | null;
  selectedCycleKey: string | null;
  bedData: BedProfilePayload | null;
  bedLoading: boolean;
  bedError: string | null;
  selectedValveCycleKey: string | null;
  valvesData: ValveProfilesByCyclePayload | null;
  valvesLoading: boolean;
  valvesError: string | null;
  selectedValve: { cycleKey: string; valveId: string } | null;
  valveData: ValveProfilePayload | null;
  valveLoading: boolean;
  valveError: string | null;
  selectedCurveCycleKey: string | null;
  curveData: HarvestCurvePayload | null;
  curveLoading: boolean;
  curveError: string | null;
  selectedMortalityCurve: SelectedMortalityCurveState | null;
  mortalityCurveData: MortalityCurvePayload | null;
  mortalityCurveLoading: boolean;
  mortalityCurveError: string | null;
  onOpenBeds: (cycleKey: string) => void;
  onCloseBeds: () => void;
  onOpenValves: (cycleKey: string) => void;
  onCloseValves: () => void;
  onOpenValve: (cycleKey: string, valveId: string) => void;
  onOpenCurve: (cycleKey: string) => void;
  onCloseCurve: () => void;
  onOpenCycleMortalityCurve: (cycleKey: string) => void;
  onOpenValveMortalityCurve: (cycleKey: string, valveId: string) => void;
  onOpenBedMortalityCurve: (cycleKey: string, bedId: string) => void;
  onCloseMortalityCurve: () => void;
  onClose: () => void;
  /** When true the main block summary panel is hidden; navigation goes directly to the overlay panel */
  directMode?: boolean;
}) {
  const [selectedValveBeds, setSelectedValveBeds] = useState<{ cycleKey: string; valveId: string } | null>(null);

  useEffect(() => {
    if (!row) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (selectedValveBeds) {
        setSelectedValveBeds(null);
        return;
      }

      if (selectedCurveCycleKey) {
        onCloseCurve();
        return;
      }

      if (selectedMortalityCurve) {
        onCloseMortalityCurve();
        return;
      }

      if (selectedValveCycleKey) {
        onCloseValves();
        return;
      }

      if (selectedCycleKey) {
        onCloseBeds();
        return;
      }

      onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [
    onClose,
    onCloseBeds,
    onCloseCurve,
    onCloseMortalityCurve,
    onCloseValves,
    row,
    selectedCurveCycleKey,
    selectedCycleKey,
    selectedMortalityCurve,
    selectedValveCycleKey,
    selectedValveBeds,
  ]);

  if (!row) {
    return null;
  }

  const showingFilteredCycle = Boolean(data?.filteredCycleKey);

  function openValveBedsOverlay(cycleKey: string, valveId: string) {
    onOpenValve(cycleKey, valveId);
    setSelectedValveBeds({ cycleKey, valveId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/38 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="modal-title-block">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar ficha del bloque" />
      <div className={cn("starter-panel relative z-10 flex max-h-[88vh] w-[min(1320px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/96 shadow-2xl shadow-slate-950/20 sm:w-[min(1320px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-4 duration-200", directMode && "pointer-events-none opacity-0 invisible")}>
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Bloque {row.block}
              </Badge>
              {showingFilteredCycle ? (
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Ciclo de la fila
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Historial del bloque
                </Badge>
              )}
            </div>
            <div className="min-w-0">
              <h2 id="modal-title-block" className="text-2xl font-semibold tracking-tight">Ficha del bloque</h2>
              <p className="break-words text-sm text-muted-foreground">
                {row.area || "Sin area"} / {row.variety || "Sin variedad"} / {row.spType || "Sin SP"} / {showingFilteredCycle ? "ciclo filtrado" : "todos los ciclos del bloque"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {loading ? (
            <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Cargando ciclos del bloque.
            </div>
          ) : error ? (
            <div className="py-10 text-sm text-destructive">{error}</div>
          ) : data ? (
            <ModalContent
              data={data}
              filteredCycleKey={data.filteredCycleKey}
              selectedValveCycleKey={selectedValveCycleKey}
              selectedCurveCycleKey={selectedCurveCycleKey}
              selectedMortalityCurve={selectedMortalityCurve}
              onOpenBeds={onOpenBeds}
              onOpenValves={onOpenValves}
              onOpenCurve={onOpenCurve}
              onOpenCycleMortalityCurve={onOpenCycleMortalityCurve}
            />
          ) : null}
        </div>
      </div>

      {selectedCycleKey ? (
        <BedsOverlay
          cycleKey={selectedCycleKey}
          data={bedData}
          loading={bedLoading}
          error={bedError}
          selectedValve={selectedValve}
          valveData={valveData}
          valveLoading={valveLoading}
          valveError={valveError}
          onOpenValve={onOpenValve}
          onOpenValveBedsOverlay={openValveBedsOverlay}
          onOpenBedMortalityCurve={onOpenBedMortalityCurve}
          onOpenValveMortalityCurve={onOpenValveMortalityCurve}
          onClose={() => { onCloseBeds(); if (directMode) onClose(); }}
        />
      ) : null}

      {selectedCurveCycleKey ? (
        <HarvestCurveOverlay
          cycleKey={selectedCurveCycleKey}
          data={curveData}
          loading={curveLoading}
          error={curveError}
          onClose={onCloseCurve}
        />
      ) : null}

      {selectedMortalityCurve ? (
        <MortalityCurveOverlay
          selectedCurve={selectedMortalityCurve}
          data={mortalityCurveData}
          loading={mortalityCurveLoading}
          error={mortalityCurveError}
          onClose={onCloseMortalityCurve}
        />
      ) : null}

      {selectedValveCycleKey ? (
        <ValvesOverlay
          cycleKey={selectedValveCycleKey}
          data={valvesData}
          loading={valvesLoading}
          error={valvesError}
          selectedValve={selectedValve}
          valveData={valveData}
          valveLoading={valveLoading}
          valveError={valveError}
          onOpenValve={onOpenValve}
          onOpenValveBedsOverlay={openValveBedsOverlay}
          onOpenValveMortalityCurve={onOpenValveMortalityCurve}
          onClose={() => { onCloseValves(); if (directMode) onClose(); }}
        />
      ) : null}

      {selectedValveBeds
      && selectedValve
      && selectedValve.cycleKey === selectedValveBeds.cycleKey
      && selectedValve.valveId === selectedValveBeds.valveId ? (
        <ValveBedsOverlay
          data={valveData}
          loading={valveLoading}
          error={valveError}
          onOpenBedMortalityCurve={onOpenBedMortalityCurve}
          onClose={() => setSelectedValveBeds(null)}
        />
      ) : null}
    </div>
  );
}
