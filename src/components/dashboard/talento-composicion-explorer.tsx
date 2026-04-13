"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import useSWR from "swr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MultiSelectField } from "@/components/ui/multi-select-field";
import { fetchJson } from "@/lib/fetch-json";
import type { TalentoActivosData, TalentoFilters, TalentoPersonRecord } from "@/lib/talento-humano";
import {
  CompositionTable,
  DateField,
  EmptyState,
  MetricPill,
  PersonListModal,
  buildCompositionRows,
  buildTalentoQueryString,
  type CompositionRow,
} from "@/components/dashboard/talento-shared";

const activosFetcher = (url: string) =>
  fetchJson<TalentoActivosData>(url, "No se pudo cargar composicion laboral.");

type SelectedGroup = { title: string; people: TalentoPersonRecord[] };
type CompositionDimension = {
  key: keyof TalentoPersonRecord;
  label: string;
};

const COMPOSITION_DIMENSIONS: CompositionDimension[] = [
  { key: "areaName", label: "Area" },
  { key: "areaGeneral", label: "Area general" },
  { key: "jobTitle", label: "Cargo" },
  { key: "jobClassificationCode", label: "Clasificacion" },
  { key: "associatedWorkerName", label: "Trabajadora social" },
  { key: "gender", label: "Genero" },
];

export function TalentoComposicionExplorer({ initialData }: { initialData: TalentoActivosData }) {
  const [filters, setFilters] = useState<TalentoFilters>(initialData.filters);
  const [dimensionKey, setDimensionKey] = useState<keyof TalentoPersonRecord>("areaName");
  const [selectedGroup, setSelectedGroup] = useState<SelectedGroup | null>(null);
  const deferredFilters = useDeferredValue(filters);

  const initialQuery = useMemo(() => buildTalentoQueryString(initialData.filters), [initialData.filters]);
  const queryString = useMemo(() => buildTalentoQueryString(deferredFilters), [deferredFilters]);

  const { data, isValidating, mutate } = useSWR(
    `/api/talento-humano/activos?${queryString}`,
    activosFetcher,
    {
      fallbackData: queryString === initialQuery ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
      onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar composicion laboral."),
    },
  );

  const current = data ?? initialData;
  const rows = current.rows;
  const options = current.options;

  const selectedDimension = COMPOSITION_DIMENSIONS.find((dimension) => dimension.key === dimensionKey) ?? COMPOSITION_DIMENSIONS[0];
  const tableRows = useMemo(
    () => buildCompositionRows(rows, selectedDimension.key, filters.snapshotDate),
    [rows, selectedDimension.key, filters.snapshotDate],
  );

  function setFilter<K extends keyof TalentoFilters>(key: K, value: TalentoFilters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function selectRow(title: string, row: CompositionRow) {
    setSelectedGroup({ title: `${title}: ${row.label}`, people: row.people });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <DateField label="Dia de corte" value={filters.snapshotDate} onChange={(value) => setFilter("snapshotDate", value)} />
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase text-muted-foreground">Tabla por</label>
            <select
              value={dimensionKey}
              onChange={(event) => setDimensionKey(event.target.value as keyof TalentoPersonRecord)}
              className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {COMPOSITION_DIMENSIONS.map((dimension) => (
                <option key={dimension.key} value={dimension.key}>
                  {dimension.label}
                </option>
              ))}
            </select>
          </div>
          <MultiSelectField id="talento-comp-area-general" label="Area general" value={filters.areaGeneral} options={options.areaGenerals} onChange={(value) => setFilter("areaGeneral", value)} />
          <MultiSelectField id="talento-comp-area" label="Area" value={filters.area} options={options.areas} onChange={(value) => setFilter("area", value)} />
          <MultiSelectField id="talento-comp-cargo" label="Cargo" value={filters.jobTitle} options={options.jobTitles} onChange={(value) => setFilter("jobTitle", value)} />
          <MultiSelectField id="talento-comp-clasificacion" label="Clasificacion" value={filters.jobClassification} options={options.jobClassifications} onChange={(value) => setFilter("jobClassification", value)} />
          <MultiSelectField id="talento-comp-ts" label="Trabajadora social" value={filters.associatedWorker} options={options.associatedWorkers} onChange={(value) => setFilter("associatedWorker", value)} />
          <MultiSelectField id="talento-comp-genero" label="Genero" value={filters.gender} options={options.genders} onChange={(value) => setFilter("gender", value)} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => setFilters(initialData.filters)}>
            <RefreshCcw className="size-3.5" />
            Restablecer
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs" onClick={() => mutate()} disabled={isValidating}>
            <RefreshCcw className={`size-3.5 ${isValidating ? "animate-spin" : ""}`} />
            {isValidating ? "Cargando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricPill label="Total personas activas" value={current.summary.totalPersonas.toLocaleString("en-US")} />
        <MetricPill label="Areas con personal" value={current.summary.totalAreas.toLocaleString("en-US")} />
        <MetricPill label="Cargos distintos" value={current.summary.totalCargos.toLocaleString("en-US")} />
      </div>

      {rows.length ? (
        <CompositionTable
          title={`Composicion por ${selectedDimension.label.toLowerCase()}`}
          dimensionLabel={selectedDimension.label}
          rows={tableRows}
          asOfDate={filters.snapshotDate}
          onSelect={(row) => selectRow(selectedDimension.label, row)}
        />
      ) : (
        <EmptyState label="No hay personal activo para el dia seleccionado." />
      )}

      {selectedGroup ? (
        <PersonListModal
          title={selectedGroup.title}
          people={selectedGroup.people}
          onClose={() => setSelectedGroup(null)}
        />
      ) : null}
    </div>
  );
}
