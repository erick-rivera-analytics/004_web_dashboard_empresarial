"use client";

import "leaflet/dist/leaflet.css";

import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BlockDataEntry = { stemsIntensity: number; hasData: boolean };
export type ActiveLayer    = "none" | "ndvi" | "ndre" | "lci";

type ClickState  = { latlng: L.LatLng; bloquePad: string };
type RasterBounds = Record<string, [[number, number], [number, number]]>;
type BlockCentroid = { bloquePad: string; area: string; lat: number; lng: number };

type Props = {
  blockDataMap: Record<string, BlockDataEntry>;
  /** Area name per block (e.g. { "317": "MH1", "23": "CV" }) */
  areaByBlock:  Record<string, string>;
  onFicha:      (bloquePad: string) => void;
  onValves:     (bloquePad: string) => void;
  activeLayer:  ActiveLayer;
  className?:   string;
};

// ── Raster labels ─────────────────────────────────────────────────────────────

const RASTER_LABELS: Record<Exclude<ActiveLayer, "none">, string> = {
  ndvi: "NDVI — Vegetación",
  ndre: "NDRE — Red Edge",
  lci:  "LCI — Clorofila",
};

// ── Color helpers ─────────────────────────────────────────────────────────────

function stemsToColor(i: number, hasData: boolean) {
  if (!hasData) return "#c8d6dc";
  const l = Math.round(84 - i * 34);
  return `hsl(150,44%,${l}%)`;
}

function getZoomStyle(zoom: number) {
  if (zoom <= 15) return { weight: 0,   fillOpacity: 0.92 };
  if (zoom <= 16) return { weight: 0.3, fillOpacity: 0.88 };
  return                  { weight: 0.8, fillOpacity: 0.84 };
}

// ── Centroid computation ──────────────────────────────────────────────────────

function polygonCentroid(coords: number[][]): [number, number] {
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  return [lat, lng];
}

function computeBlockCentroids(
  features: Feature[],
  areaByBlock: Record<string, string>,
): BlockCentroid[] {
  const acc = new Map<string, { sumLat: number; sumLng: number; cnt: number }>();

  for (const f of features) {
    const bp = f.properties?.bloquePad as string | undefined;
    if (!bp || !f.geometry) continue;

    let ring: number[][] = [];
    if (f.geometry.type === "Polygon") {
      ring = f.geometry.coordinates[0] as number[][];
    } else if (f.geometry.type === "MultiPolygon") {
      ring = f.geometry.coordinates[0][0] as number[][];
    }
    if (!ring.length) continue;

    const [cLat, cLng] = polygonCentroid(ring);
    const existing = acc.get(bp) ?? { sumLat: 0, sumLng: 0, cnt: 0 };
    existing.sumLat += cLat;
    existing.sumLng += cLng;
    existing.cnt    += 1;
    acc.set(bp, existing);
  }

  return Array.from(acc.entries()).map(([bloquePad, { sumLat, sumLng, cnt }]) => ({
    bloquePad,
    area: areaByBlock[bloquePad] ?? "",
    lat:  sumLat / cnt,
    lng:  sumLng / cnt,
  }));
}

// ── Block label DivIcons ──────────────────────────────────────────────────────

function makeBlockIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background: rgba(255,255,255,0.94);
      color: rgba(15,23,42,0.88);
      padding: 2px 7px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 1px 5px rgba(0,0,0,0.18);
      border: 1px solid rgba(15,23,42,0.10);
      font-family: ui-monospace, monospace;
      letter-spacing: 0.02em;
    ">${label}</div>`,
    iconSize:   undefined as unknown as L.PointExpression,
    iconAnchor: [0, 0],
  });
}

function makeAreaIcon(label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background: rgba(15,23,42,0.82);
      color: white;
      padding: 5px 13px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 800;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.28);
      border: 1.5px solid rgba(255,255,255,0.18);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    ">${label}</div>`,
    iconSize:   undefined as unknown as L.PointExpression,
    iconAnchor: [0, 0],
  });
}

