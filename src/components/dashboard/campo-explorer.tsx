"use client";

import { MapPinned, Move, Plus, RefreshCcw, Sprout, ZoomOut } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import { cn } from "@/lib/utils";
import type { CampoDashboardData, CampoMapFeature } from "@/lib/campo";

type HoverPreview = {
  feature: CampoMapFeature;
  x: number;
  y: number;
};

type ViewportState = {
  scale: number;
  x: number;
  y: number;
};

type AreaLabel = {
  name: string;
  x: number;
  y: number;
  blockCount: number;
  totalStems: number;
};

const MIN_MAP_SCALE = 1;
const MAX_MAP_SCALE = 3.4;
const DEFAULT_VIEWPORT: ViewportState = {
  scale: 1,
  x: 0,
  y: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function getFeatureFill(
  feature: CampoMapFeature,
  selectedBlock: string | null,
  hoveredBlock: string | null,
) {
  if (selectedBlock === feature.block) {
    return "hsl(150 60% 42%)";
  }

  if (hoveredBlock === feature.block) {
    return "hsl(152 56% 57%)";
  }

  if (!feature.hasData) {
    return "hsl(210 18% 84%)";
  }

  const lightness = 84 - (feature.stemsIntensity * 34);
  return `hsl(150 44% ${lightness}%)`;
}

function buildPreviewLines(feature: CampoMapFeature) {
  if (!feature.hasData) {
    return {
      area: "Sin area actual",
      stems: "Sin ciclo vigente",
    };
  }

  return {
    area: feature.row.area || "Sin area actual",
    stems: formatNumber(feature.row.totalStems),
  };
}

function clampViewport(
  viewport: ViewportState,
  width: number,
  height: number,
) {
  const scale = clamp(viewport.scale, MIN_MAP_SCALE, MAX_MAP_SCALE);
  const overflowX = Math.max(0, ((scale - 1) * width) / 2);
  const overflowY = Math.max(0, ((scale - 1) * height) / 2);

  return {
    scale,
    x: clamp(viewport.x, -overflowX - 80, overflowX + 80),
    y: clamp(viewport.y, -overflowY - 80, overflowY + 80),
  };
}

function buildMapTransform(viewport: ViewportState, width: number, height: number) {
  const centerX = width / 2;
  const centerY = height / 2;

  return `translate(${viewport.x} ${viewport.y}) translate(${centerX} ${centerY}) scale(${viewport.scale}) translate(${-centerX} ${-centerY})`;
}

function buildAreaLabels(features: CampoMapFeature[]): AreaLabel[] {
  const grouped = new Map<string, {
    sumX: number;
    sumY: number;
    blockCount: number;
    totalStems: number;
  }>();

  for (const feature of features) {
    const areaName = feature.row.area?.trim();

    if (!areaName) {
      continue;
    }

    const currentGroup = grouped.get(areaName) ?? {
      sumX: 0,
      sumY: 0,
      blockCount: 0,
      totalStems: 0,
    };

    currentGroup.sumX += feature.center[0];
    currentGroup.sumY += feature.center[1];
    currentGroup.blockCount += 1;
    currentGroup.totalStems += feature.row.totalStems;
    grouped.set(areaName, currentGroup);
  }

  return Array.from(grouped.entries())
    .map(([name, value]) => ({
      name,
      x: value.sumX / value.blockCount,
      y: value.sumY / value.blockCount,
      blockCount: value.blockCount,
      totalStems: value.totalStems,
    }))
    .sort((left, right) => right.totalStems - left.totalStems);
}

export function CampoExplorer({ initialData }: { initialData: CampoDashboardData }) {
  const [selectedFeature, setSelectedFeature] = useState<CampoMapFeature | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const blockModal = useBlockProfileModal(selectedFeature?.row ?? null);
  const areaLabels = useMemo(
    () => buildAreaLabels(initialData.features),
    [initialData.features],
  );

  function updateHoverPreview(feature: CampoMapFeature, clientX: number, clientY: number) {
    const container = mapRef.current;

    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - bounds.left + 18, 18), bounds.width - 320);
    const y = Math.min(Math.max(clientY - bounds.top + 18, 18), bounds.height - 150);

    setHoverPreview({
      feature,
      x,
      y,
    });
  }

  function updateViewport(nextViewport: ViewportState) {
    setViewport(clampViewport(nextViewport, initialData.map.width, initialData.map.height));
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const nextScale = viewport.scale + (event.deltaY < 0 ? 0.18 : -0.18);
    updateViewport({ ...viewport, scale: nextScale });
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragStateRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: viewport.x,
      y: viewport.y,
      moved: false,
    };
    setIsDragging(true);
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current;

    if (!dragState) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = (event.clientX - dragState.clientX) * (initialData.map.width / bounds.width);
    const deltaY = (event.clientY - dragState.clientY) * (initialData.map.height / bounds.height);
    const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;

    dragState.moved = dragState.moved || moved;

    if (dragState.moved) {
      suppressClickRef.current = true;
      setHoverPreview(null);
      updateViewport({
        ...viewport,
        x: dragState.x + deltaX,
        y: dragState.y + deltaY,
      });
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    if (dragStateRef.current?.moved) {
      suppressClickRef.current = true;
    }

    dragStateRef.current = null;
    setIsDragging(false);
    (event.currentTarget as SVGSVGElement).releasePointerCapture(event.pointerId);
  }

  const selectedPreview = selectedFeature ? buildPreviewLines(selectedFeature) : null;
  const mapTransform = buildMapTransform(viewport, initialData.map.width, initialData.map.height);

  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Vista espacial por parent_block
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
          <div className="rounded-[30px] border border-border/70 bg-background/72 p-3">
            <div
              ref={mapRef}
              className="relative overflow-hidden rounded-[26px] border border-border/70 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_38%),linear-gradient(180deg,rgba(250,252,252,0.98),rgba(240,247,244,0.96))]"
            >
              <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                <Badge className="rounded-full px-3 py-1">
                  Arrastra para navegar
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Zoom {Math.round(viewport.scale * 100)}%
                </Badge>
              </div>

              <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-2xl border border-border/70 bg-background/88 p-1 shadow-lg backdrop-blur">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => updateViewport({ ...viewport, scale: viewport.scale - 0.2 })}
                  title="Reducir zoom"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => updateViewport({ ...viewport, scale: viewport.scale + 0.2 })}
                  title="Aumentar zoom"
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  onClick={() => setViewport(DEFAULT_VIEWPORT)}
                  title="Reencuadrar mapa"
                >
                  <RefreshCcw className="size-4" />
                </Button>
              </div>

              <svg
                viewBox={`0 0 ${initialData.map.width} ${initialData.map.height}`}
                className={cn(
                  "h-[76vh] min-h-[560px] w-full touch-none",
                  isDragging ? "cursor-grabbing" : "cursor-grab",
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                  dragStateRef.current = null;
                  setIsDragging(false);
                }}
                onWheel={handleWheel}
              >
                <g transform={mapTransform}>
                  {initialData.features.map((feature) => {
                    const preview = buildPreviewLines(feature);
                    const isSelected = selectedFeature?.block === feature.block;
                    const isHovered = hoverPreview?.feature.block === feature.block;

                    return (
                      <path
                        key={feature.block}
                        d={feature.path}
                        fill={getFeatureFill(feature, selectedFeature?.block ?? null, hoverPreview?.feature.block ?? null)}
                        stroke={isSelected ? "hsl(152 62% 22%)" : isHovered ? "hsl(153 56% 28%)" : "rgba(15,23,42,0.24)"}
                        strokeWidth={isSelected ? 3.2 : isHovered ? 2.4 : 1.2}
                        className="transition-all duration-150"
                        onClick={() => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false;
                            return;
                          }

                          setSelectedFeature(feature);
                        }}
                        onMouseEnter={(event) => updateHoverPreview(feature, event.clientX, event.clientY)}
                        onMouseMove={(event) => updateHoverPreview(feature, event.clientX, event.clientY)}
                        onMouseLeave={() => setHoverPreview((current) => (
                          current?.feature.block === feature.block ? null : current
                        ))}
                      >
                        <title>
                          {`Bloque ${feature.block} | Area actual: ${preview.area} | Tallos ultimo ciclo: ${preview.stems}`}
                        </title>
                      </path>
                    );
                  })}

                  {areaLabels.map((label) => (
                    <g key={label.name} className="pointer-events-none" transform={`translate(${label.x} ${label.y})`}>
                      <rect
                        x={-74}
                        y={-24}
                        width={148}
                        height={44}
                        rx={16}
                        fill="rgba(255,255,255,0.9)"
                        stroke="rgba(15,23,42,0.18)"
                        strokeWidth={1.2}
                      />
                      <text
                        x="0"
                        y="-3"
                        fill="rgba(15,23,42,0.92)"
                        fontSize="12"
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {label.name}
                      </text>
                      <text
                        x="0"
                        y="13"
                        fill="rgba(71,85,105,0.92)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {`${label.blockCount} bloques · ${formatNumber(label.totalStems)} tallos`}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>

              {hoverPreview ? (
                <div
                  className="pointer-events-none absolute z-10 w-72 rounded-3xl border border-slate-900/12 bg-white/96 px-5 py-4 shadow-2xl shadow-slate-950/14 backdrop-blur-sm"
                  style={{
                    left: hoverPreview.x,
                    top: hoverPreview.y,
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Preliminar del bloque
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    Bloque {hoverPreview.feature.block}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Area actual: {buildPreviewLines(hoverPreview.feature).area}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tallos ultimo ciclo: {buildPreviewLines(hoverPreview.feature).stems}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Area mapa: {formatNumber(hoverPreview.feature.mapArea ?? 0)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <MapPinned className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Navegacion</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Hover para preliminar. Click para abrir historial. Drag y zoom para explorar.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Verde intenso: bloque con mayor carga visible del ultimo ciclo.</p>
                <p>Verde claro: bloque con datos, pero menor carga relativa.</p>
                <p>Gris: bloque del shape sin match operativo actual.</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <Move className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Areas identificadas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Etiquetas agregadas segun el area actual del ultimo ciclo por bloque.
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
                    <Sprout className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Seleccion actual</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Resumen del bloque activo en el mapa.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {formatNumber(initialData.summary.totalMappedArea)} area total de mapa
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {initialData.summary.unmatchedBlocks} bloques sin match
                </Badge>
                {selectedFeature ? (
                  <div className="rounded-3xl border border-border/70 bg-card/90 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Seleccion actual</p>
                    <p className="mt-2 text-lg font-semibold">Bloque {selectedFeature.block}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Area actual: {selectedPreview?.area}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tallos ultimo ciclo: {selectedPreview?.stems}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Area mapa: {formatNumber(selectedFeature.mapArea ?? 0)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay bloque seleccionado.
                  </p>
                )}
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
        onOpenBeds={blockModal.openBeds}
        onCloseBeds={blockModal.closeBeds}
        onOpenValves={blockModal.openValves}
        onCloseValves={blockModal.closeValves}
        onOpenValve={blockModal.openValve}
        onOpenCurve={blockModal.openCurve}
        onCloseCurve={blockModal.closeCurve}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
}
