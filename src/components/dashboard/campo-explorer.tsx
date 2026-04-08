"use client";

import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";
import { MapPinned, Move, Sprout } from "lucide-react";
import useSWRImmutable from "swr/immutable";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import { fetchJson } from "@/lib/fetch-json";
import type { ActiveLayer, RasterBounds } from "@/components/dashboard/campo-map";
import type { CampoDashboardData, CampoMapFeature } from "@/lib/campo";

const DEFAULT_RASTER_OPACITY = 0.9;

const CampoLeafletMap = dynamic(
  () => import("@/components/dashboard/campo-map").then((module) => ({ default: module.CampoLeafletMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[82vh] min-h-[640px] w-full animate-pulse rounded-[26px] bg-muted/40" />
    ),
  },
);

const CampoRasterControls = dynamic(
  () => import("@/components/dashboard/campo-map").then((module) => ({ default: module.CampoRasterControls })),
  { ssr: false },
);

const CampoSubMapModal = dynamic(
  () =>
    import("@/components/dashboard/campo-sub-map-modal").then((module) => ({
      default: module.CampoSubMapModal,
    })),
  { ssr: false },
);

const CampoCycleSelectorModal = dynamic(
  () =>
    import("@/components/dashboard/campo-cycle-selector").then((module) => ({
      default: module.CampoCycleSelectorModal,
    })),
  { ssr: false },
);

type CampoMapAssets = {
  geoData: FeatureCollection;
  rasterBounds: RasterBounds;
};

type SubMapState =
  | { mode: "valves"; bloquePad: string }
  | { mode: "beds"; bloquePad: string; valveId: string };

type PendingValveNav = {
  cycleKey: string;
  valveId?: string;
  bedId?: string;
};

type AreaLabel = {
  name: string;
  blockCount: number;
  totalStems: number;
};

function normalizeBlockKey(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  if (!/^\d+$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return String(Number(trimmed));
}

function buildFeatureLookup(features: CampoMapFeature[]) {
  const lookup = new Map<string, CampoMapFeature>();

  for (const feature of features) {
    const rawKey = feature.block.trim();
    const normalizedKey = normalizeBlockKey(rawKey);

    if (rawKey && !lookup.has(rawKey)) {
      lookup.set(rawKey, feature);
    }

    if (normalizedKey && !lookup.has(normalizedKey)) {
      lookup.set(normalizedKey, feature);
    }
  }

  return lookup;
}

function buildBlockLookupRecord<T>(
  features: CampoMapFeature[],
  getValue: (feature: CampoMapFeature) => T | null,
) {
  const lookup = new Map<string, T>();

  for (const feature of features) {
    const value = getValue(feature);

    if (value === null) {
      continue;
    }

    const rawKey = feature.block.trim();
    const normalizedKey = normalizeBlockKey(rawKey);

    if (rawKey && !lookup.has(rawKey)) {
      lookup.set(rawKey, value);
    }

    if (normalizedKey && !lookup.has(normalizedKey)) {
      lookup.set(normalizedKey, value);
    }
  }

  return Object.fromEntries(lookup);
}

async function loadCampoMapAssets(
  [geoUrl, boundsUrl]: readonly [string, string],
): Promise<CampoMapAssets> {
  const [geoData, rasterBounds] = await Promise.all([
    fetchJson<FeatureCollection>(geoUrl, "No se pudo cargar la geometría del mapa."),
    fetchJson<RasterBounds>(boundsUrl, "No se pudieron cargar los límites raster.").catch(
      () => ({} as RasterBounds),
    ),
  ]);

  return {
    geoData,
    rasterBounds,
  };
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function buildAreaLabels(features: CampoMapFeature[]): AreaLabel[] {
  const grouped = new Map<string, { blockCount: number; totalStems: number }>();

  for (const feature of features) {
    const areaName = feature.row.area?.trim();

    if (!areaName) {
      continue;
    }

    const current = grouped.get(areaName) ?? { blockCount: 0, totalStems: 0 };
    current.blockCount += 1;
    current.totalStems += feature.row.totalStems;
    grouped.set(areaName, current);
  }

  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, ...value }))
    .sort((first, second) => second.totalStems - first.totalStems);
}

