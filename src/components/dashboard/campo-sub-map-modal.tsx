"use client";

import "leaflet/dist/leaflet.css";

import type { Feature, FeatureCollection, GeoJsonObject } from "geojson";
import L from "leaflet";
import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { CampoCycleSelectorModal } from "@/components/dashboard/campo-cycle-selector";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubMapMode = "valves" | "beds";

type ValveClickState = {
  latlng:    L.LatLng;
  valveId:   string;
  valvula:   string;
  bloquePad: string;
};

type BedClickState = {
  latlng:    L.LatLng;
  bedId:     string;
  cama:      number;
  valvula:   string;
  bloquePad: string;
};

type Props = {
  bloquePad:      string;
  mode:           SubMapMode;
  valveId?:       string;
  onValveDetail:  (valveId: string, bloquePad: string) => void;
  onBedMap:       (valveId: string, bloquePad: string) => void;
  /** Called when user picks a cycle for a bed: opens BlockProfileModal at beds level */
  onBedDetail:    (bedId: string, bloquePad: string, cycleKey: string) => void;
  onClose:        () => void;
};

// ── Palette ───────────────────────────────────────────────────────────────────

const VALVE_COLORS = [
  "#3b82f6","#f59e0b","#10b981","#8b5cf6",
  "#ef4444","#06b6d4","#84cc16","#ec4899",
  "#14b8a6","#f97316",
];

const BED_COLORS = [
  "#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444","#06b6d4",
  "#84cc16","#ec4899","#14b8a6","#f97316","#6366f1","#22c55e",
  "#e11d48","#eab308","#0ea5e9","#d946ef","#4ade80","#fb923c",
  "#a78bfa","#34d399","#f87171","#38bdf8","#facc15","#c084fc",
  "#86efac","#fda4af","#93c5fd","#fcd34d",
];

// ── DivIcon labels for valves / beds ──────────────────────────────────────────

function makeValveIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      color:white;
      padding:2px 7px;
      border-radius:20px;
      font-size:10px;
      font-weight:800;
      pointer-events:none;
      white-space:nowrap;
      box-shadow:0 1px 5px rgba(0,0,0,0.25);
      border:1.5px solid rgba(255,255,255,0.4);
      letter-spacing:0.04em;
    ">V-${label}</div>`,
    iconSize:   undefined as unknown as L.PointExpression,
    iconAnchor: [0, 0],
  });
}

function makeBedIcon(cama: number) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:rgba(15,23,42,0.78);
      color:white;
      padding:1px 5px;
      border-radius:10px;
      font-size:9px;
      font-weight:700;
      pointer-events:none;
      white-space:nowrap;
      box-shadow:0 1px 3px rgba(0,0,0,0.22);
    ">${cama}</div>`,
    iconSize:   undefined as unknown as L.PointExpression,
    iconAnchor: [0, 0],
  });
}

// ── Centroid helpers ──────────────────────────────────────────────────────────

function featureCentroid(f: Feature): [number, number] | null {
  try {
    if (f.geometry.type === "Polygon") {
      const ring = f.geometry.coordinates[0] as number[][];
      const lat  = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const lng  = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      return [lat, lng];
    }
    if (f.geometry.type === "MultiPolygon") {
      const ring = f.geometry.coordinates[0][0] as number[][];
      const lat  = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const lng  = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      return [lat, lng];
    }
  } catch { /* empty */ }
  return null;
}

function groupCentroids<K extends string>(
  features: Feature[],
  keyFn: (f: Feature) => K | undefined,
): Map<K, [number, number]> {
  const acc = new Map<K, { sumLat: number; sumLng: number; cnt: number }>();
  for (const f of features) {
    const k = keyFn(f);
    if (!k) continue;
    const c = featureCentroid(f);
    if (!c) continue;
    const e = acc.get(k) ?? { sumLat: 0, sumLng: 0, cnt: 0 };
    e.sumLat += c[0]; e.sumLng += c[1]; e.cnt += 1;
    acc.set(k, e);
  }
  const result = new Map<K, [number, number]>();
  for (const [k, { sumLat, sumLng, cnt }] of acc) {
    result.set(k, [sumLat / cnt, sumLng / cnt]);
  }
  return result;
}

