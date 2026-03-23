"use client";

import "leaflet/dist/leaflet.css";

import type { FeatureCollection, GeoJsonObject } from "geojson";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

import { Badge } from "@/components/ui/badge";
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

type Props = {
  /** Map from bloquePad → stems intensity + hasData */
  blockDataMap: Record<string, BlockDataEntry>;
  /** Called when user clicks "Ver ficha" */
  onFicha: (bloquePad: string) => void;
  /** Called when user clicks "Mapa válvulas" */
  onValves: (bloquePad: string) => void;
  /** Active raster layer */
  activeLayer: ActiveLayer;
  className?: string;
};

export type ActiveLayer = "none" | "ndvi" | "ndre" | "lci";

// ── Raster tile configs ───────────────────────────────────────────────────────

const RASTER_LAYERS: Record<Exclude<ActiveLayer, "none">, { label: string; url: string; description: string }> = {
  ndvi: {
    label: "NDVI",
    description: "Índice de vegetación",
    url: "/tiles/ndvi/{z}/{x}/{y}.png",
  },
  ndre: {
    label: "NDRE",
    description: "Red Edge",
    url: "/tiles/ndre/{z}/{x}/{y}.png",
  },
  lci: {
    label: "LCI",
    description: "Clorofila",
    url: "/tiles/lci/{z}/{x}/{y}.png",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stemsToColor(stemsIntensity: number, hasData: boolean): string {
  if (!hasData) return "hsl(210, 18%, 84%)";                              // gray
  const lightness = Math.round(84 - stemsIntensity * 34);
  return `hsl(150, 44%, ${lightness}%)`;
}

// ── Sub-component: fit map to GeoJSON bounds on first render ─────────────────

function FitBounds({ data }: { data: FeatureCollection }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !data.features.length) return;
    try {
      const layer = L.geoJSON(data as GeoJsonObject);
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] });
        fitted.current = true;
      }
    } catch {
      // ignore invalid geometry
    }
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
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [clickState, setClickState] = useState<ClickState | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  // Fetch GeoJSON once
  useEffect(() => {
    fetch("/data/campo-geo.json")
      .then((r) => r.json())
      .then((data: FeatureCollection) => {
        setGeoData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Re-style GeoJSON when blockDataMap changes
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer((layer) => {
      const gl = layer as L.Path & { feature?: GeoJSON.Feature };
      const bloquePad = gl.feature?.properties?.bloquePad as string | undefined;
      if (!bloquePad) return;
      const entry = blockDataMap[bloquePad];
      const fill = stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false);
      gl.setStyle({ fillColor: fill, color: "rgba(15,23,42,0.28)", weight: 1, fillOpacity: 0.88 });
    });
  }, [blockDataMap]);

  const styleFeature = useCallback(
    (feature: GeoJSON.Feature | undefined) => {
      const bloquePad = feature?.properties?.bloquePad as string | undefined;
      const entry = bloquePad ? blockDataMap[bloquePad] : undefined;
      return {
        fillColor:   stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false),
        color:       "rgba(15,23,42,0.28)",
        weight:       1,
        fillOpacity:  0.88,
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
          setClickState({ latlng: e.latlng, bloquePad });
        },
        mouseover(e: L.LeafletMouseEvent) {
          const path = e.target as L.Path;
          path.setStyle({ weight: 2.4, color: "hsl(153,56%,28%)", fillOpacity: 1 });
        },
        mouseout(e: L.LeafletMouseEvent) {
          const path = e.target as L.Path;
          const bloquePad = feature.properties?.bloquePad as string | undefined;
          const entry = bloquePad ? blockDataMap[bloquePad] : undefined;
          path.setStyle({
            weight:      1,
            color:       "rgba(15,23,42,0.28)",
            fillColor:   stemsToColor(entry?.stemsIntensity ?? 0, entry?.hasData ?? false),
            fillOpacity: 0.88,
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

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/40 rounded-[26px]", className)}>
        <p className="text-sm text-muted-foreground animate-pulse">Cargando geometría…</p>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/40 rounded-[26px]", className)}>
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
        style={{ background: "hsl(210 18% 96%)" }}
      >
        {/* Optional raster overlay */}
        {activeLayer !== "none" && (
          <TileLayer
            url={RASTER_LAYERS[activeLayer].url}
            opacity={0.72}
            attribution=""
          />
        )}

        {/* Bed polygons */}
        {geoData && (
          <GeoJSON
            key={geoJsonKey}
            data={geoData as GeoJsonObject}
            style={styleFeature}
            onEachFeature={onEachFeature}
            ref={geoJsonRef}
          />
        )}

        {/* Click popup */}
        {clickState && (
          <Popup
            position={clickState.latlng}
            eventHandlers={{ remove: () => setClickState(null) }}
          >
            <div className="flex min-w-[160px] flex-col gap-2 p-1">
              <p className="text-sm font-semibold text-foreground">
                Bloque {clickState.bloquePad}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => {
                  onFicha(clickState.bloquePad);
                  setClickState(null);
                }}
              >
                Ver ficha
              </Button>
              <Button
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  onValves(clickState.bloquePad);
                  setClickState(null);
                }}
              >
                Mapa válvulas
              </Button>
            </div>
          </Popup>
        )}

        <FitBounds data={geoData} />
      </MapContainer>
    </div>
  );
}

// ── Layer switcher bar (rendered OUTSIDE the map) ─────────────────────────────

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
          {layer === "none" ? "Sin capa" : RASTER_LAYERS[layer].label}
        </button>
      ))}
    </div>
  );
}
