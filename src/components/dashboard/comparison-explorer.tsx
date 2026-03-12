"use client";

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Search, ShieldAlert, Swords, Trophy } from "lucide-react";

import { ComparisonRadarPanel } from "@/components/dashboard/comparison-radar-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  ComparisonCycleOption,
  ComparisonDashboardData,
  ComparisonPairPayload,
  ComparisonSearchFilters,
} from "@/lib/comparacion";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function buildOptionsQuery(filters: ComparisonSearchFilters) {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.area !== "all") {
    params.set("area", filters.area);
  }
  if (filters.block) {
    params.set("block", filters.block);
  }
  if (filters.variety !== "all") {
    params.set("variety", filters.variety);
  }
  params.set("limit", String(filters.limit));
  return params.toString();
}

function ComparisonSlotCard({
  label,
  cycle,
  tone,
}: {
  label: string;
  cycle: ComparisonCycleOption | null;
  tone: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "rounded-[26px] border px-5 py-5",
        tone === "left"
          ? "border-primary/25 bg-primary/8"
          : "border-accent/25 bg-accent/8",
      )}
    >
      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      {cycle ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full px-3 py-1">{cycle.cycleKey}</Badge>
            {cycle.block ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Bloque {cycle.block}
              </Badge>
            ) : null}
          </div>
          <div>
            <p className="text-xl font-semibold">{cycle.area || "Sin area"}</p>
            <p className="text-sm text-muted-foreground">
              {cycle.variety || "Sin variedad"} / {cycle.spType || "Sin SP"}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>SP: {formatDate(cycle.spDate)}</p>
            <p>Inicio cos: {formatDate(cycle.harvestStartDate)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Selecciona un ciclo para comparar.
        </p>
      )}
    </div>
  );
}

