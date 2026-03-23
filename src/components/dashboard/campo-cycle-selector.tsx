"use client";

import { X, Leaf, CalendarDays, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Cycle = {
  cycleKey: string;
  isCurrent: boolean;
  isValid: boolean;
  variety: string | null;
  spType: string | null;
  spDate: string | null;
  harvestStartDate: string | null;
};

type Props = {
  /** Parent block to fetch cycles for */
  bloquePad: string;
  /** Display name context (e.g. "Válvula A") */
  contextLabel?: string;
  /** Called when user selects a cycle */
  onSelect: (cycleKey: string) => void;
  onClose: () => void;
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CampoCycleSelectorModal({ bloquePad, contextLabel, onSelect, onClose }: Props) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/fenograma/block/${encodeURIComponent(bloquePad)}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar ciclos");
        return r.json();
      })
      .then((data) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = data?.cycles as any[] ?? [];
        const mapped: Cycle[] = raw.map((c) => ({
          cycleKey:         c.cycleKey,
          isCurrent:        Boolean(c.isCurrent),
          isValid:          Boolean(c.isValid),
          variety:          c.variety ?? null,
          spType:           c.spType ?? null,
          spDate:           c.spDate ?? null,
          harvestStartDate: c.harvestStartDate ?? null,
        }));
        // Sort: current first, then valid, then history
        mapped.sort((a, b) => {
          if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
          if (a.isValid !== b.isValid) return a.isValid ? -1 : 1;
          return 0;
        });
        setCycles(mapped);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error");
        setLoading(false);
      });
  }, [bloquePad]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cycle-selector-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[24px] border border-border/70 bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {contextLabel ?? `Bloque ${bloquePad}`}
            </p>
            <h2 id="cycle-selector-title" className="mt-0.5 text-base font-semibold">
              Selecciona un ciclo
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-3">
          {loading && (
            <div className="flex flex-col gap-2 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-muted/60"
                />
              ))}
            </div>
          )}

          {error && (
            <p className="p-4 text-center text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && cycles.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No se encontraron ciclos para este bloque.
            </p>
          )}

          {!loading && !error && cycles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {cycles.map((cycle) => (
                <button
                  key={cycle.cycleKey}
                  onClick={() => onSelect(cycle.cycleKey)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all hover:shadow-sm",
                    cycle.isCurrent
                      ? "border-primary/40 bg-primary/6 hover:bg-primary/10"
                      : cycle.isValid
                        ? "border-border/70 bg-background/72 hover:bg-card"
                        : "border-border/40 bg-background/40 hover:bg-card/80",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1.5",
                        cycle.isCurrent
                          ? "bg-primary/16 text-primary"
                          : cycle.isValid
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/50 text-muted-foreground/60",
                      )}
                    >
                      <Leaf className="size-3" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {cycle.variety ?? "Sin variedad"}
                        </span>
                        {cycle.isCurrent && (
                          <span className="rounded-full bg-primary/16 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Activo
                          </span>
                        )}
                        {!cycle.isCurrent && cycle.isValid && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Vigente
                          </span>
                        )}
                      </div>
                      {cycle.spType && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{cycle.spType}</p>
                      )}
                      {cycle.spDate && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" aria-hidden="true" />
                          <span>Siembra: {formatDate(cycle.spDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/70 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Bloque {bloquePad} · {cycles.length} ciclos encontrados
          </p>
        </div>
      </div>
    </div>
  );
}
