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
  DateField,
  DistributionChart,
  DonutChart,
  EmptyState,
  MetricPill,
  PersonListModal,
  buildTalentoQueryString,
  groupTalentoRows,
  type TalentoGroup,
} from "@/components/dashboard/talento-shared";

const activosFetcher = (url: string) =>
  fetchJson<TalentoActivosData>(url, "No se pudo cargar demografia personal.");

type SelectedGroup = TalentoGroup<TalentoPersonRecord> & { title: string };

export function TalentoDemografiaExplorer({ initialData }: { initialData: TalentoActivosData }) {
  const [filters, setFilters] = useState<TalentoFilters>(initialData.filters);
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
      onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo cargar demografia personal."),
    },
  );

  const current = data ?? initialData;
  const rows = current.rows;
  const options = current.options;

  const groups = useMemo(
    () => ({
      gender: groupTalentoRows(rows, "gender"),
      maritalStatus: groupTalentoRows(rows, "maritalStatus"),
      birthPlace: groupTalentoRows(rows, "birthPlace"),
      employeeType: groupTalentoRows(rows, "employeeType"),
      contractType: groupTalentoRows(rows, "contractType"),
      city: groupTalentoRows(rows, "city"),
      parish: groupTalentoRows(rows, "parish"),
      nationality: groupTalentoRows(rows, "nationality"),
      educationTitle: groupTalentoRows(rows, "educationTitle"),
    }),
    [rows],
  );

  const distinctCities = groups.city.filter((group) => group.label !== "Sin dato").length;
  const women = rows.filter((row) => row.gender?.trim().toUpperCase().startsWith("F")).length;
  const womenPct = rows.length ? (women / rows.length).toLocaleString("en-US", { style: "percent", maximumFractionDigits: 1 }) : "-";

  function setFilter<K extends keyof TalentoFilters>(key: K, value: TalentoFilters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function selectGroup(title: string, group: TalentoGroup<TalentoPersonRecord>) {
    setSelectedGroup({ ...group, title: `${title}: ${group.label}` });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <DateField label="Dia de corte" value={filters.snapshotDate} onChange={(value) => setFilter("snapshotDate", value)} />
          <MultiSelectField id="talento-demo-area-general" label="Area general" value={filters.areaGeneral} options={options.areaGenerals} onChange={(value) => setFilter("areaGeneral", value)} />
          <MultiSelectField id="talento-demo-genero" label="Genero" value={filters.gender} options={options.genders} onChange={(value) => setFilter("gender", value)} />
          <MultiSelectField id="talento-demo-estado-civil" label="Estado civil" value={filters.maritalStatus} options={options.maritalStatuses} onChange={(value) => setFilter("maritalStatus", value)} />
          <MultiSelectField id="talento-demo-ciudad" label="Ciudad" value={filters.city} options={options.cities} onChange={(value) => setFilter("city", value)} />
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
        <MetricPill label="Total personas" value={current.summary.totalPersonas.toLocaleString("en-US")} />
        <MetricPill label="Mujeres" value={womenPct} />
        <MetricPill label="Ciudades" value={distinctCities.toLocaleString("en-US")} />
      </div>

      {rows.length ? (
        <div className="space-y-5">
          {/* Categorías pequeñas — donut */}
          <div className="grid gap-5 md:grid-cols-3">
            <DonutChart title="Género" data={groups.gender} onSelect={(group) => selectGroup("Genero", group)} />
            <DonutChart title="Tipo de empleado" data={groups.employeeType} onSelect={(group) => selectGroup("Tipo de empleado", group)} />
            <DonutChart title="Tipo de contrato" data={groups.contractType} onSelect={(group) => selectGroup("Tipo de contrato", group)} />
          </div>
          {/* Categorías extensas — barra horizontal */}
          <div className="grid gap-5 xl:grid-cols-2">
            <DistributionChart title="Estado civil" data={groups.maritalStatus} onSelect={(group) => selectGroup("Estado civil", group)} />
            <DistributionChart title="Lugar de nacimiento" data={groups.birthPlace} onSelect={(group) => selectGroup("Lugar de nacimiento", group)} />
            <DistributionChart title="Ciudad" data={groups.city} onSelect={(group) => selectGroup("Ciudad", group)} />
            <DistributionChart title="Parroquia" data={groups.parish} onSelect={(group) => selectGroup("Parroquia", group)} />
            <DistributionChart title="Nacionalidad" data={groups.nationality} onSelect={(group) => selectGroup("Nacionalidad", group)} />
            <DistributionChart title="Nivel de instrucción" data={groups.educationTitle} onSelect={(group) => selectGroup("Nivel instruccion", group)} />
          </div>
        </div>
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