function MetricBattleRow({
  label,
  leftValue,
  rightValue,
  leftDisplay,
  rightDisplay,
  leftShare,
  rightShare,
  winner,
}: ComparisonPairPayload["metrics"][number]) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {leftValue === rightValue ? "Empate operativo" : winner === "left" ? "Ventaja izquierda" : "Ventaja derecha"}
          </p>
        </div>
        <Badge
          variant={winner === "tie" ? "outline" : "secondary"}
          className="rounded-full px-3 py-1"
        >
          {winner === "tie" ? "Empate" : winner === "left" ? "Gana A" : "Gana B"}
        </Badge>
      </div>

      <div className="mt-4 grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)_minmax(0,1fr)]">
        <div className="text-left lg:text-right">
          <p className={cn("text-2xl font-semibold", winner === "left" && "text-primary")}>
            {leftDisplay}
          </p>
        </div>

        <div className="relative h-12 overflow-hidden rounded-full border border-border/70 bg-card/95">
          <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/14" />
          <div
            className="absolute inset-y-2 right-1/2 rounded-l-full bg-primary/85 transition-all"
            style={{ width: `${Math.max((leftShare / 100) * 50, leftValue === rightValue ? 50 : 6)}%` }}
          />
          <div
            className="absolute inset-y-2 left-1/2 rounded-r-full bg-accent transition-all"
            style={{ width: `${Math.max((rightShare / 100) * 50, leftValue === rightValue ? 50 : 6)}%` }}
          />
        </div>

        <div className="text-left">
          <p className={cn("text-2xl font-semibold", winner === "right" && "text-accent-foreground")}>
            {rightDisplay}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ComparisonExplorer({ initialData }: { initialData: ComparisonDashboardData }) {
  const [filters, setFilters] = useState(initialData.filters);
  const deferredFilters = useDeferredValue(filters);
  const [options, setOptions] = useState(initialData.options);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [leftCycleKey, setLeftCycleKey] = useState(initialData.leftCycleKey);
  const [rightCycleKey, setRightCycleKey] = useState(initialData.rightCycleKey);
  const [comparison, setComparison] = useState<ComparisonPairPayload | null>(initialData.comparison);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const hasBootstrappedOptionsRef = useRef(false);
  const hasBootstrappedPairRef = useRef(false);

  useEffect(() => {
    const query = buildOptionsQuery(deferredFilters);

    if (!hasBootstrappedOptionsRef.current) {
      hasBootstrappedOptionsRef.current = true;
      return;
    }

    const controller = new AbortController();

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError(null);

      try {
        const response = await fetch(`/api/comparacion/options?${query}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar la busqueda de ciclos.");
        }

        const payload = (await response.json()) as ComparisonCycleOption[];
        startTransition(() => {
          setOptions(payload);
        });
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setOptionsError(
            fetchError instanceof Error
              ? fetchError.message
              : "No se pudo cargar la busqueda de ciclos.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setOptionsLoading(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadOptions();
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredFilters]);

  useEffect(() => {
    if (!leftCycleKey || !rightCycleKey) {
      setComparison(null);
      setComparisonError(null);
      return;
    }

    if (!hasBootstrappedPairRef.current) {
      hasBootstrappedPairRef.current = true;
      return;
    }

    const controller = new AbortController();
    const nextLeftCycleKey = leftCycleKey;
    const nextRightCycleKey = rightCycleKey;

    async function loadComparison() {
      setComparisonLoading(true);
      setComparisonError(null);

      try {
        const params = new URLSearchParams();
        params.set("left", nextLeftCycleKey);
        params.set("right", nextRightCycleKey);
        const response = await fetch(`/api/comparacion/pair?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message ?? "No se pudo cargar la comparacion.");
        }

        const payload = (await response.json()) as ComparisonPairPayload;
        startTransition(() => {
          setComparison(payload);
        });
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setComparisonError(
            fetchError instanceof Error ? fetchError.message : "No se pudo cargar la comparacion.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setComparisonLoading(false);
        }
      }
    }

    void loadComparison();
    return () => controller.abort();
  }, [leftCycleKey, rightCycleKey]);

  const leftCycle = options.find((option) => option.cycleKey === leftCycleKey)
    ?? comparison?.left
    ?? null;
  const rightCycle = options.find((option) => option.cycleKey === rightCycleKey)
    ?? comparison?.right
    ?? null;

  function updateFilter<Key extends keyof ComparisonSearchFilters>(
    key: Key,
    value: ComparisonSearchFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function chooseCycle(side: "left" | "right", cycleKey: string) {
    if (side === "left") {
      setLeftCycleKey(cycleKey);
      return;
    }

    setRightCycleKey(cycleKey);
  }

  return (
    <div className="space-y-4">
      <Card className="starter-panel overflow-hidden border-border/70 bg-card/82">
        <CardContent className="grid gap-4 p-6 xl:grid-cols-[1.2fr_auto_1.2fr]">
          <ComparisonSlotCard label="Ciclo A" cycle={leftCycle} tone="left" />
          <div className="flex items-center justify-center">
            <div className="rounded-full border border-border/70 bg-background/90 px-4 py-4 text-center">
              <Swords className="mx-auto size-6 text-primary" />
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-muted-foreground">VS</p>
            </div>
          </div>
          <ComparisonSlotCard label="Ciclo B" cycle={rightCycle} tone="right" />
        </CardContent>
      </Card>

      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Comparacion de ciclos reales
              </Badge>
              <CardTitle className="text-2xl">Seleccion de duelo</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {options.length} opciones visibles
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {comparison?.metrics.length ?? 0} metricas
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="comparison-q">Buscar</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="comparison-q"
                  value={filters.q}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  className="pl-10"
                  placeholder="Area, bloque, ciclo, variedad..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comparison-area">Area</Label>
              <select
                id="comparison-area"
                value={filters.area}
                onChange={(event) => updateFilter("area", event.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="all">Todas</option>
                {initialData.filterOptions.areas.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comparison-block">Bloque</Label>
              <Input
                id="comparison-block"
                value={filters.block}
                onChange={(event) => updateFilter("block", event.target.value)}
                placeholder="Ej. 329"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comparison-variety">Variedad</Label>
              <select
                id="comparison-variety"
                value={filters.variety}
                onChange={(event) => updateFilter("variety", event.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="all">Todas</option>
                {initialData.filterOptions.varieties.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {optionsLoading ? (
            <div className="text-sm text-muted-foreground">Buscando ciclos...</div>
          ) : null}
          {optionsError ? <div className="text-sm text-destructive">{optionsError}</div> : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => {
              const selectedLeft = leftCycleKey === option.cycleKey;
              const selectedRight = rightCycleKey === option.cycleKey;

              return (
                <div
                  key={option.cycleKey}
                  className={cn(
                    "rounded-[24px] border border-border/70 bg-background/72 p-4",
                    selectedLeft && "border-primary/30",
                    selectedRight && "border-accent/30",
                  )}
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full px-3 py-1">{option.cycleKey}</Badge>
                    {option.block ? (
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        Bloque {option.block}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <p className="text-lg font-semibold">{option.area || "Sin area"}</p>
                    <p className="text-sm text-muted-foreground">
                      {option.variety || "Sin variedad"} / {option.spType || "Sin SP"}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>SP: {formatDate(option.spDate)}</p>
                    <p>Inicio cos: {formatDate(option.harvestStartDate)}</p>
                    <p>Fin cos: {formatDate(option.harvestEndDate)}</p>
                    <p>Tallos: {option.totalStems.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant={selectedLeft ? "secondary" : "outline"}
                      className="rounded-xl"
                      onClick={() => chooseCycle("left", option.cycleKey)}
                    >
                      Competir A
                    </Button>
                    <Button
                      variant={selectedRight ? "secondary" : "outline"}
                      className="rounded-xl"
                      onClick={() => chooseCycle("right", option.cycleKey)}
                    >
                      Competir B
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {comparisonLoading ? (
        <div className="rounded-[24px] border border-border/70 bg-card/82 px-5 py-4 text-sm text-muted-foreground">
          Actualizando comparacion...
        </div>
      ) : null}

      {comparisonError ? (
        <div className="rounded-[24px] border border-destructive/30 bg-destructive/8 px-5 py-4 text-sm text-destructive">
          {comparisonError}
        </div>
      ) : null}

      {comparison?.left && comparison?.right ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="starter-panel border-border/70 bg-card/82">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Radar comparativo</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Magnitud relativa entre ambos ciclos para las metricas seleccionadas.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ComparisonRadarPanel
                  data={comparison.radar}
                  leftLabel={comparison.left.cycleKey}
                  rightLabel={comparison.right.cycleKey}
                />
              </CardContent>
            </Card>

            <Card className="starter-panel border-border/70 bg-card/82">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <ArrowLeftRight className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Lectura rapida</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Perfil del duelo con las cifras clave para decidir cual ciclo va mejor.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-primary/20 bg-primary/7 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Ciclo A</p>
                  <p className="mt-2 text-lg font-semibold">{comparison.left.cycleKey}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {comparison.left.area || "Sin area"} / Bloque {comparison.left.block || "-"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-accent/20 bg-accent/8 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Ciclo B</p>
                  <p className="mt-2 text-lg font-semibold">{comparison.right.cycleKey}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {comparison.right.area || "Sin area"} / Bloque {comparison.right.block || "-"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tallos</p>
                  <p className="mt-2 text-lg font-semibold">{comparison.left.totalStems.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ciclo A</p>
                </div>
                <div className="rounded-[24px] border border-border/70 bg-background/72 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Tallos</p>
                  <p className="mt-2 text-lg font-semibold">{comparison.right.totalStems.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Ciclo B</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="starter-panel border-border/70 bg-card/82">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/12 p-3 text-primary">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <CardTitle>Duelos por metrica</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    La barra central crece del lado que tiene mayor valor en esa metrica.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {comparison.metrics.map((metric) => {
                const { key, ...metricProps } = metric;
                return <MetricBattleRow key={key} {...metricProps} />;
              })}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="starter-panel border-border/70 bg-card/82">
          <CardContent className="px-6 py-8 text-sm text-muted-foreground">
            Elige dos ciclos para activar la comparacion.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
