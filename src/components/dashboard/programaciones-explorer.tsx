"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Leaf, Lightbulb, Droplets } from "lucide-react";

import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type ProgramacionType = "plantas_muertas" | "iluminacion" | "riego";

export type Programacion = {
  date: string; // "YYYY-MM-DD"
  type: ProgramacionType;
  label: string;
  area?: string;
  block?: string;
  notes?: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: {
  key: ProgramacionType;
  label: string;
  icon: React.ElementType;
  pillClass: string;
}[] = [
  {
    key: "plantas_muertas",
    label: "Plantas Muertas",
    icon: Leaf,
    pillClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    key: "iluminacion",
    label: "Iluminación",
    icon: Lightbulb,
    pillClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    key: "riego",
    label: "Riego",
    icon: Droplets,
    pillClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
];

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCalendarCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  return cells;
}

// ── Component ─────────────────────────────────────────────────────────────────

type ProgramacionesExplorerProps = {
  /**
   * Programaciones cargadas desde la API (vacío hasta que se conecte la BD).
   * Cada item tiene: date "YYYY-MM-DD", type, label, y campos opcionales.
   */
  initialData?: Programacion[];
};

export function ProgramacionesExplorer({
  initialData = [],
}: ProgramacionesExplorerProps) {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [activeTab, setActiveTab] = useState<ProgramacionType>("plantas_muertas");
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<string | null>(null); // selected date string

  // When API is connected, replace initialData with SWR/fetch
  const programaciones: Programacion[] = initialData;

  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;

  // Filter by active tab
  const filteredByType = useMemo(
    () => programaciones.filter((p) => p.type === activeTab),
    [programaciones, activeTab],
  );

  // Index by date
  const byDate = useMemo(() => {
    const map = new Map<string, Programacion[]>();
    for (const p of filteredByType) {
      const list = map.get(p.date) ?? [];
      list.push(p);
      map.set(p.date, list);
    }
    return map;
  }, [filteredByType]);

  // Calendar grid
  const cells = useMemo(
    () => buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    setSelected(null);
  }
  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    setSelected(null);
  }

  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <div className="space-y-5">
      {/* ── Tab selector ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSelected(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4", active ? "text-background" : "")}
                aria-hidden
              />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        {/* ── Calendar ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <button
              type="button"
              onClick={prevMonth}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <h2 className="text-sm font-semibold">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button
              type="button"
              onClick={nextMonth}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const dateStr = toDateStr(cell.date);
              const events = byDate.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;
              const isLastRow = i >= 35;
              const isLastCol = (i + 1) % 7 === 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : dateStr)}
                  className={cn(
                    "group min-h-[90px] border-b border-r border-border/40 p-2 text-left transition-colors",
                    isLastRow && "border-b-0",
                    isLastCol && "border-r-0",
                    !cell.isCurrentMonth && "bg-muted/20",
                    isSelected && "bg-muted/40 ring-1 ring-inset ring-border",
                    cell.isCurrentMonth && !isSelected && "hover:bg-muted/30",
                  )}
                >
                  {/* Day number */}
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-sm font-medium leading-none transition-colors",
                      isToday && "bg-foreground text-background",
                      !isToday && cell.isCurrentMonth && "text-foreground group-hover:bg-muted",
                      !isToday && !cell.isCurrentMonth && "text-muted-foreground/40",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>

                  {/* Event pills */}
                  <div className="mt-1 space-y-0.5">
                    {events.slice(0, 3).map((ev, ei) => (
                      <div
                        key={ei}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                          activeTabMeta.pillClass,
                        )}
                      >
                        {ev.label}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{events.length - 3} más
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Side panel ───────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Selected day detail */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/50 bg-muted/20 px-5 py-4">
              <h3 className="text-sm font-semibold">
                {selected
                  ? new Date(selected + "T00:00:00").toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "Selecciona un día"}
              </h3>
              {selected && (
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {selectedEvents.length === 0
                    ? "Sin programaciones"
                    : `${selectedEvents.length} programación${selectedEvents.length > 1 ? "es" : ""}`}
                </p>
              )}
            </div>

            <div className="px-5 py-4">
              {!selected && (
                <p className="text-center text-sm text-muted-foreground/60">
                  Haz clic en un día del calendario para ver el detalle.
                </p>
              )}

              {selected && selectedEvents.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">Sin programaciones para este día.</p>
                </div>
              )}

              {selected && selectedEvents.length > 0 && (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
                    >
                      <p className="text-sm font-medium">{ev.label}</p>
                      {ev.area && (
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          Área: {ev.area}
                        </p>
                      )}
                      {ev.block && (
                        <p className="text-[12px] text-muted-foreground">
                          Bloque: {ev.block}
                        </p>
                      )}
                      {ev.notes && (
                        <p className="mt-1.5 text-[12px] text-muted-foreground/80 italic">
                          {ev.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly summary */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/50 bg-muted/20 px-5 py-4">
              <h3 className="text-sm font-semibold">Resumen del mes</h3>
            </div>
            <div className="px-5 py-4">
              {filteredByType.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground/60">
                    Sin datos. Pendiente de conexión a base de datos.
                  </p>
                </div>
              ) : (
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Total programaciones</dt>
                    <dd className="font-semibold">{filteredByType.length}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Días activos</dt>
                    <dd className="font-semibold">{byDate.size}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
