"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertCircle,
  Layers3,
  LoaderCircle,
  RefreshCcw,
  Scale,
  TableProperties,
  X,
} from "lucide-react";
import useSWR from "swr";

import { BalanzasGroupedTable } from "@/components/dashboard/balanzas-grouped-table";
import { BalanzasProcessViewer } from "@/components/dashboard/balanzas-process-viewer";
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
import { fetchJson } from "@/lib/fetch-json";
import { matchesMultiSelectValue } from "@/lib/multi-select";
import { cn } from "@/lib/utils";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import type {
  BalanzasDashboardData,
  BalanzasFilters,
  BalanzasNodeData,
  BalanzasNodeKey,
  BalanzasTableColumn,
  BalanzasTableRow,
} from "@/lib/poscosecha-balanzas";

type BalanzasExplorerProps = {
  initialData: BalanzasDashboardData;
  initialError?: string | null;
};

type NodeLocalFilters = {
  destination: string;
  grade: string;
  lot: string;
  hydrationDays: string;
  isoWeek: string;
  dayName: string;
  month: string;
  date: string;
};

const DEFAULT_NODE_LOCAL_FILTERS: NodeLocalFilters = {
  destination: "all",
  grade: "all",
  lot: "all",
  hydrationDays: "all",
  isoWeek: "all",
  dayName: "all",
  month: "all",
  date: "all",
};

const balanzasFetcher = (url: string) =>
  fetchJson<BalanzasDashboardData>(url, "No se pudo cargar Indicadores Balanzas.");

function buildQueryString(filters: BalanzasFilters) {
  const params = new URLSearchParams();

  params.set("metric", filters.metric);
  params.set("year", filters.year);
  params.set("month", filters.month);
  params.set("dayName", filters.dayName);
  params.set("destination", filters.destination);
  params.set("weekMode", "iso");
  params.set("weekValue", filters.weekValue);
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  return params.toString();
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatNumber(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function formatDisplayValue(
  node: BalanzasNodeData,
  column: BalanzasTableColumn,
  row: BalanzasTableRow,
) {
  const value = row.values[column.key];

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (column.kind === "ratio") {
    const numericValue = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(numericValue)) {
      return String(value);
    }

    return `${numericValue.toFixed(1)}%`;
  }

  if (column.kind === "number" && typeof value === "number") {
    const displayValue = formatNumber(value);
    const shouldAppendKg = node.metric === "peso"
      && (
        column.key === node.columnMap.source
        || column.key === node.columnMap.target
        || column.key === node.columnMap.gap
        || column.key.toLowerCase().includes("weight")
      );

    return shouldAppendKg ? `${displayValue} kg` : displayValue;
  }

  return String(value);
}

function getRatioTone(value: number | null) {
  if (value === null) {
    return "bg-background/60 text-muted-foreground";
  }

  if (value >= 95) {
    return "bg-emerald-500/16 text-emerald-950 dark:text-emerald-100";
  }

  if (value >= 80) {
    return "bg-amber-500/16 text-amber-950 dark:text-amber-100";
  }

  return "bg-rose-500/18 text-rose-950 dark:text-rose-100";
}

function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4",
        tone === "positive"
          ? "border-emerald-300/60 bg-emerald-500/10"
          : tone === "warning"
            ? "border-amber-300/60 bg-amber-500/10"
            : "border-border/70 bg-background/76",
      )}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function buildNodeHeadline(node: BalanzasNodeData) {
  return `${node.compareLabel} | Rama BPMN: ${node.bpmnBranch}`;
}

function buildVisibleSummary(node: BalanzasNodeData, rows: BalanzasTableRow[]) {
  const sourceKey = node.columnMap.source;
  const targetKey = node.columnMap.target;
  const dateKey = node.columnMap.date;

  let sourceTotal = 0;
  let targetTotal = 0;
  let latestDate: string | null = null;

  for (const row of rows) {
    if (sourceKey) {
      const value = row.values[sourceKey];
      sourceTotal += typeof value === "number" ? value : Number(value ?? 0);
    }

    if (targetKey) {
      const value = row.values[targetKey];
      targetTotal += typeof value === "number" ? value : Number(value ?? 0);
    }

    if (dateKey) {
      const dateValue = String(row.values[dateKey] ?? "");
      if (dateValue && (!latestDate || dateValue > latestDate)) {
        latestDate = dateValue;
      }
    }
  }

  const safeSourceTotal = Number.isFinite(sourceTotal) ? sourceTotal : 0;
  const safeTargetTotal = Number.isFinite(targetTotal) ? targetTotal : 0;
  const gapTotal = safeSourceTotal - safeTargetTotal;
  const ratioPct = safeSourceTotal > 0
    ? ((safeTargetTotal / safeSourceTotal) - 1) * 100
    : null;

  return {
    sourceTotal: safeSourceTotal,
    targetTotal: safeTargetTotal,
    gapTotal,
    ratioPct,
    latestDate: latestDate ?? node.latestDate,
  };
}

