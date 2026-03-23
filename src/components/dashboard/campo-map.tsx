"use client";

import "leaflet/dist/leaflet.css";

import type { FeatureCollection, GeoJsonObject } from "geojson";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  ImageOverlay,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type BlockDataEntry = {
  stemsIntensity: number;
  hasData: boolean;
};

type ClickState = {
  latlng: L.LatLng;
  bloquePad: string;
};

type RasterBounds = {
  ndvi?: [[number, number], [number, number]];
  ndre?: [[number, number], [number, number]];
  lci?:  [[number, number], [number, number]];
};

type Props = {
  blockDataMap: Record<string, BlockDataEntry>;
  onFicha: (bloquePad: string) => void;
  onValves: (bloquePad: string) => void;
  activeLayer: ActiveLayer;
  className?: string;
};

export type ActiveLayer = "none" | "ndvi" | "ndre" | "lci";

// ── Raster config ─────────────────────────────────────────────────────────────

const RASTER_LABELS: Record<Exclude<ActiveLayer, "none">, string> = {
  ndvi: "NDVI — Índice de vegetación",
  ndre: "NDRE — Red Edge",
  lci:  "LCI — Clorofila",
};

// ── Color helpers ─────────────────────────────────────────────────────────────

function stemsToColor(stemsIntensity: number, hasData: boolean): string {
  if (!hasData) return "#c8d6dc";
  const lightness = Math.round(84 - stemsIntensity * 34);
  return `hsl(150,44%,${lightness}%)`;
}

function getZoomStyle(zoom: number) {
  // At low zoom levels hide bed borders — they create a striped look
  if (zoom <= 15) return { weight: 0, fillOpacity: 0.9 };
  if (zoom <= 16) return { weight: 0.4, fillOpacity: 0.88 };
  return { weight: 1, fillOpacity: 0.86 };
}

// ── Sub: zoom-reactive layer ──────────────────────────────────────────────────

function ZoomStyleUpdater({
  geoJsonRef,
  blockDataMap,
}: {
  geoJsonRef: React.RefObject<L.GeoJSON | null>;
  blockDataMap: Record<string, BlockDataEntry>;
}) {
  const map = useMapEvents({
    zoomend() {
      if (!geoJsonRef.current) return;
      const zoom = map.getZoom();
      const zs = getZoomStyle(zoom);
      geoJsonRef.current.eachLayer((layer) => {
        const gl = layer as L.Path & { feature?: GeoJSON.Feature };
        const bloquePad = gl.feature?.properties?.bloquePad as string | undefined;
        const entry = bloquePad ? blockDataMap[bloquePad] : undefined;
        gl.setStyle({
          fillColor: stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false),
          color: zoom > 16 ? "rgba(15,23,42,0.3)" : "transparent",
          ...zs,
        });
      });
    },
  });
  return null;
}

// ── Sub: fit bounds on first load ─────────────────────────────────────────────