// ── Fit bounds ────────────────────────────────────────────────────────────────

function FitBounds({ data }: { data: FeatureCollection }) {
  const map    = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !data.features.length) return;
    try {
      const bounds = L.geoJSON(data as GeoJsonObject).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 20 });
        fitted.current = true;
      }
    } catch { /* empty */ }
  }, [data, map]);

  return null;
}

// ── Valve-level map ───────────────────────────────────────────────────────────

function ValveMap({
  features,
  onValveDetail,
  onBedMap,
}: {
  features:      Feature[];
  onValveDetail: (valveId: string, bloquePad: string) => void;
  onBedMap:      (valveId: string, bloquePad: string) => void;
}) {
  const [click, setClick] = useState<ValveClickState | null>(null);

  const valveColorMap = useMemo(() => {
    const ids = [...new Set(features.map((f) => f.properties?.valveId as string))].sort();
    return new Map(ids.map((id, i) => [id, VALVE_COLORS[i % VALVE_COLORS.length]]));
  }, [features]);

  const fc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features }),
    [features],
  );

  const valveCentroids = useMemo(
    () => groupCentroids(features, (f) => f.properties?.valveId as string),
    [features],
  );

  const styleFeature = useCallback(
    (feature: Feature | undefined) => ({
      fillColor:   valveColorMap.get(feature?.properties?.valveId ?? "") ?? "#c8d6dc",
      color:       "rgba(255,255,255,0.6)",
      weight:      1,
      fillOpacity: 0.78,
    }),
    [valveColorMap],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      layer.on({
        click(e: L.LeafletMouseEvent) {
          const p = feature.properties;
          if (!p) return;
          L.DomEvent.stopPropagation(e);
          setClick({ latlng: e.latlng, valveId: p.valveId, valvula: p.valvula, bloquePad: p.bloquePad });
        },
        mouseover(e: L.LeafletMouseEvent) { (e.target as L.Path).setStyle({ weight: 2.5, fillOpacity: 1 }); },
        mouseout(e: L.LeafletMouseEvent)  { (e.target as L.Path).setStyle({ weight: 1,   fillOpacity: 0.78 }); },
      });
    },
    [],
  );

  return (
    <>
      <GeoJSON
        key={fc.features.length}
        data={fc as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      {/* Valve labels */}
      {Array.from(valveCentroids.entries()).map(([valveId, [lat, lng]]) => {
        const letter = valveId.split("-").pop() ?? valveId;
        const color  = valveColorMap.get(valveId) ?? "#3b82f6";
        return (
          <Marker
            key={`vl-${valveId}`}
            position={[lat, lng]}
            icon={makeValveIcon(letter, color)}
            interactive={false}
            zIndexOffset={800}
          />
        );
      })}

      {/* Click popup */}
      {click && (
        <Popup position={click.latlng} eventHandlers={{ remove: () => setClick(null) }}>
          <div style={{ minWidth: 168, padding: "4px 2px", fontFamily: "inherit" }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              Válvula {click.valvula}
            </p>
            <p style={{ margin: "0 0 9px", fontSize: 11, color: "#64748b" }}>
              {click.valveId}
            </p>
            <button
              style={{ display:"block", width:"100%", textAlign:"left",
                padding:"7px 10px", borderRadius:8, marginBottom:5,
                border:"1px solid #e2e8f0", background:"#f8fafc",
                fontSize:12, fontWeight:500, cursor:"pointer", color:"#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background="#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background="#f8fafc")}
              onClick={() => { onValveDetail(click.valveId, click.bloquePad); setClick(null); }}
            >
              📋 &nbsp;Ver detalle válvula
            </button>
            <button
              style={{ display:"block", width:"100%", textAlign:"left",
                padding:"7px 10px", borderRadius:8,
                border:"none", background:"#059669",
                fontSize:12, fontWeight:600, cursor:"pointer", color:"white" }}
              onMouseEnter={(e) => (e.currentTarget.style.background="#047857")}
              onMouseLeave={(e) => (e.currentTarget.style.background="#059669")}
              onClick={() => { onBedMap(click.valveId, click.bloquePad); setClick(null); }}
            >
              🗺 &nbsp;Mapa de camas
            </button>
          </div>
        </Popup>
      )}

      <FitBounds data={fc} />
    </>
  );
}

// ── Bed-level map ─────────────────────────────────────────────────────────────

function BedMap({
  features,
  onBedCycleSelect,
}: {
  features:         Feature[];
  onBedCycleSelect: (bedId: string, bloquePad: string) => void;
}) {
  const [click, setClick] = useState<BedClickState | null>(null);

  const fc = useMemo<FeatureCollection>(
    () => ({ type: "FeatureCollection", features }),
    [features],
  );

  const bedCentroids = useMemo(
    () => groupCentroids(features, (f) => String(f.properties?.cama ?? "")),
    [features],
  );

  const styleFeature = useCallback(
    (feature: Feature | undefined) => {
      const cama = (feature?.properties?.cama as number) ?? 0;
      return {
        fillColor:   BED_COLORS[(cama - 1) % BED_COLORS.length] ?? "#c8d6dc",
        color:       "rgba(255,255,255,0.5)",
        weight:      1,
        fillOpacity: 0.78,
      };
    },
    [],
  );

  const onEachFeature = useCallback(
    (feature: Feature, layer: L.Layer) => {
      layer.on({
        click(e: L.LeafletMouseEvent) {
          const p = feature.properties;
          if (!p) return;
          L.DomEvent.stopPropagation(e);
          setClick({ latlng: e.latlng, bedId: p.bedId, cama: p.cama, valvula: p.valvula, bloquePad: p.bloquePad });
        },
        mouseover(e: L.LeafletMouseEvent) { (e.target as L.Path).setStyle({ weight: 2.5, fillOpacity: 1 }); },
        mouseout(e: L.LeafletMouseEvent)  { (e.target as L.Path).setStyle({ weight: 1,   fillOpacity: 0.78 }); },
      });
    },
    [],
  );

  return (
    <>
      <GeoJSON
        key={fc.features.length}
        data={fc as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      {/* Cama number labels */}
      {Array.from(bedCentroids.entries()).map(([cama, [lat, lng]]) => (
        <Marker
          key={`bl-${cama}`}
          position={[lat, lng]}
          icon={makeBedIcon(Number(cama))}
          interactive={false}
          zIndexOffset={800}
        />
      ))}

      {/* Click popup */}
      {click && (
        <Popup position={click.latlng} eventHandlers={{ remove: () => setClick(null) }}>
          <div style={{ minWidth: 155, padding: "4px 2px", fontFamily: "inherit" }}>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              Cama {click.cama}
            </p>
            <p style={{ margin: "0 0 9px", fontSize: 11, color: "#64748b" }}>
              Válvula {click.valvula} · Bloque {click.bloquePad}
            </p>
            <button
              style={{ display:"block", width:"100%", textAlign:"left",
                padding:"7px 10px", borderRadius:8,
                border:"none", background:"#059669",
                fontSize:12, fontWeight:600, cursor:"pointer", color:"white" }}
              onMouseEnter={(e) => (e.currentTarget.style.background="#047857")}
              onMouseLeave={(e) => (e.currentTarget.style.background="#059669")}
              onClick={() => { onBedCycleSelect(click.bedId, click.bloquePad); setClick(null); }}
            >
              📋 &nbsp;Ver info de cama
            </button>
          </div>
        </Popup>
      )}

      <FitBounds data={fc} />
    </>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function ValveLegend({ valveIds, colorMap }: { valveIds: string[]; colorMap: Map<string, string> }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[800] flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-background/92 px-3 py-2 shadow-sm backdrop-blur-sm">
      {[...valveIds].sort().map((vid) => (
        <div key={vid} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: colorMap.get(vid) ?? "#ccc" }} />
          <span className="text-xs font-medium">{vid.split("-").pop()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function CampoSubMapModal({
  bloquePad,
  mode,
  valveId,
  onValveDetail,
  onBedMap,
  onBedDetail,
  onClose,
}: Props) {
  const [allFeatures, setAllFeatures] = useState<Feature[]>([]);
  const [loading,     setLoading]     = useState(true);
  // Bed cycle selector state
  const [bedPending,  setBedPending]  = useState<{ bedId: string; bloquePad: string } | null>(null);

  useEffect(() => {
    fetch("/data/campo-geo.json")
      .then((r) => r.json())
      .then((data: FeatureCollection) => { setAllFeatures(data.features); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const features = useMemo(() => {
    const byBlock = allFeatures.filter((f) => (f.properties?.bloquePad as string) === bloquePad);
    if (mode === "beds" && valveId) return byBlock.filter((f) => (f.properties?.valveId as string) === valveId);
    return byBlock;
  }, [allFeatures, bloquePad, mode, valveId]);

  const valveIds = useMemo(
    () => [...new Set(features.map((f) => f.properties?.valveId as string))],
    [features],
  );

  const valveColorMap = useMemo(() => {
    const sorted = [...valveIds].sort();
    return new Map(sorted.map((id, i) => [id, VALVE_COLORS[i % VALVE_COLORS.length]]));
  }, [valveIds]);

  const title =
    mode === "valves"
      ? `Válvulas — Bloque ${bloquePad}`
      : `Camas — Válvula ${valveId?.split("-").pop() ?? ""} · Bloque ${bloquePad}`;

  return (
    <>
      <div
        className="fixed inset-0 z-[900] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-map-title"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/48 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Panel */}
        <div className="relative z-10 flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {mode === "valves" ? "Mapa de válvulas" : "Mapa de camas"}
              </p>
              <h2 id="sub-map-title" className="mt-0.5 text-lg font-semibold">{title}</h2>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose} aria-label="Cerrar">
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Map */}
          <div className="relative flex-1 overflow-hidden">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <p className="animate-pulse text-sm text-muted-foreground">Cargando geometría…</p>
              </div>
            ) : (
              <>
                <MapContainer
                  zoom={18}
                  center={[-2.859, -78.796]}
                  zoomControl
                  className="h-full w-full"
                  style={{ background: "#eef2ee" }}
                >
                  {/* Base tiles */}
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; OSM &copy; CARTO'
                    subdomains="abcd"
                    maxZoom={22}
                  />

                  {mode === "valves" ? (
                    <ValveMap
                      features={features}
                      onValveDetail={onValveDetail}
                      onBedMap={onBedMap}
                    />
                  ) : (
                    <BedMap
                      features={features}
                      onBedCycleSelect={(bedId, bp) => setBedPending({ bedId, bloquePad: bp })}
                    />
                  )}
                </MapContainer>

                {/* Valve legend */}
                {mode === "valves" && valveIds.length > 0 && (
                  <ValveLegend valveIds={valveIds} colorMap={valveColorMap} />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/70 px-6 py-3">
            <p className="text-xs text-muted-foreground">
              {features.length} {mode === "valves" ? "camas" : "camas"} ·{" "}
              {mode === "valves" ? `${valveIds.length} válvulas` : "1 válvula"}
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </div>

      {/* Cycle selector — shown on top of the sub-map modal (z-1100) */}
      {bedPending && (
        <CampoCycleSelectorModal
          bloquePad={bedPending.bloquePad}
          contextLabel={`Cama ${bedPending.bedId.split("-").pop()} — Bloque ${bedPending.bloquePad}`}
          onSelect={(cycleKey) => {
            onBedDetail(bedPending.bedId, bedPending.bloquePad, cycleKey);
            setBedPending(null);
          }}
          onClose={() => setBedPending(null)}
        />
      )}
    </>
  );
}