export function CampoExplorer({ initialData }: { initialData: CampoDashboardData }) {
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("none");
  const [rasterOpacity, setRasterOpacity] = useState(DEFAULT_RASTER_OPACITY);
  const [selectedFeature, setSelectedFeature] = useState<CampoMapFeature | null>(null);
  const [subMap, setSubMap] = useState<SubMapState | null>(null);
  const [cycleSelector, setCycleSelector] = useState<{
    bloquePad: string;
    contextLabel: string;
    valveId?: string;
  } | null>(null);
  const [pendingValveNav, setPendingValveNav] = useState<PendingValveNav | null>(null);
  const [directPanelMode, setDirectPanelMode] = useState(false);

  const {
    data: mapAssets,
    error: mapAssetsError,
    isLoading: mapAssetsLoading,
  } = useSWRImmutable(
    ["/data/campo-geo.json", "/rasters/bounds.json"] as const,
    loadCampoMapAssets,
    {
      revalidateOnFocus: false,
    },
  );
  const blockModal = useBlockProfileModal(selectedFeature?.row ?? null);
  const areaLabels = useMemo(() => buildAreaLabels(initialData.features), [initialData.features]);
  const featureByBlock = useMemo(
    () => buildFeatureLookup(initialData.features),
    [initialData.features],
  );
  const blockDataMap = useMemo(
    () => buildBlockLookupRecord(initialData.features, (feature) => ({
      stemsIntensity: feature.stemsIntensity,
      hasData: feature.hasData,
    })),
    [initialData.features],
  );
  const areaByBlock = useMemo(
    () =>
      buildBlockLookupRecord(
        initialData.features,
        (feature) => feature.row.area?.trim() || null,
      ),
    [initialData.features],
  );
  const mapAssetsErrorMessage = mapAssetsError instanceof Error
    ? mapAssetsError.message
    : mapAssetsError
      ? "No se pudieron cargar los assets del mapa."
      : null;

  useEffect(() => {
    if (!pendingValveNav || !selectedFeature) {
      return;
    }

    const { cycleKey, valveId, bedId } = pendingValveNav;
    const timer = window.setTimeout(() => {
      if (bedId) {
        blockModal.openBeds(cycleKey);
      } else if (valveId) {
        blockModal.openValves(cycleKey);
        blockModal.openValve(cycleKey, valveId);
      } else {
        blockModal.openValves(cycleKey);
      }

      setPendingValveNav(null);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [blockModal, pendingValveNav, selectedFeature]);

  function getFeatureByBlock(bloquePad: string) {
    return featureByBlock.get(bloquePad)
      ?? featureByBlock.get(normalizeBlockKey(bloquePad))
      ?? null;
  }

  function handleFicha(bloquePad: string) {
    setDirectPanelMode(false);
    setSelectedFeature(getFeatureByBlock(bloquePad));
  }

  function handleValves(bloquePad: string) {
    setSubMap({ mode: "valves", bloquePad });
  }

  function handleValveDetail(valveId: string, bloquePad: string) {
    setSubMap(null);
    setCycleSelector({
      bloquePad,
      contextLabel: `Válvula ${valveId.split("-").pop()} · Bloque ${bloquePad}`,
      valveId,
    });
  }

  function handleBedMap(valveId: string, bloquePad: string) {
    setSubMap({ mode: "beds", bloquePad, valveId });
  }

  function handleBedDetail(bedId: string, bloquePad: string, cycleKey: string) {
    setSelectedFeature(getFeatureByBlock(bloquePad));
    setSubMap(null);
    setDirectPanelMode(true);
    setPendingValveNav({ cycleKey, bedId });
  }

  function handleCycleSelected(cycleKey: string) {
    const { valveId, bloquePad } = cycleSelector!;
    setSelectedFeature(getFeatureByBlock(bloquePad));
    setCycleSelector(null);
    setDirectPanelMode(true);
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

          <div className="rounded-[30px] border border-border/70 bg-background/72 p-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-1">
              <CampoRasterControls
                active={activeLayer}
                opacity={rasterOpacity}
                onChange={setActiveLayer}
                onOpacityChange={setRasterOpacity}
              />
              <div className="space-y-1 text-right">
                <p className="text-xs font-medium text-foreground">
                  {activeLayer === "none"
                    ? "Modo operativo activo"
                    : `Modo agronómico · ${activeLayer.toUpperCase()}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click en un bloque {"->"} ficha o mapa de valvulas. En submapa:
                  {" "}valvula {"->"} ficha o mapa de camas.
                </p>
              </div>
            </div>

            <CampoLeafletMap
              geoData={mapAssets?.geoData ?? null}
              rasterBounds={mapAssets?.rasterBounds ?? {}}
              assetsLoading={mapAssetsLoading}
              assetsError={mapAssetsErrorMessage}
              blockDataMap={blockDataMap}
              areaByBlock={areaByBlock}
              activeLayer={activeLayer}
              rasterOpacity={rasterOpacity}
              onFicha={handleFicha}
              onValves={handleValves}
              className="h-[82vh] min-h-[640px] border border-border/70"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-slate-900/10 dark:bg-slate-900/20 p-3 text-slate-700 dark:text-white">
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
                  <div className="rounded-full bg-slate-900/10 dark:bg-slate-900/20 p-3 text-slate-700 dark:text-white">
                    <Move className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Áreas identificadas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Resumen agregado de bloques renderizables del mapa actual.
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
                  <div className="rounded-full bg-slate-900/10 dark:bg-slate-900/20 p-3 text-slate-700 dark:text-white">
                    <Sprout className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Capas del dron</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      PNG clasificado + bounds listos para Leaflet. Ajusta capa y opacidad desde
                      la barra superior.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(["ndvi", "ndre", "lci"] as const).map((layer) => (
                    <Badge
                      key={layer}
                      variant={activeLayer === layer ? "default" : "outline"}
                      className="rounded-full px-3 py-1"
                    >
                      {layer.toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Regenera assets con <code className="text-[11px]">node scripts/convert-rasters.mjs</code>{" "}
                  y <code className="text-[11px]">node scripts/convert-shapefile.mjs</code>.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

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
        directMode={directPanelMode}
        onClose={() => {
          setSelectedFeature(null);
          setDirectPanelMode(false);
        }}
      />

      {subMap && (
        <CampoSubMapModal
          geoData={mapAssets?.geoData ?? null}
          rasterBounds={mapAssets?.rasterBounds ?? {}}
          assetsLoading={mapAssetsLoading}
          assetsError={mapAssetsErrorMessage}
          bloquePad={subMap.bloquePad}
          mode={subMap.mode}
          valveId={subMap.mode === "beds" ? subMap.valveId : undefined}
          activeLayer={activeLayer}
          rasterOpacity={rasterOpacity}
          onLayerChange={setActiveLayer}
          onRasterOpacityChange={setRasterOpacity}
          onValveDetail={handleValveDetail}
          onBedMap={handleBedMap}
          onBedDetail={handleBedDetail}
          onClose={() => setSubMap(null)}
        />
      )}

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