function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !data.features.length) return;
    try {
      const layer = L.geoJSON(data as GeoJsonObject);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
        fitted.current = true;
      }
    } catch { /* empty */ }
  }, [data, map]);

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CampoLeafletMap({
  blockDataMap,
  onFicha,
  onValves,
  activeLayer,
  className,
}: Props) {
  const [geoData,       setGeoData]       = useState<FeatureCollection | null>(null);
  const [rasterBounds,  setRasterBounds]  = useState<RasterBounds>({});
  const [loading,       setLoading]       = useState(true);
  const [clickState,    setClickState]    = useState<ClickState | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  // Fetch GeoJSON + raster bounds once
  useEffect(() => {
    Promise.all([
      fetch("/data/campo-geo.json").then((r) => r.json()),
      fetch("/rasters/bounds.json").then((r) => r.json()).catch(() => ({})),
    ]).then(([geo, bounds]) => {
      setGeoData(geo as FeatureCollection);
      setRasterBounds(bounds as RasterBounds);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Re-style when blockDataMap changes
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer((layer) => {
      const gl = layer as L.Path & { feature?: GeoJSON.Feature };
      const bloquePad = gl.feature?.properties?.bloquePad as string | undefined;
      if (!bloquePad) return;
      const entry = blockDataMap[bloquePad];
      gl.setStyle({
        fillColor: stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false),
        fillOpacity: 0.88,
      });
    });
  }, [blockDataMap]);

  const styleFeature = useCallback(
    (feature: GeoJSON.Feature | undefined) => {
      const bloquePad = feature?.properties?.bloquePad as string | undefined;
      const entry = bloquePad ? blockDataMap[bloquePad] : undefined;
      return {
        fillColor:   stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false),
        color:       "rgba(15,23,42,0.20)",
        weight:      0.4,
        fillOpacity: 0.9,
      };
    },
    [blockDataMap],
  );

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      layer.on({
        click(e: L.LeafletMouseEvent) {
          const bloquePad = feature.properties?.bloquePad as string | undefined;
          if (!bloquePad) return;
          L.DomEvent.stopPropagation(e);
          setClickState({ latlng: e.latlng, bloquePad });
        },
        mouseover(e: L.LeafletMouseEvent) {
          (e.target as L.Path).setStyle({
            weight:      2,
            color:       "hsl(153,56%,28%)",
            fillOpacity: 1,
          });
        },
        mouseout(e: L.LeafletMouseEvent) {
          const bloquePad = feature.properties?.bloquePad as string | undefined;
          const entry = bloquePad ? blockDataMap[bloquePad] : undefined;
          (e.target as L.Path).setStyle({
            weight:      0.4,
            color:       "rgba(15,23,42,0.20)",
            fillColor:   stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false),
            fillOpacity: 0.9,
          });
        },
      });
    },
    [blockDataMap],
  );

  const geoJsonKey = useMemo(
    () => Object.keys(blockDataMap).sort().join(","),
    [blockDataMap],
  );

  // Raster bounds for ImageOverlay
  const rasterImageBounds = activeLayer !== "none"
    ? (rasterBounds[activeLayer] as [[number, number], [number, number]] | undefined)
    : undefined;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center rounded-[26px] bg-muted/40", className)}>
        <p className="animate-pulse text-sm text-muted-foreground">Cargando geometría…</p>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className={cn("flex items-center justify-center rounded-[26px] bg-muted/40", className)}>
        <p className="text-sm text-muted-foreground">No se pudo cargar el mapa.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[26px]", className)}>
      <MapContainer
        zoom={15}
        center={[-2.8589, -78.796]}
        zoomControl
        className="h-full w-full"
        style={{ background: "#f0f4f0" }}
      >
        {/* CartoDB Positron base — free, no key required */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Drone raster overlay (PNG served from /rasters/) */}
        {activeLayer !== "none" && rasterImageBounds && (
          <ImageOverlay
            url={`/rasters/${activeLayer}.png`}
            bounds={rasterImageBounds}
            opacity={0.72}
            zIndex={400}
          />
        )}

        {/* Zoom-adaptive border style */}
        <ZoomStyleUpdater geoJsonRef={geoJsonRef} blockDataMap={blockDataMap} />

        {/* Bed polygons */}
        <GeoJSON
          key={geoJsonKey}
          data={geoData as GeoJsonObject}
          style={styleFeature}
          onEachFeature={onEachFeature}
          ref={geoJsonRef}
        />

        {/* Block click popup */}
        {clickState && (
          <Popup
            position={clickState.latlng}
            eventHandlers={{ remove: () => setClickState(null) }}
          >
            <div className="flex min-w-[170px] flex-col gap-2 p-1">
              <p className="text-sm font-semibold text-slate-900">
                Bloque {clickState.bloquePad}
              </p>
              <button
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-gray-50"
                onClick={() => {
                  onFicha(clickState.bloquePad);
                  setClickState(null);
                }}
              >
                📋 Ver ficha completa
              </button>
              <button
                className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-left text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                onClick={() => {
                  onValves(clickState.bloquePad);
                  setClickState(null);
                }}
              >
                🗺 Mapa de válvulas
              </button>
            </div>
          </Popup>
        )}

        <FitBounds data={geoData} />
      </MapContainer>

      {/* Active layer badge overlay */}
      {activeLayer !== "none" && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-[800] rounded-2xl border border-border/70 bg-background/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm">
          {RASTER_LABELS[activeLayer]}
        </div>
      )}
    </div>
  );
}

// ── Layer switcher ────────────────────────────────────────────────────────────

export function CampoLayerSwitcher({
  active,
  onChange,
}: {
  active: ActiveLayer;
  onChange: (layer: ActiveLayer) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Capa:</span>
      {(["none", "ndvi", "ndre", "lci"] as const).map((layer) => (
        <button
          key={layer}
          onClick={() => onChange(layer)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            active === layer
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-background/72 text-muted-foreground hover:text-foreground",
          )}
        >
          {layer === "none" ? "Sin capa" : layer.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
