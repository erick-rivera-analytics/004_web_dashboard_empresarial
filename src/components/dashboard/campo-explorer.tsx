"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { MapPinned, Move, Sprout } from "lucide-react";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import type { ActiveLayer } from "@/components/dashboard/campo-map";
import type { CampoDashboardData, CampoMapFeature } from "@/lib/campo";

// ── Dynamic imports (Leaflet cannot SSR) ─────────────────────────────────────

const CampoLeafletMap = dynamic(
  () => import("@/components/dashboard/campo-map").then((m) => ({ default: m.CampoLeafletMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[82vh] min-h-[640px] w-full animate-pulse rounded-[26px] bg-muted/40" />
    ),
  },
);

const CampoLayerSwitcher = dynamic(
  () => import("@/components/dashboard/campo-map").then((m) => ({ default: m.CampoLayerSwitcher })),
  { ssr: false },
);

const CampoSubMapModal = dynamic(
  () =>
    import("@/components/dashboard/campo-sub-map-modal").then((m) => ({
      default: m.CampoSubMapModal,
    })),
  { ssr: false },
);

const CampoCycleSelectorModal = dynamic(
  () =>
    import("@/components/dashboard/campo-cycle-selector").then((m) => ({
      default: m.CampoCycleSelectorModal,
    })),
  { ssr: false },
);

// ── Types ─────────────────────────────────────────────────────────────────────

type SubMapState =
  | { mode: "valves"; bloquePad: string }
  | { mode: "beds"; bloquePad: string; valveId: string };

/** After user picks a cycle in the selector, open valves for that cycle */
type PendingValveNav = {
  cycleKey: string;
  valveId?: string; // if known, will auto-open valve detail
  bedId?:   string; // if set, open beds for this cycle instead
};

type AreaLabel = {
  name: string;
  blockCount: number;
  totalStems: number;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function buildAreaLabels(features: CampoMapFeature[]): AreaLabel[] {
  const grouped = new Map<string, { blockCount: number; totalStems: number }>();
  for (const feature of features) {
    const areaName = feature.row.area?.trim();
    if (!areaName) continue;
    const current = grouped.get(areaName) ?? { blockCount: 0, totalStems: 0 };
    current.blockCount += 1;
    current.totalStems += feature.row.totalStems;
    grouped.set(areaName, current);
  }
  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((a, b) => b.totalStems - a.totalStems);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CampoExplorer({ initialData }: { initialData: CampoDashboardData }) {
  const [activeLayer,      setActiveLayer]      = useState<ActiveLayer>("none");
  const [selectedFeature,  setSelectedFeature]  = useState<CampoMapFeature | null>(null);
  const [subMap,           setSubMap]           = useState<SubMapState | null>(null);

  // Cycle selector: shown after "Ver detalle válvula" from sub-map
  const [cycleSelector,    setCycleSelector]    = useState<{
    bloquePad: string;
    contextLabel: string;
    valveId?: string;
  } | null>(null);

  // Pending navigation: after user picks a cycle, auto-open valves in modal
  const [pendingValveNav,  setPendingValveNav]  = useState<PendingValveNav | null>(null);

  const blockModal  = useBlockProfileModal(selectedFeature?.row ?? null);
  const areaLabels  = useMemo(() => buildAreaLabels(initialData.features), [initialData.features]);

  const blockDataMap = useMemo(
    () =>
      Object.fromEntries(
        initialData.features.map((f) => [
          f.block,
          { stemsIntensity: f.stemsIntensity, hasData: f.hasData },
        ]),
      ),
    [initialData.features],
  );

  // Area name per block for map labels (e.g. { "317": "MH1" })
  const areaByBlock = useMemo(
    () =>
      Object.fromEntries(
        initialData.features
          .filter((f) => f.row.area)
          .map((f) => [f.block, f.row.area as string]),
      ),
    [initialData.features],
  );

  // ── Effect: execute pending valve/bed navigation once feature is set ─────────
  useEffect(() => {
    if (!pendingValveNav || !selectedFeature) return;
    const { cycleKey, valveId, bedId } = pendingValveNav;
    const timer = window.setTimeout(() => {
      if (bedId) {
        // Bed flow: open beds panel for the selected cycle
        blockModal.openBeds(cycleKey);
      } else {
        // Valve flow: open valve list for the selected cycle
        blockModal.openValves(cycleKey);
        if (valveId) {
          window.setTimeout(() => {
            blockModal.openValve(cycleKey, valveId);
          }, 400);
        }
      }
      setPendingValveNav(null);
    }, 120);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingValveNav, selectedFeature]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleFicha(bloquePad: string) {
    const feature = initialData.features.find((f) => f.block === bloquePad) ?? null;
    setSelectedFeature(feature);
  }

  function handleValves(bloquePad: string) {
    setSubMap({ mode: "valves", bloquePad });
  }

  /** Called from valve sub-map when user clicks "Ver detalle válvula" */
  function handleValveDetail(valveId: string, bloquePad: string) {
    const feature = initialData.features.find((f) => f.block === bloquePad) ?? null;
    setSelectedFeature(feature);
    setSubMap(null);
    setCycleSelector({
      bloquePad,
      contextLabel: `Válvula ${valveId.split("-").pop()} — Bloque ${bloquePad}`,
      valveId,
    });
  }

  function handleBedMap(valveId: string, bloquePad: string) {
    setSubMap({ mode: "beds", bloquePad, valveId });
  }

  /** Called from bed sub-map when user picks "Ver info de cama" */
  function handleBedDetail(bedId: string, bloquePad: string, cycleKey: string) {
    const feature = initialData.features.find((f) => f.block === bloquePad) ?? null;
    setSelectedFeature(feature);
    setSubMap(null);
    setPendingValveNav({ cycleKey, bedId });
  }

  /** Called when user picks a cycle from the cycle selector (valve flow) */
  function handleCycleSelected(cycleKey: string) {
    const valveId = cycleSelector?.valveId;
    setCycleSelector(null);
    setPendingValveNav({ cycleKey, valveId });
  }

  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Vista espacial · bloques, válvulas y camas
              </Badge>
              <CardTitle className="text-2xl">Mapa</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {initialData.summary.blockCount} bloques
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {initialData.summary.matchedBlocks} con match
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {formatNumber(initialData.summary.totalVisibleStems)} tallos visibles
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Area labels */}
          <div className="rounded-[28px] border border-border/70 bg-background/72 p-4">
            <div className="flex flex-wrap items-start gap-3">
              {areaLabels.map((label) => (
                <div
                  key={label.name}
                  className="rounded-2xl border border-border/70 bg-card/88 px-4 py-3 shadow-sm"
                >
                  <p className="text-sm font-semibold">{label.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {label.blockCount} bloques · {formatNumber(label.totalStems)} tallos
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Map container */}
          <div className="rounded-[30px] border border-border/70 bg-background/72 p-3">
            {/* Layer switcher bar */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <CampoLayerSwitcher active={activeLayer} onChange={setActiveLayer} />
              <p className="text-xs text-muted-foreground">
                Click en un bloque → ficha o mapa de válvulas
              </p>
            </div>

            <CampoLeafletMap
              blockDataMap={blockDataMap}
              areaByBlock={areaByBlock}
              activeLayer={activeLayer}
              onFicha={handleFicha}
              onValves={handleValves}
              className="h-[82vh] min-h-[640px] border border-border/70"
            />
          </div>

          {/* Bottom info cards */}
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <MapPinned className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Navegación</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Click en un bloque para ver opciones. Zoom y pan con scroll y drag.
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <Move className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Áreas identificadas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Resumen agregado del último ciclo por bloque.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {areaLabels.slice(0, 10).map((label) => (
                  <Badge key={label.name} variant="outline" className="rounded-full px-3 py-1">
                    {label.name}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <Sprout className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Capas del dron</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Índices de vegetación — ejecuta{" "}
                      <code className="text-xs">node scripts/convert-rasters.mjs</code> para activar.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(["ndvi", "ndre", "lci"] as const).map((layer) => (
                  <Button
                    key={layer}
                    variant={activeLayer === layer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveLayer(activeLayer === layer ? "none" : layer)}
                  >
                    {layer.toUpperCase()}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* ── Block ficha modal (existing, unchanged) ─────────────────────────── */}
      <BlockProfileModal
        row={selectedFeature?.row ?? null}
        data={blockModal.blockData}
        loading={blockModal.blockLoading}
        error={blockModal.blockError}
        selectedCycleKey={blockModal.selectedCycleKey}
        bedData={blockModal.bedData}
        bedLoading={blockModal.bedLoading}
        bedError={blockModal.bedError}
        selectedValveCycleKey={blockModal.selectedValveCycleKey}
        valvesData={blockModal.valvesData}
        valvesLoading={blockModal.valvesLoading}
        valvesError={blockModal.valvesError}
        selectedValve={blockModal.selectedValve}
        valveData={blockModal.valveData}
        valveLoading={blockModal.valveLoading}
        valveError={blockModal.valveError}
        selectedCurveCycleKey={blockModal.selectedCurveCycleKey}
        curveData={blockModal.curveData}
        curveLoading={blockModal.curveLoading}
        curveError={blockModal.curveError}
        selectedMortalityCurve={blockModal.selectedMortalityCurve}
        mortalityCurveData={blockModal.mortalityCurveData}
        mortalityCurveLoading={blockModal.mortalityCurveLoading}
        mortalityCurveError={blockModal.mortalityCurveError}
        onOpenBeds={blockModal.openBeds}
        onCloseBeds={blockModal.closeBeds}
        onOpenValves={blockModal.openValves}
        onCloseValves={blockModal.closeValves}
        onOpenValve={blockModal.openValve}
        onOpenCurve={blockModal.openCurve}
        onCloseCurve={blockModal.closeCurve}
        onOpenCycleMortalityCurve={blockModal.openCycleMortalityCurve}
        onOpenValveMortalityCurve={blockModal.openValveMortalityCurve}
        onOpenBedMortalityCurve={blockModal.openBedMortalityCurve}
        onCloseMortalityCurve={blockModal.closeMortalityCurve}
        onClose={() => setSelectedFeature(null)}
      />

      {/* ── Valve / bed sub-map modal ────────────────────────────────────────── */}
      {subMap && (
        <CampoSubMapModal
          bloquePad={subMap.bloquePad}
          mode={subMap.mode}
          valveId={subMap.mode === "beds" ? subMap.valveId : undefined}
          onValveDetail={handleValveDetail}
          onBedMap={handleBedMap}
          onBedDetail={handleBedDetail}
          onClose={() => setSubMap(null)}
        />
      )}

      {/* ── Cycle selector (from valve map drill-down) ───────────────────────── */}
      {cycleSelector && (
        <CampoCycleSelectorModal
          bloquePad={cycleSelector.bloquePad}
          contextLabel={cycleSelector.contextLabel}
          onSelect={handleCycleSelected}
          onClose={() => setCycleSelector(null)}
        />
      )}
    </div>
  );
}
