"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Droplets, Leaf, Lightbulb, LoaderCircle } from "lucide-react";
import useSWR from "swr";

import { MultiSelectField } from "@/components/ui/multi-select-field";
import { fetchJson } from "@/lib/fetch-json";
import { decodeMultiSelectValue } from "@/lib/multi-select";
import { cn } from "@/lib/utils";
import type { ProgramacionRecord } from "@/lib/programaciones";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProgramacionTab = "plantas_muertas" | "iluminacion" | "riego";

const TABS: {
  key: ProgramacionTab;
  label: string;
  icon: React.ElementType;
  activityCode: string | null;
}[] = [
  { key: "plantas_muertas", label: "Plantas Muertas", icon: Leaf,       activityCode: "SPMC" },
  { key: "iluminacion",     label: "Iluminación",     icon: Lightbulb,  activityCode: "ILUMINACION" },
  { key: "riego",           label: "Riego",           icon: Droplets,   activityCode: null },
];

const DAY_LABELS  = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const FASE_OPTIONS = ["Planificado", "Activo", "Historia"] as const;
type FaseOption = (typeof FASE_OPTIONS)[number] | "";

// ── Color palettes (inline styles — safe with Tailwind purge) ─────────────────

/** Each area gets a unique background tint + matching border.  */
const AREA_PALETTE: { bg: string; border: string }[] = [
  { bg: "rgba(20,184,166,0.11)",  border: "rgba(20,184,166,0.40)" },  // teal
  { bg: "rgba(59,130,246,0.11)",  border: "rgba(59,130,246,0.40)" },  // blue
  { bg: "rgba(139,92,246,0.11)",  border: "rgba(139,92,246,0.40)" },  // violet
  { bg: "rgba(245,158,11,0.11)",  border: "rgba(245,158,11,0.40)" },  // amber
  { bg: "rgba(16,185,129,0.11)",  border: "rgba(16,185,129,0.40)" },  // emerald
  { bg: "rgba(244,63,94,0.11)",   border: "rgba(244,63,94,0.40)" },   // rose
  { bg: "rgba(249,115,22,0.11)",  border: "rgba(249,115,22,0.40)" },  // orange
  { bg: "rgba(6,182,212,0.11)",   border: "rgba(6,182,212,0.40)" },   // cyan
];

/** Variety badge background (more saturated). */
const VARIETY_COLORS: string[] = [
  "rgba(20,184,166,0.75)",
  "rgba(59,130,246,0.75)",
  "rgba(139,92,246,0.75)",
  "rgba(245,158,11,0.75)",
  "rgba(16,185,129,0.75)",
  "rgba(244,63,94,0.75)",
  "rgba(249,115,22,0.75)",
  "rgba(6,182,212,0.75)",
];

/** SP-type left accent bar (third, independent channel). */
const SPTYPE_ACCENT_COLORS: string[] = [
  "#14b8a6",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#f97316",
  "#06b6d4",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function strHash(s: string, len: number): number {
  if (!s || len <= 0) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % len;
  return Math.abs(h);
}

function getAreaStyle(areaId: string | null): { bg: string; border: string } {
  return AREA_PALETTE[strHash(areaId ?? "?", AREA_PALETTE.length)];
}

function getVarietyColor(variety: string | null): string {
  return VARIETY_COLORS[strHash(variety ?? "?", VARIETY_COLORS.length)];
}

function getSpTypeAccent(spType: string | null): string {
  return SPTYPE_ACCENT_COLORS[strHash(spType ?? "?", SPTYPE_ACCENT_COLORS.length)];
}

function getVarietyAbbr(variety: string | null): string {
  if (!variety) return "?";
  const parts = variety.trim().split(/[\s_\-]+/);
  return parts.length >= 2
    ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
    : variety.slice(0, 2).toUpperCase();
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay  = new Date(year, month + 1, 0).getDate();
  const dateTo   = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
  return { dateFrom, dateTo };
}

function buildCalendarCells(year: number, month: number) {
  const firstWeekday  = new Date(year, month, 1).getDay();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const daysInPrev    = new Date(year, month, 0).getDate();
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });

  return cells;
}

const progFetcher = (url: string) =>
  fetchJson<ProgramacionRecord[]>(url, "No se pudo cargar las programaciones.");

// ── Event pill ────────────────────────────────────────────────────────────────

