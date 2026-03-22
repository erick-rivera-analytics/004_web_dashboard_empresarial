"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProcessViewerOverlayProps = {
  title: string;
  subtitle?: string;
  assetPath: string;
  onClose: () => void;
};

type ViewerApi = {
  destroy: () => void;
  importXML: (xml: string) => Promise<unknown>;
  get(service: "canvas"): {
    zoom: (level?: number | "fit-viewport", center?: "auto") => number;
  };
};

/**
 * Componente reusable para mostrar un BPMN en ventana flotante.
 * Sigue el patrón técnico de balanzas-process-viewer.tsx pero sin overlays.
 *
 * Punto de conexión del BPMN:
 * - El asset se espera como archivo estático en `public/processes/`.
 * - Para campo, crear `public/processes/campo-macroproceso-es.bpmn`
 *   y pasar la ruta como prop `assetPath`.
 * - Mientras no exista el asset, el componente muestra un mensaje informativo.
 */
export function ProcessViewerOverlay({
  title,
  subtitle,
  assetPath,
  onClose,
}: ProcessViewerOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ViewerApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      if (!containerRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [{ default: NavigatedViewer }, response] = await Promise.all([
          import("bpmn-js/lib/NavigatedViewer"),
          fetch(assetPath),
        ]);

        if (!response.ok) {
          throw new Error(
            "No se pudo cargar el diagrama BPMN. Verifica que el archivo existe en la ruta configurada.",
          );
        }

        const xml = await response.text();

        if (cancelled || !containerRef.current) {
          return;
        }

        viewerRef.current?.destroy();
        const viewer = new NavigatedViewer({
          container: containerRef.current,
        }) as ViewerApi;

        await viewer.importXML(xml);

        const canvas = viewer.get("canvas");
        canvas.zoom("fit-viewport", "auto");
        viewerRef.current = viewer;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo preparar el visor del proceso.",
          );
          setLoading(false);
        }
      }
    }

    loadViewer();

    return () => {
      cancelled = true;
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [assetPath]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function zoomBy(step: number) {
    if (!viewerRef.current) {
      return;
    }

    const canvas = viewerRef.current.get("canvas");
    const currentZoom = canvas.zoom();
    canvas.zoom(Math.max(0.25, Math.min(2.4, currentZoom + step)));
  }

  function fitViewport() {
    if (!viewerRef.current) {
      return;
    }

    const canvas = viewerRef.current.get("canvas");
    canvas.zoom("fit-viewport", "auto");
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/52 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-transparent p-0"
        onClick={onClose}
        aria-label="Cerrar visor de proceso"
      />
      <div className="starter-panel relative z-10 flex max-h-[90vh] w-[min(1480px,calc(100vw-1.5rem))] min-w-0 flex-col overflow-hidden border border-border/70 bg-card/97 shadow-2xl shadow-slate-950/24 sm:w-[min(1480px,calc(100vw-2rem))]">
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-5 sm:px-6">
          <div className="min-w-0 space-y-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Macroproceso
            </Badge>
            <div className="min-w-0">
              <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
              {subtitle ? (
                <p className="break-words text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/88 p-1 shadow-sm">
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => zoomBy(-0.1)}>
                <Minus className="size-4" />
                <span className="sr-only">Reducir zoom</span>
              </Button>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={fitViewport}>
                <Maximize2 className="size-4" />
                <span className="sr-only">Ajustar al viewport</span>
              </Button>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => zoomBy(0.1)}>
                <Plus className="size-4" />
                <span className="sr-only">Aumentar zoom</span>
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto px-4 py-5 sm:px-6">
          <div className="relative overflow-auto rounded-[24px] border border-border/70 bg-white/90 dark:bg-slate-950/40">
            <div
              ref={containerRef}
              className={cn(
                "h-[680px] min-h-[680px] w-full min-w-[1000px]",
                (loading || error) && "opacity-0",
              )}
            />

            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Cargando diagrama del macroproceso...
              </div>
            ) : null}

            {error ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