// ── Sub: floating labels layer ────────────────────────────────────────────────

function BlockLabels({ centroids }: { centroids: BlockCentroid[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    zoomend() { setZoom(map.getZoom()); },
  });

  // Area centroids: average of all blocks in the same area
  const areaCentroids = useMemo(() => {
    const areaAcc = new Map<string, { sumLat: number; sumLng: number; cnt: number }>();
    for (const { area, lat, lng } of centroids) {
      if (!area) continue;
      const e = areaAcc.get(area) ?? { sumLat: 0, sumLng: 0, cnt: 0 };
      e.sumLat += lat; e.sumLng += lng; e.cnt += 1;
      areaAcc.set(area, e);
    }
    return Array.from(areaAcc.entries()).map(([area, { sumLat, sumLng, cnt }]) => ({
      area, lat: sumLat / cnt, lng: sumLng / cnt,
    }));
  }, [centroids]);

  return (
    <>
      {/* Area labels — visible at all zooms when zoom < 16 */}
      {zoom < 17 && areaCentroids.map(({ area, lat, lng }) => (
        <Marker
          key={`area-${area}`}
          position={[lat, lng]}
          icon={makeAreaIcon(area)}
          interactive={false}
          zIndexOffset={1200}
        />
      ))}

      {/* Block labels — only at zoom ≥ 16 */}
      {zoom >= 16 && centroids.map(({ bloquePad, lat, lng }) => (
        <Marker
          key={`block-${bloquePad}`}
          position={[lat, lng]}
          icon={makeBlockIcon(bloquePad)}
          interactive={false}
          zIndexOffset={1000}
        />
      ))}
    </>
  );
}

// ── Sub: zoom-reactive border updates ────────────────────────────────────────

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
      const zs   = getZoomStyle(zoom);
      geoJsonRef.current.eachLayer((layer) => {
        const gl = layer as L.Path & { feature?: Feature };
        const bp = gl.feature?.properties?.bloquePad as string | undefined;
        const e  = bp ? blockDataMap[bp] : undefined;
        gl.setStyle({
          fillColor: stemsToColor(e?.stemsIntensity ?? 0, e?.hasData ?? false),
          color:     zoom > 16 ? "rgba(15,23,42,0.28)" : "transparent",
          ...zs,
        });
      });
    },
  });
  return null;
}

// ── Sub: fit bounds on first load ─────────────────────────────────────────────

function FitBounds({ data }: { data: FeatureCollection }) {
  const map    = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !data.features.length) return;
    try {
      const bounds = L.geoJSON(data as GeoJsonObject).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        fitted.current = true;
      }
    } catch { /* empty */ }
  }, [data, map]);

  return null;
}

// ── Main map component ────────────────────────────────────────────────────────

