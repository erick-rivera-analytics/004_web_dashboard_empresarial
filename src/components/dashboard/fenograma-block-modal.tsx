"use client";

import { useEffect, useState } from "react";
import { LineChart, LoaderCircle, Rows3, X } from "lucide-react";

import { HarvestCurvePanel } from "@/components/dashboard/harvest-curve-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  HarvestCurvePayload,
  ValveProfilePayload,
  ValveProfilesByCyclePayload,
} from "@/lib/fenograma";

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
        "rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-left",
        onClick && "transition-colors hover:border-primary/30 hover:bg-primary/6",
      )}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
}: {
  beds: BedProfileCard[];
  selectedValveId?: string | null;
  onOpenValve?: (valveId: string) => void;
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
              "Mort. actual",
              "Mort. acum.",
              "Pambiles",
              "Superficie",
              "Variedad",
              "SP",
              "Vigencia",
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
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatPercent(bed.mortalityPeriodPct)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatPercent(bed.mortalityCumulativePct)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.pambilesCount)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{formatNumber(bed.bedArea)}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{bed.variety || "-"}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">{bed.spType || "-"}</td>
                <td className="border-b border-border/60 px-3 py-2.5">
                  {formatDate(bed.validFrom)} / {formatDate(bed.validTo)}
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
  onClose: () => void;
}) {
  const selectedValveId = selectedValve?.cycleKey === cycleKey ? selectedValve.valveId : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/46 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="starter-panel relative z-10 flex max-h-[90vh] w-[min(1480px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/22 sm:w-[min(1480px,calc(100vw-2rem))]">
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
              <h3 className="text-2xl font-semibold tracking-tight">Detalle de camas</h3>
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
              <LoaderCircle className="size-4 animate-spin" />
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
                          <Rows3 className="size-4" />
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
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="py-8 text-sm text-muted-foreground">
                No hay detalle de camas para este ciclo.
              </div>
            )
          ) : (
            <div className="py-8 text-sm text-muted-foreground">
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
  onClose,
}: {
  data: ValveProfilePayload | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1420px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1420px,calc(100vw-2rem))]">
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
              <h3 className="text-2xl font-semibold tracking-tight">Tabla flotante de camas</h3>
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
              <LoaderCircle className="size-4 animate-spin" />
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
                  <BedsTable beds={data.beds} selectedValveId={data.valve.valveId} />
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1420px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1420px,calc(100vw-2rem))]">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Curva de la cosecha
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {cycleKey}
              </Badge>
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-semibold tracking-tight">Curva acumulada por dia</h3>
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
              <LoaderCircle className="size-4 animate-spin" />
              Cargando curva de cosecha.
            </div>
          ) : error ? (
            <div className="py-8 text-sm text-destructive">{error}</div>
          ) : data && data.cycleKey === cycleKey ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricPill label="Tallos acumulados" value={formatNumber(data.summary.totalStems)} />
                <MetricPill label="Tallos reales" value={formatNumber(data.summary.observedStems)} />
                <MetricPill label="Tallos proyectados" value={formatNumber(data.summary.projectedStems)} />
                <MetricPill
                  label="Inicio proyeccion"
                  value={data.projectionStartDay ? `Dia ${data.projectionStartDay}` : "Sin proyeccion"}
                  hint={data.projectionStartDate ? formatDate(data.projectionStartDate) : undefined}
                />
              </div>

              {data.points.length ? (
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                  <HarvestCurvePanel
                    data={data.points}
                    projectionStartDay={data.projectionStartDay}
                  />
                </div>
              ) : (
                <div className="rounded-[22px] border border-border/70 bg-background/72 p-6 text-sm text-muted-foreground">
                  No hay datos diarios para graficar este ciclo.
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-sm text-muted-foreground">
              No hay curva disponible para esta seleccion.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ValveDetailPanel({
  data,
  loading,
  error,
  onOpenBedsOverlay,
}: {
  data: ValveProfilePayload | null;
  loading: boolean;
  error: string | null;
  onOpenBedsOverlay?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Cargando detalle de la valvula.
      </div>
    );
  }

  if (error) {
    return <div className="py-4 text-sm text-destructive">{error}</div>;
  }

  if (!data || !data.valve) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        No hay detalle de valvula disponible para esta seleccion.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricPill label="Valvula" value={getValveDisplayName(data.valve.valveName, data.valve.valveId)} />
        <MetricPill label="Bloque" value={data.valve.blockId || data.valve.parentBlock || "-"} />
        <MetricPill label="Camas" value={formatNumber(data.valve.bedCount)} />
        <MetricPill label="Pambiles" value={formatNumber(data.valve.pambilesCount)} />
        <MetricPill label="Plantas programadas" value={formatNumber(data.valve.programmedPlants)} />
        <MetricPill label="Inicio de ciclo" value={formatNumber(data.valve.cycleStartPlants)} />
        <MetricPill label="Plantas vigentes" value={formatNumber(data.valve.currentPlants)} />
        <MetricPill label="Bajas acumuladas" value={formatNumber(data.valve.deadPlants)} />
        <MetricPill label="Resiembras" value={formatNumber(data.valve.reseededPlants)} />
        <MetricPill label="Mortandad actual" value={formatPercent(data.valve.mortalityPeriodPct)} />
        <MetricPill label="Mortandad acumulada" value={formatPercent(data.valve.mortalityCumulativePct)} />
        <MetricPill label="Superficie" value={formatNumber(data.summary.totalBedArea)} />
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
          <div className="flex flex-wrap items-center gap-2">
            <DetailBadges
              items={[
                `${data.summary.totalBeds} camas`,
                `${formatNumber(data.summary.totalProgrammedPlants)} programadas`,
                `${formatNumber(data.summary.totalCurrentPlants)} vigentes`,
              ]}
            />
            {data.beds.length && onOpenBedsOverlay ? (
              <Button variant="outline" className="rounded-xl" onClick={onOpenBedsOverlay}>
                <Rows3 className="size-4" />
                Abrir tabla flotante de camas
              </Button>
            ) : null}
          </div>
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
          <LoaderCircle className="size-4 animate-spin" />
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
                      {valve.isCurrent ? (
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          Actual
                        </Badge>
                      ) : null}
                      {valve.isValid ? (
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Valido
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MetricPill label="Pambiles" value={formatNumber(valve.pambilesCount)} />
                    <MetricPill label="Camas" value={formatNumber(valve.bedCount)} />
                    <MetricPill label="Plantas programadas" value={formatNumber(valve.programmedPlants)} />
                    <MetricPill label="Plantas vigentes" value={formatNumber(valve.currentPlants)} />
                    <MetricPill label="Mortandad acum." value={formatPercent(valve.mortalityCumulativePct)} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={isSelected ? "secondary" : "outline"}
                      className="rounded-xl"
                      onClick={() => onOpenValve(cycleKey, valve.valveId)}
                    >
                      {isSelected ? "Ocultar detalle de valvula" : "Abrir detalle de valvula"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => onOpenValveBedsOverlay(cycleKey, valve.valveId)}
                    >
                      <Rows3 className="size-4" />
                      Abrir tabla flotante de camas
                    </Button>
                  </div>

                  {isSelected ? (
                    <div className="mt-4 rounded-[20px] border border-border/70 bg-card/92 p-4">
                      <ValveDetailPanel
                        data={valveData}
                        loading={valveLoading}
                        error={valveError}
                        onOpenBedsOverlay={() => onOpenValveBedsOverlay(cycleKey, valve.valveId)}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-sm text-muted-foreground">
            No hay valvulas registradas para este ciclo.
          </div>
        )
      ) : null}
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
  onOpenBeds,
  onCloseBeds,
  onOpenValves,
  onOpenValve,
  onOpenCurve,
  onCloseCurve,
  onClose,
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
  onOpenBeds: (cycleKey: string) => void;
  onCloseBeds: () => void;
  onOpenValves: (cycleKey: string) => void;
  onOpenValve: (cycleKey: string, valveId: string) => void;
  onOpenCurve: (cycleKey: string) => void;
  onCloseCurve: () => void;
  onClose: () => void;
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
    row,
    selectedCurveCycleKey,
    selectedCycleKey,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/38 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="starter-panel relative z-10 flex max-h-[88vh] w-[min(1320px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/96 shadow-2xl shadow-slate-950/20 sm:w-[min(1320px,calc(100vw-2rem))]">
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
              <h2 className="text-2xl font-semibold tracking-tight">Ficha del bloque</h2>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricPill label="Fecha SP" value={formatDate(row.spDate)} />
            <MetricPill label="Fecha Ini Cos" value={formatDate(row.harvestStartDate)} />
            <MetricPill label="Fecha Fin Cos" value={formatDate(row.harvestEndDate)} />
            <MetricPill label="Tallos visibles" value={formatNumber(row.totalStems)} />
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Cargando ciclos del bloque.
            </div>
          ) : error ? (
            <div className="py-10 text-sm text-destructive">{error}</div>
          ) : data ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricPill label="Ciclos visibles" value={`${data.summary.totalCycles}`} />
                <MetricPill label="Ciclos vigentes" value={`${data.summary.currentCycles}`} />
                <MetricPill label="Ciclos validos" value={`${data.summary.validCycles}`} />
                <MetricPill label="Variedades" value={data.summary.varieties.join(", ") || "-"} />
              </div>

              {data.cycles.length ? (
                <div className="grid gap-4">
                  {data.cycles.map((cycle) => {
                    const showValves = selectedValveCycleKey === cycle.cycleKey;
                    const showCurveActive = selectedCurveCycleKey === cycle.cycleKey;

                    return (
                      <Card
                        key={cycle.recordId}
                        className="rounded-[24px] border-border/70 bg-background/80"
                      >
                        <CardHeader className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full px-3 py-1">{cycle.cycleKey}</Badge>
                            {cycle.isCurrent ? (
                              <Badge variant="secondary" className="rounded-full px-3 py-1">
                                Actual
                              </Badge>
                            ) : null}
                            {cycle.isValid ? (
                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                Valido
                              </Badge>
                            ) : null}
                          </div>
                          <CardTitle className="text-base">
                            Bloque {cycle.blockId || cycle.parentBlock}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <MetricPill label="Variedad" value={cycle.variety || "-"} />
                          <MetricPill label="Tipo SP" value={cycle.spType || "-"} />
                          <MetricPill label="Estado" value={cycle.status || "-"} />
                          <MetricPill label="Invernadero" value={cycle.greenhouse ? "Si" : "No"} />
                          <MetricPill label="Luz" value={cycle.lightType || "-"} />
                          <MetricPill
                            label="Camas"
                            value={formatNumber(cycle.bedCount)}
                            hint="Abrir tabla flotante de camas"
                            onClick={() => onOpenBeds(cycle.cycleKey)}
                          />
                          <MetricPill
                            label="Valvulas"
                            value={formatNumber(cycle.valveCount)}
                            hint="Abrir detalle de valvulas"
                            onClick={() => onOpenValves(cycle.cycleKey)}
                          />
                          <MetricPill label="Pambiles" value={formatNumber(cycle.pambilesCount)} />
                          <MetricPill label="Superficie" value={formatNumber(cycle.bedArea)} />
                          <MetricPill label="Plantas programadas" value={formatNumber(cycle.programmedPlants)} />
                          <MetricPill label="Inicio de ciclo" value={formatNumber(cycle.cycleStartPlants)} />
                          <MetricPill label="Plantas vigentes" value={formatNumber(cycle.currentPlants)} />
                          <MetricPill label="Bajas acumuladas" value={formatNumber(cycle.deadPlants)} />
                          <MetricPill label="Resiembras" value={formatNumber(cycle.reseededPlants)} />
                          <MetricPill label="Mortandad actual" value={formatPercent(cycle.mortalityPeriodPct)} />
                          <MetricPill label="Mortandad acumulada" value={formatPercent(cycle.mortalityCumulativePct)} />
                          <MetricPill label="Desde" value={formatDate(cycle.validFrom)} />
                          <MetricPill label="Hasta" value={formatDate(cycle.validTo)} />
                        </CardContent>

                        <CardContent className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                          <Button
                            variant={showCurveActive ? "secondary" : "outline"}
                            className="rounded-xl"
                            onClick={() => onOpenCurve(cycle.cycleKey)}
                          >
                            <LineChart className="size-4" />
                            Curva de la cosecha por cycle
                          </Button>
                        </CardContent>

                        {showValves ? (
                          <CardContent className="border-t border-border/60 pt-0">
                            <ValvesSection
                              cycleKey={cycle.cycleKey}
                              data={valvesData}
                              loading={valvesLoading}
                              error={valvesError}
                              selectedValve={selectedValve}
                              valveData={valveData}
                              valveLoading={valveLoading}
                              valveError={valveError}
                              onOpenValve={onOpenValve}
                              onOpenValveBedsOverlay={openValveBedsOverlay}
                            />
                          </CardContent>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[22px] border border-border/70 bg-background/72 p-6 text-sm text-muted-foreground">
                  No hay ciclos disponibles para este bloque con el criterio actual.
                </div>
              )}
            </div>
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
          onClose={onCloseBeds}
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

      {selectedValveBeds
      && selectedValve
      && selectedValve.cycleKey === selectedValveBeds.cycleKey
      && selectedValve.valveId === selectedValveBeds.valveId ? (
        <ValveBedsOverlay
          data={valveData}
          loading={valveLoading}
          error={valveError}
          onClose={() => setSelectedValveBeds(null)}
        />
      ) : null}
    </div>
  );
}