function EventPill({ record, onClick, highlighted }: { record: ProgramacionRecord; onClick?: (e: React.MouseEvent) => void; highlighted?: boolean }) {
  const areaStyle    = getAreaStyle(record.areaId);
  const varietyColor = getVarietyColor(record.variety);
  const spAccent     = getSpTypeAccent(record.spType);
  const abbr         = getVarietyAbbr(record.variety);

  return (
    <div
      style={{
        background:   areaStyle.bg,
        borderTop:    highlighted ? `1.5px solid ${spAccent}` : `1px solid ${areaStyle.border}`,
        borderRight:  highlighted ? `1.5px solid ${spAccent}` : `1px solid ${areaStyle.border}`,
        borderBottom: highlighted ? `1.5px solid ${spAccent}` : `1px solid ${areaStyle.border}`,
        borderLeft:   `3px solid ${spAccent}`,
        borderRadius: "6px",
        padding:      "2px 5px 2px 5px",
        cursor:       onClick ? "pointer" : "default",
        opacity:      onClick && !highlighted ? 0.72 : 1,
      }}
      className="flex items-center gap-1"
      title={`${record.blockId} · ${record.variety ?? "—"} · SP: ${record.spType ?? "—"} · Área: ${record.areaId ?? "—"}`}
      onClick={onClick}
    >
      {/* ilumLabel badge (Inicio / Fin) */}
      {record.ilumLabel && (
        <span style={{ color: spAccent, fontSize: "9px", fontWeight: 700, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {record.ilumLabel}
        </span>
      )}
      {/* block_id */}
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-foreground">
        {record.blockId}
      </span>
      {/* variety badge */}
      <span
        style={{
          background:    varietyColor,
          borderRadius:  "4px",
          padding:       "0 4px",
          fontSize:      "9px",
          fontWeight:    700,
          color:         "#fff",
          letterSpacing: "0.02em",
          lineHeight:    "16px",
          flexShrink:    0,
        }}
      >
        {abbr}
      </span>
    </div>
  );
}

// ── Main explorer ─────────────────────────────────────────────────────────────

type ProgramacionesExplorerProps = {
  initialData?: ProgramacionRecord[];
  initialDateFrom?: string;
  initialDateTo?: string;
};

export function ProgramacionesExplorer({
  initialData = [],
  initialDateFrom,
  initialDateTo,
}: ProgramacionesExplorerProps) {
  const today    = new Date();
  const todayStr = toDateStr(today);

  const [activeTab,           setActiveTab]           = useState<ProgramacionTab>("plantas_muertas");
  const [viewDate,            setViewDate]            = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected,            setSelected]            = useState<string | null>(null);
  const [selectedIlumCycleKey, setSelectedIlumCycleKey] = useState<string | null>(null);
  const [areaFilter,          setAreaFilter]          = useState("all");
  const [faseFilter,          setFaseFilter]          = useState<FaseOption>("");

  const { dateFrom, dateTo } = useMemo(
    () => monthRange(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const isCurrentInitialRange =
    dateFrom === initialDateFrom && dateTo === initialDateTo;

  // SWR — skips initial fetch if server already gave us the right month
  const { data: swrData, isLoading } = useSWR<ProgramacionRecord[]>(
    `/api/programaciones?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    progFetcher,
    {
      fallbackData: isCurrentInitialRange ? initialData : undefined,
      keepPreviousData: true,
      dedupingInterval: 60_000,
    },
  );

  const allRecords = swrData ?? [];

  // Derived option lists (unique areas from loaded data)
  const areaOptions = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.areaId).filter(Boolean) as string[])).sort(),
    [allRecords],
  );

  const selectedAreas = useMemo(() => decodeMultiSelectValue(areaFilter), [areaFilter]);

  // Active tab → activity code filter
  const activeCode = TABS.find((t) => t.key === activeTab)?.activityCode ?? null;

  // Filtered records — Riego sin activityCode → vacío
  const filtered = useMemo(() => {
    if (!activeCode) return [];
    return allRecords.filter((r) => {
      if (r.activityCode !== activeCode) return false;
      if (selectedAreas.length && !selectedAreas.includes(r.areaId ?? "")) return false;
      if (faseFilter && r.fase !== faseFilter) return false;
      return true;
    });
  }, [allRecords, activeCode, selectedAreas, faseFilter]);

  // Index by date
  const byDate = useMemo(() => {
    const map = new Map<string, ProgramacionRecord[]>();
    for (const rec of filtered) {
      const list = map.get(rec.eventDate) ?? [];
      list.push(rec);
      map.set(rec.eventDate, list);
    }
    return map;
  }, [filtered]);

  const cells = useMemo(
    () => buildCalendarCells(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  // Iluminación: ciclo seleccionado y sus dos extremos (INICIO / FIN)
  const ilumCycleRecords = useMemo(
    () => selectedIlumCycleKey
      ? filtered.filter((r) => r.cycleKey === selectedIlumCycleKey)
      : [],
    [filtered, selectedIlumCycleKey],
  );
  const ilumHighlightedDates = useMemo(
    () => new Set(ilumCycleRecords.map((r) => r.eventDate)),
    [ilumCycleRecords],
  );
  // Get start/end from cycle records (month-specific) for detail display
  const ilumStartRec = ilumCycleRecords.find((r) => r.ilumLabel === "Inicio") ?? null;
  const ilumEndRec   = ilumCycleRecords.find((r) => r.ilumLabel === "Fin") ?? null;

  // Get cycle date range from highlighted dates (includes all cycle dates)
  const ilumCycleDateRange = ilumHighlightedDates.size > 0
    ? {
        min: Array.from(ilumHighlightedDates).sort()[0],
        max: Array.from(ilumHighlightedDates).sort()[ilumHighlightedDates.size - 1],
      }
    : null;

  const ilumDays = ilumCycleDateRange
    ? Math.round(
        (new Date(ilumCycleDateRange.max).getTime() - new Date(ilumCycleDateRange.min).getTime())
        / 86_400_000,
      )
    : null;

  function prevMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); setSelected(null); setSelectedIlumCycleKey(null); }
  function nextMonth() { setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); setSelected(null); setSelectedIlumCycleKey(null); }

  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("es-ES", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  return (
    <div className="space-y-5">

      {/* ── Activity tabs ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon   = tab.icon;
          const active = activeTab === tab.key;
          const hasData = tab.activityCode
            ? allRecords.some((r) => r.activityCode === tab.activityCode)
            : false;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setSelected(null); }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {tab.label}
              {!hasData && tab.activityCode && (
                <span className="rounded-full bg-border/50 px-1.5 text-[9px] font-semibold uppercase tracking-wide">
                  pronto
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <MultiSelectField
            id="prog-area"
            label="Área"
            value={areaFilter}
            options={areaOptions}
            onChange={setAreaFilter}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">Fase</p>
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card p-1">
            <button
              type="button"
              onClick={() => setFaseFilter("")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                faseFilter === "" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Todas
            </button>
            {FASE_OPTIONS.map((fase) => (
              <button
                key={fase}
                type="button"
                onClick={() => setFaseFilter(fase)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  faseFilter === fase
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {fase}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* ── Visual legend ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border/50 bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">Leyenda</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-1 rounded-full" style={{ background: SPTYPE_ACCENT_COLORS[0] }} />
          Borde izq. = Tipo SP
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded" style={{ background: AREA_PALETTE[0]!.bg, border: `1px solid ${AREA_PALETTE[0]!.border}` }} />
          Fondo = Área
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded px-1 text-[9px] font-bold text-white" style={{ background: VARIETY_COLORS[0] }}>Va</span>
          Badge = Variedad
        </span>
      </div>

      {/* ── Main grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">

        {/* Calendar card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">

          {/* Month nav */}
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <button type="button" onClick={prevMonth} aria-label="Mes anterior"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <h2 className="text-sm font-semibold">
              {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button type="button" onClick={nextMonth} aria-label="Mes siguiente"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              const dateStr     = toDateStr(cell.date);
              const events      = byDate.get(dateStr) ?? [];
              const isToday     = dateStr === todayStr;
              const isSel       = dateStr === selected;
              const isIlumHL    = activeTab === "iluminacion" && ilumHighlightedDates.has(dateStr);
              const isLastRow   = i >= 35;
              const isLastCol   = (i + 1) % 7 === 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelected(isSel ? null : dateStr)}
                  className={cn(
                    "group min-h-[88px] border-b border-r border-border/40 p-2 text-left transition-colors",
                    isLastRow && "border-b-0",
                    isLastCol && "border-r-0",
                    !cell.isCurrentMonth && "bg-muted/20",
                    isSel && "ring-1 ring-inset ring-border bg-muted/40",
                    isIlumHL && !isSel && "bg-amber-50/40 dark:bg-amber-900/10",
                    cell.isCurrentMonth && !isSel && !isIlumHL && "hover:bg-muted/25",
                  )}
                >
                  {/* Day number */}
                  <span className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-medium leading-none",
                    isToday   && "bg-foreground text-background",
                    isIlumHL  && !isToday && "ring-2 ring-amber-400/70",
                    !isToday  && cell.isCurrentMonth  && "text-foreground",
                    !isToday  && !cell.isCurrentMonth && "text-muted-foreground/40",
                  )}>
                    {cell.date.getDate()}
                  </span>

                  {/* Event pills */}
                  <div className="mt-1 space-y-[3px]">
                    {events.slice(0, 4).map((ev, ei) => (
                      <EventPill
                        key={`${ev.cycleKey}-${ei}`}
                        record={ev}
                        highlighted={activeTab === "iluminacion" && selectedIlumCycleKey === ev.cycleKey}
                        onClick={activeTab === "iluminacion" ? (e) => {
                          e.stopPropagation();
                          const newKey = ev.cycleKey === selectedIlumCycleKey ? null : ev.cycleKey;
                          if (newKey) {
                            // Find start/end dates for this cycle
                            const cycleRecs = filtered.filter((r) => r.cycleKey === newKey);
                            const startRec = cycleRecs.find((r) => r.ilumLabel === "Inicio");
                            const endRec = cycleRecs.find((r) => r.ilumLabel === "Fin");
                            const firstDate = startRec || endRec;
                            // Auto-navigate to the month of the first available date
                            if (firstDate) {
                              const eventDate = new Date(firstDate.eventDate);
                              setViewDate(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
                            }
                          }
                          setSelectedIlumCycleKey(newKey);
                        } : undefined}
                      />
                    ))}
                    {events.length > 4 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{events.length - 4} más
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">

          {/* Iluminación cycle detail */}
          {activeTab === "iluminacion" && (
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border/50 bg-amber-50/40 dark:bg-amber-900/10 px-5 py-4 flex items-center gap-2">
                <Lightbulb className="size-4 shrink-0 text-amber-500" aria-hidden />
                <h3 className="text-sm font-semibold">
                  {selectedIlumCycleKey ? "Ciclo de iluminación" : "Iluminación"}
                </h3>
              </div>
              <div className="px-5 py-4">
                {!selectedIlumCycleKey ? (
                  <p className="py-3 text-center text-sm text-muted-foreground/60">
                    Haz clic en una etiqueta de iluminación para ver el detalle del ciclo.
                  </p>
                ) : (() => {
                  const rec = ilumStartRec ?? ilumEndRec;
                  if (!rec) return (
                    <p className="py-3 text-center text-sm text-muted-foreground">Sin datos para este ciclo.</p>
                  );
                  const spAccent     = getSpTypeAccent(rec.spType);
                  const varietyColor = getVarietyColor(rec.variety);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-semibold">{rec.blockId}</p>
                        {rec.variety && (
                          <span
                            style={{ background: varietyColor, color: "#fff", borderRadius: "4px", padding: "1px 6px", fontSize: "10px", fontWeight: 700 }}
                          >
                            {getVarietyAbbr(rec.variety)}
                          </span>
                        )}
                      </div>
                      <dl className="space-y-1.5 text-[12px]">
                        {rec.variety && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Variedad</dt>
                            <dd className="font-medium text-right">{rec.variety}</dd>
                          </div>
                        )}
                        {rec.areaId && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Área</dt>
                            <dd className="font-medium text-right">{rec.areaId}</dd>
                          </div>
                        )}
                        {rec.spType && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Tipo SP</dt>
                            <dd className="font-medium text-right" style={{ color: spAccent }}>{rec.spType}</dd>
                          </div>
                        )}
                        {rec.fase && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Fase</dt>
                            <dd className="font-medium text-right">{rec.fase}</dd>
                          </div>
                        )}
                      </dl>

                      {/* Visual cycle bar connecting start and end */}
                      {ilumCycleDateRange && (
                        <div className="mt-3 px-2 py-3 rounded-lg bg-amber-50/40 dark:bg-amber-900/20">
                          <div className="flex items-center gap-3">
                            {/* Start dot */}
                            <div className="flex flex-col items-center">
                              <div className="size-3 rounded-full bg-amber-400 border-2 border-amber-500 shadow-sm" />
                              <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{formatDate(ilumCycleDateRange.min)}</span>
                            </div>
                            {/* Connecting bar */}
                            <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 shadow-sm" />
                            {/* End dot */}
                            <div className="flex flex-col items-center">
                              <div className="size-3 rounded-full bg-orange-400 border-2 border-orange-500 shadow-sm" />
                              <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">{formatDate(ilumCycleDateRange.max)}</span>
                            </div>
                          </div>
                          {ilumDays !== null && (
                            <div className="text-center mt-2">
                              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{ilumDays} días</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10 divide-y divide-amber-200/40 dark:divide-amber-800/30 text-[12px]">
                        {ilumStartRec ? (
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="inline-block size-2 rounded-full bg-amber-400" />
                              Inicio
                            </span>
                            <span className="font-semibold">{formatDate(ilumStartRec.eventDate)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-muted-foreground/50">
                            <span>Inicio</span><span>fuera del rango</span>
                          </div>
                        )}
                        {ilumEndRec ? (
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="inline-block size-2 rounded-full bg-orange-400" />
                              Fin
                            </span>
                            <span className="font-semibold">{formatDate(ilumEndRec.eventDate)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-muted-foreground/50">
                            <span>Fin</span><span>fuera del rango</span>
                          </div>
                        )}
                        {ilumDays !== null && (
                          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                            <span className="text-muted-foreground">Duración</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{ilumDays} días</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedIlumCycleKey(null)}
                        className="w-full rounded-lg border border-border/60 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                      >
                        Limpiar selección
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Day detail */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/50 bg-muted/20 px-5 py-4">
              <h3 className="text-sm font-semibold">
                {selected
                  ? new Date(selected + "T00:00:00").toLocaleDateString("es-ES", {
                      weekday: "long", day: "numeric", month: "long",
                    })
                  : "Selecciona un día"}
              </h3>
              {selected && (
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {selectedEvents.length === 0
                    ? "Sin programaciones"
                    : `${selectedEvents.length} programación${selectedEvents.length !== 1 ? "es" : ""}`}
                </p>
              )}
            </div>

            <div className="px-5 py-4">
              {!selected && (
                <p className="py-4 text-center text-sm text-muted-foreground/60">
                  Haz clic en un día para ver el detalle.
                </p>
              )}
              {selected && selectedEvents.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin programaciones para este día.
                </p>
              )}
              {selected && selectedEvents.length > 0 && (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => {
                    const areaStyle    = getAreaStyle(ev.areaId);
                    const spAccent     = getSpTypeAccent(ev.spType);
                    const varietyColor = getVarietyColor(ev.variety);
                    return (
                      <div
                        key={i}
                        style={{ background: areaStyle.bg, borderTop: `1px solid ${areaStyle.border}`, borderRight: `1px solid ${areaStyle.border}`, borderBottom: `1px solid ${areaStyle.border}`, borderLeft: `4px solid ${spAccent}` }}
                        className="rounded-xl px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{ev.blockId}</p>
                          <span
                            style={{ background: varietyColor, color: "#fff", borderRadius: "4px", padding: "1px 5px", fontSize: "10px", fontWeight: 700 }}
                          >
                            {getVarietyAbbr(ev.variety)}
                          </span>
                        </div>
                        <dl className="mt-1.5 space-y-0.5 text-[12px] text-muted-foreground">
                          {ev.variety  && <div className="flex gap-1.5"><dt>Variedad:</dt><dd className="font-medium text-foreground">{ev.variety}</dd></div>}
                          {ev.spType   && <div className="flex gap-1.5"><dt>Tipo SP:</dt><dd className="font-medium text-foreground">{ev.spType}</dd></div>}
                          {ev.areaId   && <div className="flex gap-1.5"><dt>Área:</dt><dd className="font-medium text-foreground">{ev.areaId}</dd></div>}
                          {ev.fase     && <div className="flex gap-1.5"><dt>Fase:</dt><dd className="font-medium text-foreground">{ev.fase}</dd></div>}
                        </dl>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Month summary */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/50 bg-muted/20 px-5 py-4">
              <h3 className="text-sm font-semibold">Resumen del mes</h3>
            </div>
            <div className="px-5 py-4">
              {filtered.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground/60">
                  Sin registros para los filtros actuales.
                </p>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Total registros</dt>
                    <dd className="font-semibold">{filtered.length.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Días con actividad</dt>
                    <dd className="font-semibold">{byDate.size}</dd>
                  </div>
                  {areaOptions.length > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Áreas</dt>
                      <dd className="font-semibold">{areaOptions.length}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
