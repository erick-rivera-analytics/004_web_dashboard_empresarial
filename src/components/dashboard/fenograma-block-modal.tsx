"use client";

import { useEffect } from "react";
import { LoaderCircle, X } from "lucide-react";

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
  ValveProfilePayload,
  ValveProfilesByCyclePayload,
} from "@/lib/fenograma";

function formatDate(value: string | null) {
  if (!value) {
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
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border/70">
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
          {beds.map((bed, index) => {
            const isActiveValve = Boolean(selectedValveId && selectedValveId === bed.valveId);

            return (
              <tr
                key={bed.recordId}
                className={cn(
                  index % 2 === 0 ? "bg-background/82" : "bg-background/68",
                  isActiveValve && "bg-primary/6",
                )}
              >
                <td className="border-b border-r border-border/60 px-3 py-2.5 font-medium">{bed.bedId}</td>
                <td className="border-b border-r border-border/60 px-3 py-2.5">
                  {bed.valveId && onOpenValve ? (
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                      onClick={() => onOpenValve(bed.valveId)}
                    >
                      {bed.valveId}
                    </button>
                  ) : (
                    bed.valveId || "-"
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

function ValveDetailPanel({
  data,
  loading,
  error,
}: {
  data: ValveProfilePayload | null;
  loading: boolean;
  error: string | null;
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
        <MetricPill label="Valvula" value={data.valve.valveName || data.valve.valveId} />
        <MetricPill label="Bloque" value={data.valve.blockId || data.valve.parentBlock || "-"} />
        <MetricPill label="Camas" value={formatNumber(data.valve.bedCount)} />
        <MetricPill label="Estado" value={data.valve.status || "-"} />
        <MetricPill label="Plantas programadas" value={formatNumber(data.valve.programmedPlants)} />
        <MetricPill label="Inicio de ciclo" value={formatNumber(data.valve.cycleStartPlants)} />
        <MetricPill label="Plantas vigentes" value={formatNumber(data.valve.currentPlants)} />
        <MetricPill label="Bajas acumuladas" value={formatNumber(data.valve.deadPlants)} />
        <MetricPill label="Resiembras" value={formatNumber(data.valve.reseededPlants)} />
        <MetricPill label="Mortandad actual" value={formatPercent(data.valve.mortalityPeriodPct)} />
        <MetricPill label="Mortandad acumulada" value={formatPercent(data.valve.mortalityCumulativePct)} />
        <MetricPill label="Vigencia" value={`${formatDate(data.valve.validFrom)} / ${formatDate(data.valve.validTo)}`} />
      </div>

      <div className="rounded-[20px] border border-border/70 bg-background/72 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Camas de la valvula
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{data.valve.valveId}</p>
          </div>
          <DetailBadges
            items={[
              `${data.summary.totalBeds} camas`,
              `${formatNumber(data.summary.totalProgrammedPlants)} programadas`,
              `${formatNumber(data.summary.totalCurrentPlants)} vigentes`,
            ]}
          />
        </div>

        {data.beds.length ? (
          <BedsTable beds={data.beds} />
        ) : (
          <div className="py-4 text-sm text-muted-foreground">
            No hay camas relacionadas con esta valvula.
          </div>
        )}
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
                      {valve.valveName || valve.valveId}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
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
                    <MetricPill label="Estado" value={valve.status || "-"} />
                    <MetricPill label="Camas" value={formatNumber(valve.bedCount)} />
                    <MetricPill label="Plantas programadas" value={formatNumber(valve.programmedPlants)} />
                    <MetricPill label="Plantas vigentes" value={formatNumber(valve.currentPlants)} />
                    <MetricPill label="Mortandad acum." value={formatPercent(valve.mortalityCumulativePct)} />
                    <MetricPill label="Vigencia" value={`${formatDate(valve.validFrom)} / ${formatDate(valve.validTo)}`} />
                  </div>

                  <div className="mt-4">
                    <Button
                      variant={isSelected ? "secondary" : "outline"}
                      className="rounded-xl"
                      onClick={() => onOpenValve(cycleKey, valve.valveId)}
                    >
                      {isSelected ? "Ocultar detalle" : "Abrir detalle"}
                    </Button>
                  </div>

                  {isSelected ? (
                    <div className="mt-4 rounded-[20px] border border-border/70 bg-card/92 p-4">
                      <ValveDetailPanel
                        data={valveData}
                        loading={valveLoading}
                        error={valveError}
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
  onOpenBeds,
  onOpenValves,
  onOpenValve,
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
  onOpenBeds: (cycleKey: string) => void;
  onOpenValves: (cycleKey: string) => void;
  onOpenValve: (cycleKey: string, valveId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!row) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, row]);

  if (!row) {
    return null;
  }

  const showingFilteredCycle = Boolean(data?.filteredCycleKey);

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
                    const showBeds = selectedCycleKey === cycle.cycleKey;
                    const showValves = selectedValveCycleKey === cycle.cycleKey;
                    const showValveUnderBeds =
                      selectedValve?.cycleKey === cycle.cycleKey
                      && selectedValveCycleKey !== cycle.cycleKey;

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
                          <MetricPill label="Luz" value={cycle.lightType || "-"} />
                          <MetricPill
                            label="Camas"
                            value={formatNumber(cycle.bedCount)}
                            hint="Abrir detalle de camas"
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
                            />
                          </CardContent>
                        ) : null}

                        {showBeds ? (
                          <CardContent className="border-t border-border/60 pt-0">
                            <div className="rounded-[22px] border border-border/70 bg-card/88 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                    Detalle de camas
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">{cycle.cycleKey}</p>
                                </div>
                                {bedData && bedData.cycleKey === cycle.cycleKey ? (
                                  <DetailBadges
                                    items={[
                                      `${bedData.summary.totalBeds} camas`,
                                      `${formatNumber(bedData.summary.totalProgrammedPlants)} programadas`,
                                      `${formatNumber(bedData.summary.totalCurrentPlants)} vigentes`,
                                    ]}
                                  />
                                ) : null}
                              </div>

                              {bedLoading ? (
                                <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                                  <LoaderCircle className="size-4 animate-spin" />
                                  Cargando detalle de camas.
                                </div>
                              ) : bedError ? (
                                <div className="py-6 text-sm text-destructive">{bedError}</div>
                              ) : bedData && bedData.cycleKey === cycle.cycleKey ? (
                                bedData.beds.length ? (
                                  <>
                                    <BedsTable
                                      beds={bedData.beds}
                                      selectedValveId={selectedValve?.cycleKey === cycle.cycleKey ? selectedValve.valveId : null}
                                      onOpenValve={(valveId) => onOpenValve(cycle.cycleKey, valveId)}
                                    />
                                    {showValveUnderBeds ? (
                                      <div className="mt-4 rounded-[20px] border border-border/70 bg-card/92 p-4">
                                        <div className="mb-4">
                                          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                                            Detalle de valvula
                                          </p>
                                          <p className="mt-1 text-sm text-muted-foreground">{selectedValve?.valveId}</p>
                                        </div>
                                        <ValveDetailPanel
                                          data={valveData}
                                          loading={valveLoading}
                                          error={valveError}
                                        />
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <div className="py-6 text-sm text-muted-foreground">
                                    No hay detalle de camas para este ciclo.
                                  </div>
                                )
                              ) : null}
                            </div>
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
    </div>
  );
}
