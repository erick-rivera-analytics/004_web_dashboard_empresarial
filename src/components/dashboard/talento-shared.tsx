"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PersonInfoOverlay } from "@/components/dashboard/person-info-overlay";
import { formatWeekLabel, generateAvailableWeeks } from "@/lib/talento-humano-utils";
import type { TalentoFilters, TalentoPersonRecord } from "@/lib/talento-humano";

export const TALENTO_WEEKS = generateAvailableWeeks(2024);

/** @deprecated use TALENTO_COLORS */
export const BAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export const TALENTO_COLORS = BAR_COLORS;

export type TalentoGroup<T extends TalentoPersonRecord = TalentoPersonRecord> = {
  label: string;
  count: number;
  people: T[];
};

export function buildTalentoQueryString(filters: TalentoFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => params.set(key, value));
  return params.toString();
}

export function groupTalentoRows<T extends TalentoPersonRecord>(
  rows: T[],
  key: keyof T,
  limit = 20,
): TalentoGroup<T>[] {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const value = row[key];
    const label = typeof value === "string" && value.trim() ? value : "Sin dato";
    const people = grouped.get(label) ?? [];
    people.push(row);
    grouped.set(label, people);
  }

  return Array.from(grouped.entries())
    .map(([label, people]) => ({ label, count: people.length, people }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es-EC"))
    .slice(0, limit);
}

export function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-xs uppercase text-muted-foreground/80">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const resolvedOptions = value !== "all" && !options.includes(value) ? [value, ...options] : options;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="all">Todos</option>
        {resolvedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function WeekSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {TALENTO_WEEKS.map((week) => (
          <option key={week} value={week}>
            {formatWeekLabel(week)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase text-muted-foreground">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

type CompositionBucket = {
  label: string;
  value: number;
};

export type CompositionRow = {
  label: string;
  people: TalentoPersonRecord[];
  tenure: CompositionBucket[];
  gender: CompositionBucket[];
  age: CompositionBucket[];
};

export function buildCompositionRows(
  rows: TalentoPersonRecord[],
  key: keyof TalentoPersonRecord,
  asOfDate: string,
): CompositionRow[] {
  const asOfTime = new Date(`${asOfDate}T12:00:00`).getTime();
  const groups = groupTalentoRows(rows, key, 9999);
  return groups.map((group) => ({
    label: group.label,
    people: group.people,
    tenure: buildShareBuckets(group.people, (row) => getTenureBucket(row, asOfTime), ["1-30 dias", "31-90 dias", "91-180 dias", "181-360 dias", ">360 dias"]),
    gender: buildShareBuckets(group.people, getGenderBucket, ["Femenino", "Masculino"]),
    age: buildShareBuckets(group.people, (row) => getAgeBucket(row, asOfTime), ["<24", "24-30", "31-37", "38-42", "43-49", "50-56", ">56"]),
  }));
}

export function CompositionTable({
  title,
  dimensionLabel = "Variable",
  rows,
  asOfDate,
  onSelect,
}: {
  title: string;
  dimensionLabel?: string;
  rows: CompositionRow[];
  asOfDate: string;
  onSelect: (row: CompositionRow) => void;
}) {
  const total = rows.flatMap((row) => row.people);
  const asOfTime = new Date(`${asOfDate}T12:00:00`).getTime();
  const totalRow: CompositionRow = {
    label: "TOTAL",
    people: total,
    tenure: buildShareBuckets(total, (row) => getTenureBucket(row, asOfTime), ["1-30 dias", "31-90 dias", "91-180 dias", "181-360 dias", ">360 dias"]),
    gender: buildShareBuckets(total, getGenderBucket, ["Femenino", "Masculino"]),
    age: buildShareBuckets(total, (row) => getAgeBucket(row, asOfTime), ["<24", "24-30", "31-37", "38-42", "43-49", "50-56", ">56"]),
  };

  return (
    <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
      <p className="mb-4 text-sm font-semibold">{title}</p>
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/70">
              <th rowSpan={2} className="sticky left-0 z-10 w-[210px] bg-card px-3 py-2 text-left font-semibold">{dimensionLabel}</th>
              <th rowSpan={2} className="sticky left-[210px] z-10 w-[120px] border-r-4 border-foreground bg-card px-3 py-2 text-right font-semibold">Colaboradores</th>
              <th colSpan={5} className="border-l-4 border-l-[var(--color-chart-info-bold)] bg-[var(--color-chart-info-soft)]/25 px-3 py-2 text-center font-semibold uppercase text-muted-foreground">Antiguedad</th>
              <th colSpan={2} className="border-l-4 border-l-[var(--color-chart-success-bold)] bg-[var(--color-chart-success-soft)]/25 px-3 py-2 text-center font-semibold uppercase text-muted-foreground">Sexo</th>
              <th colSpan={7} className="border-l-4 border-l-[var(--color-chart-warning)] bg-[var(--color-chart-warning-soft)]/20 px-3 py-2 text-center font-semibold uppercase text-muted-foreground">Edad</th>
            </tr>
            <tr className="border-b border-border/70">
              {totalRow.tenure.map((bucket, index) => (
                <th key={bucket.label} className={`bg-[var(--color-chart-info-soft)]/15 px-2 py-2 text-center font-medium ${index === 0 ? "border-l-4 border-l-[var(--color-chart-info-bold)]" : ""}`}>{bucket.label}</th>
              ))}
              {totalRow.gender.map((bucket, index) => (
                <th key={bucket.label} className={`bg-[var(--color-chart-success-soft)]/15 px-2 py-2 text-center font-medium ${index === 0 ? "border-l-4 border-l-[var(--color-chart-success-bold)]" : ""}`}>{bucket.label}</th>
              ))}
              {totalRow.age.map((bucket, index) => (
                <th key={bucket.label} className={`bg-[var(--color-chart-warning-soft)]/10 px-2 py-2 text-center font-medium ${index === 0 ? "border-l-4 border-l-[var(--color-chart-warning)]" : ""}`}>{bucket.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
            <CompositionTableRow key={row.label} row={row} onClick={() => onSelect(row)} />
            ))}
            <CompositionTableRow row={totalRow} total onClick={() => onSelect(totalRow)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompositionTableRow({
  row,
  total,
  onClick,
}: {
  row: CompositionRow;
  total?: boolean;
  onClick: () => void;
}) {
  return (
    <tr className={`border-b border-border/50 hover:bg-muted/20 ${total ? "bg-muted/20 font-semibold" : ""}`}>
      <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm px-3 py-2 text-left">
        <button type="button" className="text-left font-medium hover:underline" onClick={onClick}>{row.label}</button>
      </td>
      <td className="sticky left-[210px] z-10 border-r-4 border-foreground bg-card/95 backdrop-blur-sm px-3 py-2 text-right">
        <button type="button" className="font-semibold hover:underline" onClick={onClick}>{row.people.length.toLocaleString("en-US")}</button>
      </td>
      {row.tenure.map((bucket, index) => (
        <td key={bucket.label} className={`px-2 py-2 text-center ${index === 0 ? "border-l-4 border-l-[var(--color-chart-info-bold)]" : ""}`} style={{ backgroundColor: heatmapColor(bucket.value, 198) }}>
          {formatPercent(bucket.value)}
        </td>
      ))}
      {row.gender.map((bucket, index) => (
        <td key={bucket.label} className={`px-2 py-2 text-center ${index === 0 ? "border-l-4 border-l-[var(--color-chart-success-bold)]" : ""}`} style={{ backgroundColor: heatmapColor(bucket.value, 145) }}>
          {formatPercent(bucket.value)}
        </td>
      ))}
      {row.age.map((bucket, index) => (
        <td key={bucket.label} className={`px-2 py-2 text-center ${index === 0 ? "border-l-4 border-l-[var(--color-chart-warning)]" : ""}`} style={{ backgroundColor: heatmapColor(bucket.value, 44) }}>
          {formatPercent(bucket.value)}
        </td>
      ))}
    </tr>
  );
}

function buildShareBuckets(
  rows: TalentoPersonRecord[],
  getter: (row: TalentoPersonRecord) => string | null,
  labels: string[],
): CompositionBucket[] {
  const denominator = rows.reduce((count, row) => count + (getter(row) ? 1 : 0), 0);
  return labels.map((label) => ({
    label,
    value: denominator ? rows.filter((row) => getter(row) === label).length / denominator : 0,
  }));
}

function getAgeBucket(row: TalentoPersonRecord, asOfTime: number) {
  if (!row.birthDate) return null;
  const years = Math.floor((asOfTime - new Date(row.birthDate).getTime()) / 31557600000);
  if (!Number.isFinite(years)) return null;
  if (years <= 23) return "<24";
  if (years <= 30) return "24-30";
  if (years <= 37) return "31-37";
  if (years <= 42) return "38-42";
  if (years <= 49) return "43-49";
  if (years <= 56) return "50-56";
  return ">56";
}

function getTenureBucket(row: TalentoPersonRecord, asOfTime: number) {
  if (!row.lastEntryDate) return null;
  const days = Math.floor((asOfTime - new Date(row.lastEntryDate).getTime()) / 86400000);
  if (!Number.isFinite(days)) return null;
  if (days <= 30) return "1-30 dias";
  if (days <= 90) return "31-90 dias";
  if (days <= 180) return "91-180 dias";
  if (days <= 360) return "181-360 dias";
  return ">360 dias";
}

function getGenderBucket(row: TalentoPersonRecord) {
  const value = row.gender?.trim().toUpperCase();
  if (!value) return null;
  if (value.startsWith("F")) return "Femenino";
  if (value.startsWith("M")) return "Masculino";
  return null;
}

function heatmapColor(value: number, hue: number) {
  const lightness = 96 - Math.min(24, value * 44);
  return `hsl(${hue} 48% ${lightness}%)`;
}

function formatPercent(value: number) {
  return value.toLocaleString("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DistributionChart<T extends TalentoPersonRecord>({
  title,
  data,
  onSelect,
  colorOffset = 0,
}: {
  title: string;
  data: TalentoGroup<T>[];
  onSelect: (group: TalentoGroup<T>) => void;
  colorOffset?: number;
}) {
  const height = Math.max(220, Math.min(data.length * 34 + 70, 430));

  return (
    <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
      <p className="mb-4 text-xs font-semibold uppercase text-muted-foreground/70">{title}</p>
      {data.length ? (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={132}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}...` : value)}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.32 }}
              formatter={(value) => [typeof value === "number" ? value.toLocaleString("en-US") : "0", "Personas"]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 6, 6, 0]}
              cursor="pointer"
              onClick={(entry: unknown) => {
                const group = (entry as { payload?: TalentoGroup<T> }).payload;
                if (group) onSelect(group);
              }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={BAR_COLORS[(colorOffset + index) % BAR_COLORS.length]}
                  fillOpacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState label="Sin datos para graficar." />
      )}
    </div>
  );
}

export function DistributionSummaryCard<T extends TalentoPersonRecord>({
  title,
  data,
  onSelect,
  accent = "var(--color-chart-info-bold)",
}: {
  title: string;
  data: TalentoGroup<T>[];
  onSelect: (group: TalentoGroup<T>) => void;
  accent?: string;
}) {
  const total = data.reduce((sum, group) => sum + group.count, 0);
  const top = data.slice(0, 6);
  const dominant = top[0];

  return (
    <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground/70">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{dominant ? dominant.count.toLocaleString("en-US") : "0"}</p>
        </div>
        <div className="grid size-16 place-items-center rounded-full border-4 bg-background text-center text-[10px] font-semibold" style={{ borderColor: accent }}>
          {dominant ? formatPercent(total ? dominant.count / total : 0) : "-"}
        </div>
      </div>
      {dominant ? (
        <button
          type="button"
          className="mt-3 max-w-full truncate text-left text-sm font-medium hover:underline"
          onClick={() => onSelect(dominant)}
        >
          {dominant.label}
        </button>
      ) : null}
      <div className="mt-4 grid gap-2">
        {top.map((group, index) => (
          <button
            type="button"
            key={group.label}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-left hover:bg-muted/30"
            onClick={() => onSelect(group)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }} />
              <span className="truncate text-xs font-medium">{group.label}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {group.count.toLocaleString("en-US")} · {formatPercent(total ? group.count / total : 0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PersonListModal<T extends TalentoPersonRecord>({
  title,
  people,
  onClose,
}: {
  title: string;
  people: T[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<T | null>(null);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (person) =>
        person.personId.toLowerCase().includes(term) ||
        person.personName.toLowerCase().includes(term),
    );
  }, [people, search]);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Cerrar listado"
        />
        <div className="relative flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-xl">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
              <span className="text-xs text-muted-foreground">{people.length} personas</span>
              <button
                type="button"
                onClick={onClose}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Cerrar listado"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-1.5">
              <Search className="size-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o ID..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPeople.length ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card/95 backdrop-blur">
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">ID</th>
                    <th className="px-5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Nombre</th>
                    <th className="px-5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Area</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person, index) => (
                    <tr
                      key={`${person.personId}-${person.areaId}-${index}`}
                      className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/30"
                      onClick={() => setSelectedPerson(person)}
                    >
                      <td className="px-5 py-2.5 text-xs text-muted-foreground">{person.personId}</td>
                      <td className="px-5 py-2.5 text-xs font-medium">{person.personName}</td>
                      <td className="max-w-[180px] truncate px-5 py-2.5 text-xs text-muted-foreground">{person.areaName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState label="Sin resultados." />
            )}
          </div>
        </div>
      </div>
      {selectedPerson ? (
        <PersonInfoOverlay
          personId={selectedPerson.personId}
          personName={selectedPerson.personName}
          onClose={() => setSelectedPerson(null)}
        />
      ) : null}
    </>
  );
}

export function DonutChart<T extends TalentoPersonRecord>({
  title,
  data,
  onSelect,
}: {
  title: string;
  data: TalentoGroup<T>[];
  onSelect: (group: TalentoGroup<T>) => void;
}) {
  const top = data.slice(0, 6);
  const total = data.reduce((s, g) => s + g.count, 0);

  return (
    <div className="rounded-[24px] border border-border/70 bg-card/80 p-5">
      <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground/70">{title}</p>
      {top.length ? (
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <PieChart width={160} height={160}>
              <Pie
                data={top}
                dataKey="count"
                nameKey="label"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={2}
                onClick={(entry: unknown) => {
                  const g = (entry as { payload?: TalentoGroup<T> }).payload;
                  if (g) onSelect(g);
                }}
                cursor="pointer"
              >
                {top.map((entry, index) => (
                  <Cell key={entry.label} fill={TALENTO_COLORS[index % TALENTO_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [typeof value === "number" ? value.toLocaleString("en-US") : "0", "Personas"]}
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
              />
            </PieChart>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {top.map((entry, index) => (
              <button
                key={entry.label}
                type="button"
                className="flex items-center justify-between gap-2 text-left hover:opacity-75"
                onClick={() => onSelect(entry)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: TALENTO_COLORS[index % TALENTO_COLORS.length] }}
                  />
                  <span className="truncate text-xs">{entry.label}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {total ? Math.round((entry.count / total) * 100) : 0}%
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState label="Sin datos." />
      )}
    </div>
  );
}

export function EmptyState({ label = "No hay datos para el periodo seleccionado." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
      <Users className="size-8 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
