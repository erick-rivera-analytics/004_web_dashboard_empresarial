"use client";

import { X, Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CycleOption = {
  cycleKey:         string;
  isCurrent:        boolean;
  isValid:          boolean;
  variety:          string | null;
  spType:           string | null;
  spDate:           string | null;
  harvestStartDate: string | null;
};

type Props = {
  bloquePad:     string;
  contextLabel?: string;
  onSelect:      (cycleKey: string) => void;
  onClose:       () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusLabel(cycle: CycleOption): { label: string; cls: string } {
  if (cycle.isCurrent) {
    return { label: "Activo",      cls: "bg-emerald-100 text-emerald-700" };
  }
  if (cycle.isValid) {
    return { label: "Planificado", cls: "bg-blue-100 text-blue-700" };
  }
  return { label: "Cerrado",       cls: "bg-slate-100 text-slate-500" };
}

/** Extract a readable short label from the cycleKey */
function cycleLabel(key: string) {
  return key;   // show full key — matches the screenshot style
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CampoCycleSelectorModal({
  bloquePad,
  contextLabel,
  onSelect,
  onClose,
}: Props) {
  const [cycles,  setCycles]  = useState<CycleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/fenograma/block/${encodeURIComponent(bloquePad)}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar ciclos");
        return r.json();
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any) => {
        const raw: CycleOption[] = (data?.cycles ?? []).map((c: any) => ({
          cycleKey:         String(c.cycleKey ?? ""),
          isCurrent:        Boolean(c.isCurrent),
          isValid:          Boolean(c.isValid),
          variety:          c.variety ?? null,
          spType:           c.spType  ?? null,
          spDate:           c.spDate  ?? null,
          harvestStartDate: c.harvestStartDate ?? null,
        }));
        // Sort: active → valid → closed
        raw.sort((a, b) => {
          if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
          if (a.isValid   !== b.isValid)   return a.isValid   ? -1 : 1;
          return 0;
        });
        setCycles(raw);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error");
        setLoading(false);
      });
  }, [bloquePad]);

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cycle-sel-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — compact, list-style like a dropdown */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 dark:bg-card">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {contextLabel ?? `Bloque ${bloquePad}`}
            </p>
            <h2 id="cycle-sel-title" className="text-sm font-semibold text-foreground">
              Selecciona un ciclo
            </h2>
          </div>
          <Button variant="ghost" size="icon" className="size-7 rounded-full" onClick={onClose} aria-label="Cerrar">
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        </div>

        {/* List */}
        <div className="max-h-[55vh] overflow-y-auto divide-y divide-border/40">
          {loading && (
            <div className="flex flex-col divide-y divide-border/30">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="ml-auto h-5 w-16 animate-pulse rounded-full bg-muted" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="px-4 py-6 text-center text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && cycles.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin ciclos para este bloque.
            </p>
          )}

          {!loading && !error && cycles.map((cycle, idx) => {
            const status = getStatusLabel(cycle);
            const isFirst = idx === 0 && cycle.isCurrent;
            return (
              <button
                key={cycle.cycleKey}
                onClick={() => onSelect(cycle.cycleKey)}
                className={cn(
                  "group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  isFirst && "bg-emerald-50/60 dark:bg-emerald-950/20",
                )}
              >
                {/* Active indicator dot */}
                <span
                  className={cn(
                    "mt-px size-2 shrink-0 rounded-full",
                    cycle.isCurrent
                      ? "bg-emerald-500"
                      : cycle.isValid
                        ? "bg-blue-400"
                        : "bg-slate-300",
                  )}
                />

                {/* Cycle key — full, monospace style */}
                <span className={cn(
                  "flex-1 truncate font-mono text-[12.5px] leading-snug",
                  cycle.isCurrent
                    ? "text-slate-900 dark:text-slate-100"
                    : cycle.isValid
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400 dark:text-slate-500",
                )}>
                  {cycleLabel(cycle.cycleKey)}
                </span>

                {/* Status badge */}
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  status.cls,
                )}>
                  {status.label}
                </span>

                {/* Hover arrow */}
                <Check className={cn(
                  "size-3.5 shrink-0 text-emerald-500 transition-opacity",
                  cycle.isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                )} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            {cycles.length} ciclo{cycles.length !== 1 ? "s" : ""} · Bloque {bloquePad}
          </p>
        </div>
      </div>
    </div>
  );
}