function NodeDetailModal({
  node,
  rows,
  search,
  filters,
  onSearchChange,
  onFilterChange,
  onClose,
}: {
  node: BalanzasNodeData;
  rows: BalanzasTableRow[];
  search: string;
  filters: NodeLocalFilters;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: keyof NodeLocalFilters, value: string) => void;
  onClose: () => void;
}) {
  const sourceKey = node.columnMap.source;
  const targetKey = node.columnMap.target;
  const ratioKey = node.columnMap.ratio;
  const gapKey = node.columnMap.gap;
  const hideDestination = node.key === "b2a" || node.key === "apertura_pelado_patas";
  const visibleColumns = node.tableColumns.filter((column) => !(hideDestination && column.key === node.columnMap.destination));
  const visibleSummary = buildVisibleSummary(node, rows);
  const tableFilters = [
    {
      key: "destination" as const,
      label: "Destino interno",
      options: node.localOptions.destinations,
    },
    {
      key: "grade" as const,
      label: "Grado",
      options: node.localOptions.grades,
    },
    {
      key: "lot" as const,
      label: "Lote",
      options: node.localOptions.lots,
    },
    {
      key: "hydrationDays" as const,
      label: "Dias de hidratacion",
      options: node.localOptions.hydrationDays,
    },
    {
      key: "isoWeek" as const,
      label: "Semana",
      options: node.localOptions.isoWeeks,
    },
    {
      key: "dayName" as const,
      label: "Dia",
      options: node.localOptions.dayNames,
    },
    {
      key: "month" as const,
      label: "Mes",
      options: node.localOptions.months,
    },
    {
      key: "date" as const,
      label: "Fecha",
      options: node.localOptions.dates,
    },
  ].filter((entry) => entry.options.length > 1 && !(hideDestination && entry.key === "destination"));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <button type="button" className="absolute inset-0 border-0 bg-transparent p-0" onClick={onClose} aria-label="Cerrar detalle del nodo" />
      <div className="starter-panel relative z-10 flex max-h-[92vh] w-[min(1560px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1560px,calc(100vw-2rem))]">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {node.label}
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {node.branchLabel}
              </Badge>
              {node.sourceView ? (
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {node.sourceView}
                </Badge>
              ) : null}
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-semibold tracking-tight">{buildNodeHeadline(node)}</h3>
              <p className="break-words text-sm text-muted-foreground">
                {node.description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6">
          {node.status !== "ready" ? (
            <div className="rounded-[24px] border border-amber-300/60 bg-amber-500/10 px-4 py-4 text-sm text-amber-950 dark:text-amber-100">
              {node.statusMessage ?? "No hay vista disponible para este nodo."}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryPill
                  label="Macro indicador"
                  value={visibleSummary.ratioPct === null ? "-" : `${visibleSummary.ratioPct.toFixed(1)}%`}
                  tone="positive"
                />
                <SummaryPill
                  label={node.sourceStage}
                  value={node.metric === "peso" ? `${formatNumber(visibleSummary.sourceTotal)} kg` : formatNumber(visibleSummary.sourceTotal)}
                />
                <SummaryPill
                  label={node.targetStage}
                  value={node.metric === "peso" ? `${formatNumber(visibleSummary.targetTotal)} kg` : formatNumber(visibleSummary.targetTotal)}
                />
                <SummaryPill
                  label="Brecha"
                  value={node.metric === "peso" ? `${formatNumber(visibleSummary.gapTotal)} kg` : formatNumber(visibleSummary.gapTotal)}
                />
                <SummaryPill label="Ultimo corte" value={formatDate(visibleSummary.latestDate)} />
              </div>

              <div className="grid gap-3 rounded-[24px] border border-border/70 bg-background/72 p-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="balanzas-detail-search">Buscar dentro del nodo</Label>
                  <Input
                    id="balanzas-detail-search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Buscar por fecha, lote, destino o valor visible..."
                    className="rounded-xl"
                  />
                </div>
                {tableFilters.map((entry) => (
                  <MultiSelectField
                    key={entry.key}
                    id={`balanzas-detail-${entry.key}`}
                    label={entry.label}
                    value={filters[entry.key]}
                    options={entry.options}
                    onChange={(value) => onFilterChange(entry.key, value)}
                  />
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <Layers3 className="size-5" aria-hidden="true" />
                  </div>
                    <div>
                      <p className="text-base font-semibold">Tabla agrupable del nodo</p>
                      <p className="text-sm text-muted-foreground">
                        Agrupa por semana, dia, fecha, lote o grado segun la vista disponible.
                      </p>
                    </div>
                  </div>
                <BalanzasGroupedTable key={node.key} node={node} rows={rows} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/12 p-3 text-primary">
                      <TableProperties className="size-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">Detalle crudo del tramo</p>
                      <p className="text-sm text-muted-foreground">
                        Filas visibles del nodo despues de filtros globales y filtros locales.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {rows.length} filas visibles
                  </Badge>
                </div>

                <div className="max-h-[42vh] overflow-auto rounded-[24px] border border-border/70">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur">
                      <tr>
                        {visibleColumns.map((column) => (
                          <th
                            key={column.key}
                            className="border-b border-r border-border/70 bg-card px-3 py-3 text-left font-semibold text-foreground last:border-r-0"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length ? rows.map((row, rowIndex) => (
                        <tr
                          key={row.id}
                          className={cn(
                            rowIndex % 2 === 0 ? "bg-background/84" : "bg-background/70",
                            row.ratioPct !== null && row.ratioPct < 80 && "bg-rose-500/8",
                          )}
                        >
                          {visibleColumns.map((column) => (
                            <td
                              key={`${row.id}-${column.key}`}
                              className={cn(
                                "border-b border-r border-border/50 px-3 py-2.5 align-middle text-foreground last:border-r-0",
                                column.key === ratioKey && getRatioTone(row.ratioPct),
                                column.key === sourceKey && "bg-sky-500/6",
                                column.key === targetKey && "bg-emerald-500/6",
                                column.key === gapKey && row.gapValue !== null && row.gapValue < 0 && "bg-rose-500/8",
                              )}
                            >
                              {formatDisplayValue(node, column, row)}
                            </td>
                          ))}
                        </tr>
                      )) : (
                        <tr>
                          <td
                            colSpan={visibleColumns.length}
                            className="px-4 py-10 text-center text-sm text-muted-foreground"
                          >
                            No hay filas visibles para este nodo con el filtro local aplicado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BalanzasExplorer({
  initialData,
  initialError,
}: BalanzasExplorerProps) {
  const [filters, setFilters] = useState<BalanzasFilters>(initialData.filters);
  const [selectedNodeKey, setSelectedNodeKey] = useState<BalanzasNodeKey | null>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailFilters, setDetailFilters] = useState<NodeLocalFilters>(DEFAULT_NODE_LOCAL_FILTERS);
  const deferredFilters = useDeferredValue(filters);
  const initialFilterKey = useMemo(
    () => buildQueryString(initialData.filters),
    [initialData.filters],
  );
  const filterKey = useMemo(
    () => buildQueryString(deferredFilters),
    [deferredFilters],
  );
  const {
    data: dashboardData,
    error: dashboardError,
    isValidating,
    mutate,
  } = useSWR(
    `/api/poscosecha/balanzas?${filterKey}`,
    balanzasFetcher,
    {
      fallbackData: filterKey === initialFilterKey ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );
  const data = dashboardData ?? initialData;
  const activeMessage = dashboardError?.message ?? data.summary.statusMessage ?? initialError ?? null;
  const weekOptions = data.options.isoWeeks;
  const effectiveWeekValue = data.filters.weekValue;
  const selectedNode = selectedNodeKey
    ? data.nodes.find((node) => node.key === selectedNodeKey) ?? null
    : null;

  const filteredDetailRows = useMemo(() => {
    if (!selectedNode) {
      return [] as BalanzasTableRow[];
    }

    const search = detailSearch.trim().toLowerCase();

    return selectedNode.rows.filter((row) => {
      const filterChecks: Array<[string, string | null]> = [
        [detailFilters.destination, selectedNode.columnMap.destination],
        [detailFilters.grade, selectedNode.columnMap.grade],
        [detailFilters.lot, selectedNode.columnMap.lot],
        [detailFilters.hydrationDays, selectedNode.columnMap.hydrationDays],
        [detailFilters.isoWeek, selectedNode.columnMap.isoWeek],
        [detailFilters.dayName, selectedNode.columnMap.dayName],
        [detailFilters.month, selectedNode.columnMap.month],
        [detailFilters.date, selectedNode.columnMap.date],
      ];

      for (const [filterValue, columnKey] of filterChecks) {
        if (!columnKey) {
          continue;
        }

        if (!matchesMultiSelectValue(filterValue, String(row.values[columnKey] ?? ""))) {
          return false;
        }
      }

      if (!search) {
        return true;
      }

      return Object.values(row.values).some((value) => String(value ?? "").toLowerCase().includes(search));
    });
  }, [detailFilters, detailSearch, selectedNode]);

  function updateFilter<Key extends keyof BalanzasFilters>(
    key: Key,
    value: BalanzasFilters[Key],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDetailFilter<Key extends keyof NodeLocalFilters>(key: Key, value: NodeLocalFilters[Key]) {
    setDetailFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters(initialData.filters);
  }

  function openNode(nodeKey: BalanzasNodeKey, destination: string | null = null) {
    setDetailSearch("");
    setDetailFilters({
      ...DEFAULT_NODE_LOCAL_FILTERS,
      destination: nodeKey === "b2a" && destination ? destination : "all",
    });
    setSelectedNodeKey(nodeKey);
  }

  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Indicadores / Produccion / Poscosecha
              </Badge>
              <CardTitle className="text-2xl">Indicadores Balanzas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rama instrumentada: Apertura {"->"} Apertura pelado patas {"->"} BAL2 {"->"} BAL2A. Los filtros globales solo trabajan con fecha y cada nodo abre su detalle flotante.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["peso", "tallos"] as const).map((metric) => (
                <Button
                  key={metric}
                  variant={filters.metric === metric ? "secondary" : "outline"}
                  className="rounded-full"
                  onClick={() => updateFilter("metric", metric)}
                >
                  {metric === "peso" ? "Peso" : "Tallos"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-[26px] border border-border/70 bg-background/72 p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Filtros temporales globales</p>
                <p className="text-sm text-muted-foreground">
                  Todos los cortes globales salen de la fecha de trabajo. El tablero toma por defecto la ultima semana ISO disponible.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {data.summary.periodLabel}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
                <MultiSelectField
                  id="balanzas-year"
                  label={"A\u00f1os"}
                  value={filters.year}
                  options={data.options.years}
                  onChange={(value) => updateFilter("year", value)}
                />
                <MultiSelectField
                  id="balanzas-month"
                  label="Meses"
                  value={filters.month}
                  options={data.options.months}
                  onChange={(value) => updateFilter("month", value)}
                />
                <MultiSelectField
                  id="balanzas-day-name"
                  label="Dia"
                  value={filters.dayName}
                  options={data.options.dayNames}
                  onChange={(value) => updateFilter("dayName", value)}
                />
                <MultiSelectField
                  id="balanzas-week"
                  label="Semana"
                  value={effectiveWeekValue}
                  options={weekOptions}
                  onChange={(value) => updateFilter("weekValue", value)}
                  emptyLabel="Ultima disponible"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,1fr))_200px]">
              <div className="space-y-2">
                <Label htmlFor="balanzas-date-from">Fecha desde</Label>
                <Input
                  id="balanzas-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balanzas-date-to">Fecha hasta</Label>
                <Input
                  id="balanzas-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                  <RefreshCcw className="size-4" aria-hidden="true" />
                  Restablecer
                </Button>
              </div>
              </div>
            </div>
          </div>

          {isValidating ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Actualizando indicadores de balanzas.
            </div>
          ) : null}

          {activeMessage ? (
            <div className="rounded-[24px] border border-amber-300/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium">Estado del origen</p>
                  <p className="mt-1 text-sm opacity-90">{activeMessage}</p>
                  {dashboardError ? <button type="button" className="mt-2 text-sm underline underline-offset-2 opacity-80 hover:opacity-100" onClick={() => mutate()}>Reintentar</button> : null}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/12 p-3 text-primary">
              <Scale className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">Flujo de postcosecha</CardTitle>
              <p className="text-sm text-muted-foreground">
                Rama instrumentada: Apertura {"->"} Apertura pelado patas {"->"} BAL2 {"->"} BAL2A. En el ultimo tramo el flujo se abre en Arcoiris, Tinturado y Blanco.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BalanzasProcessViewer
            assetPath={data.processAssetPath}
            metricLabel={data.metricLabel}
            nodes={data.nodes}
            selectedNodeKey={selectedNodeKey}
            onNodeSelect={openNode}
          />
        </CardContent>
      </Card>

      {selectedNode ? (
        <NodeDetailModal
          node={selectedNode}
          rows={filteredDetailRows}
          search={detailSearch}
          filters={detailFilters}
          onSearchChange={setDetailSearch}
          onFilterChange={updateDetailFilter}
          onClose={() => setSelectedNodeKey(null)}
        />
      ) : null}
    </div>
  );
}