export function CampoLeafletMap({
  blockDataMap,
  areaByBlock,
  onFicha,
  onValves,
  activeLayer,
  className,
}: Props) {
  const [geoData,      setGeoData]      = useState<FeatureCollection | null>(null);
  const [rasterBounds, setRasterBounds] = useState<RasterBounds>({});
  const [loading,      setLoading]      = useState(true);
  const [clickState,   setClickState]   = useState<ClickState | null>(null);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  // Load GeoJSON + raster bounds
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

  // Re-style on blockDataMap change
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer((layer) => {
      const gl = layer as L.Path & { feature?: Feature };
      const bp = gl.feature?.properties?.bloquePad as string | undefined;
      if (!bp) return;
      const e = blockDataMap[bp];
      gl.setStyle({ fillColor: stemsToColor(e?.stemsIntensity ?? 0, e?.hasData ?? false) });
    });
  }, [blockDataMap]);

  const styleFeature = useCallback(
    (feature: Feature | undefined) => {
      const bp = feature?.properties?.bloquePad as string | undefined;
      const e  = bp ? blockDataMap[bp] : undefined;
      return {
        fillColor:   stemsToColor(e?.stemsIntensity ?? 0, e?.hasData ?? false),
        color:       "rgba(15,23,42,0.18)",
        weight:      0.3,
        fillOpacity: 0.9,
      };
    },
    [blockDataMap],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      layer.on({
        click(e: L.LeafletMouseEvent) {
          const bp = feature.properties?.bloquePad as string | undefined;
          if (!bp) return;
          L.DomEvent.stopPropagation(e);
          setClickState({ latlng: e.latlng, bloquePad: bp });
        },
        mouseover(e: L.LeafletMouseEvent) {
          (e.target as L.Path).setStyle({ weight: 2, color: "hsl(153,56%,28%)", fillOpacity: 1 });
        },
        mouseout(e: L.LeafletMouseEvent) {
          const bp = feature.properties?.bloquePad as string | undefined;
          const e2 = bp ? blockDataMap[bp] : undefined;
          (e.target as L.Path).setStyle({
            weight: 0.3, color: "rgba(15,23,42,0.18)",
            fillColor: stemsToColor(e2?.stemsIntensity ?? 0, e2?.hasData ?? false),
            fillOpacity: 0.9,
          });
        },
      });
    },
    [blockDataMap],
  );

  // Compute block centroids for labels (memoized)
  const blockCentroids = useMemo(
    () => geoData ? computeBlockCentroids(geoData.features, areaByBlock) : [],
    [geoData, areaByBlock],
  );

  const geoJsonKey = useMemo(
    () => Object.keys(blockDataMap).sort().join(","),
    [blockDataMap],
  );

  const rasterImageBounds = activeLayer !== "none"
    ? (rasterBounds[activeLayer] as [[number, number], [number, number]] | undefined)
    : undefined;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center rounded-[26px] bg-muted/40", className)}>
        <p className="animate-pulse text-sm text-muted-foreground">Cargando mapa…</p>
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
        style={{ background: "#eef2ee" }}
      >
        {/* CartoDB Positron — free, no API key */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={22}
        />

        {/* Drone raster PNG overlay */}
        {activeLayer !== "none" && rasterImageBounds && (
          <ImageOverlay
            url={`/rasters/${activeLayer}.png`}
            bounds={rasterImageBounds}
            opacity={0.75}
            zIndex={400}
          />
        )}

        {/* Zoom-adaptive border updates */}
        <ZoomStyleUpdater geoJsonRef={geoJsonRef} blockDataMap={blockDataMap} />

        {/* Bed polygons */}
        <GeoJSON
          key={geoJsonKey}
          data={geoData as GeoJsonObject}
          style={styleFeature}
          onEachFeature={onEachFeature}
          ref={geoJsonRef}
        />

        {/* Floating block / area labels */}
        <BlockLabels centroids={blockCentroids} />

        {/* Click popup */}
        {clickState && (
          <Popup
            position={clickState.latlng}
            eventHandlers={{ remove: () => setClickState(null) }}
          >
            <div style={{ minWidth: 172, padding: "4px 2px", fontFamily: "inherit" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                Bloque {clickState.bloquePad}
              </p>
              <button
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 8, marginBottom: 5,
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#334155",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onClick={() => { onFicha(clickState.bloquePad); setClickState(null); }}
              >
                📋 &nbsp;Ver ficha completa
              </button>
              <button
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "7px 10px", borderRadius: 8,
                  border: "none", background: "#059669",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", color: "white",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#047857")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#059669")}
                onClick={() => { onValves(clickState.bloquePad); setClickState(null); }}
              >
                🗺 &nbsp;Mapa de válvulas
              </button>
            </div>
          </Popup>
        )}

        <FitBounds data={geoData} />
      </MapContainer>

      {/* Raster active badge */}
      {activeLayer !== "none" && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-[800] rounded-2xl border border-border/70 bg-background/92 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
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
