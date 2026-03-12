"use client";

import { MapPinned, Sprout } from "lucide-react";
import { useState } from "react";

import { BlockProfileModal } from "@/components/dashboard/fenograma-block-modal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import type { CampoDashboardData, CampoMapFeature } from "@/lib/campo";

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
}

function getFeatureFill(feature: CampoMapFeature, selectedBlock: string | null) {
  if (selectedBlock === feature.block) {
    return "hsl(146 58% 42%)";
  }

  if (!feature.hasData) {
    return "hsl(210 16% 86%)";
  }

  const lightness = 82 - (feature.stemsIntensity * 32);
  return `hsl(148 48% ${lightness}%)`;
}

export function CampoExplorer({ initialData }: { initialData: CampoDashboardData }) {
  const [selectedFeature, setSelectedFeature] = useState<CampoMapFeature | null>(null);
  const blockModal = useBlockProfileModal(selectedFeature?.row ?? null);

  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/82">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Historial espacial por `parent_block`
              </Badge>
              <CardTitle className="text-2xl">Mapa de bloques</CardTitle>
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
        <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-[28px] border border-border/70 bg-background/72 p-3">
            <div className="overflow-hidden rounded-[22px] border border-border/70 bg-card/94">
              <svg
                viewBox={`0 0 ${initialData.map.width} ${initialData.map.height}`}
                className="h-auto w-full bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.12),_transparent_48%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.96))]"
              >
                {initialData.features.map((feature) => (
                  <path
                    key={feature.block}
                    d={feature.path}
                    fill={getFeatureFill(feature, selectedFeature?.block ?? null)}
                    stroke={selectedFeature?.block === feature.block ? "hsl(146 58% 26%)" : "rgba(15,23,42,0.28)"}
                    strokeWidth={selectedFeature?.block === feature.block ? 3 : 1.35}
                    className="cursor-pointer transition-all duration-150"
                    onClick={() => setSelectedFeature(feature)}
                  >
                    <title>
                      {`Bloque ${feature.block} | Area mapa: ${formatNumber(feature.mapArea ?? 0)} | Tallos visibles: ${formatNumber(feature.row.totalStems)}`}
                    </title>
                  </path>
                ))}
              </svg>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <MapPinned className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Como leer el mapa</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Click en un bloque para abrir el historial completo del bloque.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Verde intenso: bloque con mayor carga visible del fenograma actual.</p>
                <p>Verde claro: bloque con datos, pero menor carga relativa.</p>
                <p>Gris: bloque presente en el shape sin match operativo actual.</p>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-background/72">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/12 p-3 text-primary">
                    <Sprout className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Cobertura</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Bloques publicados desde el shape transformado.
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
                  <div className="rounded-2xl border border-border/70 bg-card/90 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Seleccion actual</p>
                    <p className="mt-2 text-lg font-semibold">Bloque {selectedFeature.block}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Area mapa: {formatNumber(selectedFeature.mapArea ?? 0)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tallos visibles: {formatNumber(selectedFeature.row.totalStems)}
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
        onOpenBeds={blockModal.openBeds}
        onOpenValves={blockModal.openValves}
        onOpenValve={blockModal.openValve}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
}
